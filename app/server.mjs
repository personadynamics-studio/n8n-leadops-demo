import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { MockCrm } from './crm.mjs';

const port = Number(process.env.PORT || 3000);
const internalPort = Number(process.env.INTERNAL_PORT || 3001);
const n8nUrl = process.env.N8N_URL || 'http://127.0.0.1:5678';
const crm = new MockCrm(process.env.CRM_FILE || new URL('../.local/crm.json', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const scenarios = JSON.parse(readFileSync(new URL('../fixtures/scenarios.json', import.meta.url), 'utf8'));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.css', ['app.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);
const safeHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
async function body(req) {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw Object.assign(new Error('Use Content-Type: application/json.'), { status: 415 });
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw Object.assign(new Error('Request exceeds the 16 KB demo limit.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('Request is not valid JSON.'), { status: 400 }); }
}

createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const url = new URL(req.url, 'http://localhost');
  const host = req.headers.host?.replace(/:\d+$/, '');
  if (!safeHosts.has(host)) return json(res, 403, { error: 'This demo accepts localhost requests only.' });
  if (req.method === 'POST' && req.headers.origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(req.headers.origin)) return json(res, 403, { error: 'Cross-origin mutation blocked.' });
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      let n8n = false;
      try { n8n = (await fetch(`${n8nUrl}/healthz/readiness`, { signal: AbortSignal.timeout(2000) })).ok; } catch { /* Report offline in the workbench. */ }
      return json(res, 200, { app: true, n8n, ai: 'simulated', crm: 'simulated', messages: 'draft_only' });
    }
    if (req.method === 'GET' && url.pathname === '/api/scenarios') return json(res, 200, scenarios);
    if (req.method === 'GET' && url.pathname === '/api/crm') return json(res, 200, { simulated: true, records: crm.list() });
    if (req.method === 'POST' && url.pathname === '/api/reset') { await body(req); return json(res, 200, { simulated: true, records: crm.reset() }); }
    if (req.method === 'POST' && url.pathname === '/api/leads') {
      const payload = await body(req);
      const response = await fetch(`${n8nUrl}/webhook/leadops-intake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!result.runId || !Array.isArray(result.trace)) throw new Error('Workflow did not return the LeadOps contract.');
      return json(res, response.status, result);
    }
    if (req.method === 'GET' && files.has(url.pathname)) {
      const [file, contentType] = files.get(url.pathname);
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
      return res.end(readFileSync(new URL(`./public/${file}`, import.meta.url)));
    }
    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    const status = error.status || 502;
    return json(res, status, { status: 'workflow_unavailable', error: error.status ? error.message : 'n8n workflow is unavailable. Start the stack, import/publish the workflow, then retry.', recovery: 'Run the startup script and check docker compose logs n8n.' });
  }
}).listen(port, '0.0.0.0', () => console.log(`LeadOps workbench: http://localhost:${port}`));

// This port is reachable only on the internal Docker network; it is never published to the host.
createServer(async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST required.' });
    const payload = await body(req);
    if (req.url === '/lookup') return json(res, 200, crm.lookup(payload.email));
    if (req.url === '/commit') return json(res, 200, crm.commit(payload));
    return json(res, 404, { error: 'Not found.' });
  } catch (error) { return json(res, error.status || 500, { outcome: 'failed', error: error.status ? error.message : 'Mock CRM storage error. No successful commit reported.' }); }
}).listen(internalPort, '0.0.0.0');
