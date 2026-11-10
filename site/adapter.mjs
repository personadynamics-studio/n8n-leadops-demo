import { createDemoRuntime } from './runtime.mjs';
import { scenarios, seed } from './data.mjs';

const demo = createDemoRuntime({ scenarios, seed });
// Implements the UI's request contract in memory. This function never calls fetch.
export async function demoRequest(path, options = {}) {
  const method = options.method || 'GET';
  let value;
  if (path === '/api/scenarios' && method === 'GET') value = demo.scenarios();
  else if (path === '/api/crm' && method === 'GET') value = { simulated: true, records: demo.list() };
  else if (path === '/api/reset' && method === 'POST') value = { simulated: true, records: demo.reset() };
  else if (path === '/api/leads' && method === 'POST') value = demo.run(JSON.parse(options.body));
  else throw new Error('Unsupported browser demo action.');
  const status = { completed: 200, validation_failed: 422, duplicate: 409, ai_failed: 502, crm_failed: 503 }[value.status] || 200;
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}
