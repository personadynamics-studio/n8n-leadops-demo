import { readFileSync, mkdirSync, copyFileSync, writeFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const target = new URL('../dist/', import.meta.url);
mkdirSync(new URL('site/', target), { recursive: true });
mkdirSync(new URL('workflow/', target), { recursive: true });
let html = readFileSync(new URL('../app/public/index.html', import.meta.url), 'utf8');
const replacements = [
  ['<html lang="en">', '<html lang="en" data-runtime="standalone">'],
  ['<title>LeadOps · n8n operations lab</title>', '<title>LeadOps · interactive automation demo</title>'],
  ['An interactive local n8n operations demo.', 'An interactive browser simulation of lead operations.'],
  ['Checking n8n…', 'Browser demo ready'],
  ['http://localhost:5678/workflow/LeadOpsDemoV1', 'https://github.com/personadynamics-studio/n8n-leadops-demo'],
  ['Open n8n <span', 'View source <span'],
  ['Real n8n orchestration. Fictional business data.', 'Interactive workflow simulation. Fictional business data.'],
  ['AI & CRM are simulated', 'Workflow, AI & CRM are simulated'],
  ['Rule-based AI responses, a local mock CRM and follow-up drafts. No model calls, API keys or messages sent.', 'Try the complete process in your browser. No n8n backend, model calls, API keys or messages sent.'],
  ['Run lead workflow <span', 'Run demo <span'],
  ['Run the enquiry through n8n', 'Run the enquiry through the demo'],
  ['n8n execution evidence appears here', 'Demo run details appear here'],
  ['Results come from the actual workflow response.', 'Explore each decision in this browser simulation.'],
  ['Fictional records stored on this computer. Reset restores the seed record; n8n execution history stays available.', 'Fictional records live only in this browser tab. Reset or reload restores the seed; other visitors have their own demo.'],
  ['Full n8n response', 'Full demo result'],
  ['n8n runs locally · AI simulated · CRM simulated · Drafts only', 'Workflow simulated · AI simulated · CRM simulated · Drafts only'],
];
for (const [before, after] of replacements) {
  assert.ok(html.includes(before), `Missing build substitution: ${before}`);
  html = html.replace(before, after);
}
assert.ok(!html.includes('http://localhost:'));
writeFileSync(new URL('index.html', target), html);
for (const file of ['app.js', 'app.css', 'favicon.svg']) copyFileSync(new URL(`../app/public/${file}`, import.meta.url), new URL(file, target));
for (const file of ['runtime.mjs', 'adapter.mjs']) copyFileSync(new URL(`../site/${file}`, import.meta.url), new URL(`site/${file}`, target));
copyFileSync(new URL('../workflow/logic.mjs', import.meta.url), new URL('workflow/logic.mjs', target));
const scenarios = JSON.parse(readFileSync(new URL('../fixtures/scenarios.json', import.meta.url), 'utf8'));
const seed = JSON.parse(readFileSync(new URL('../fixtures/crm-seed.json', import.meta.url), 'utf8'));
writeFileSync(new URL('site/data.mjs', target), `export const scenarios = ${JSON.stringify(scenarios)};\nexport const seed = ${JSON.stringify(seed)};\n`);
writeFileSync(new URL('_headers', target), `/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: public, max-age=0, must-revalidate\n`);
const allowed = new Set(['index.html', 'app.js', 'app.css', 'favicon.svg', 'site', 'workflow', '_headers']);
assert.ok(readdirSync(target).every(file => allowed.has(file)), 'Unexpected file in deployment directory.');
console.log('Built standalone browser demo in dist/: no backend, account credentials or private notes.');
