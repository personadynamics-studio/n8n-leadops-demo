import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { validateLead, applyDedupe, classifyMock, scoreLead, buildFollowUp, finish } from '../workflow/logic.mjs';

const nodes = [], connections = {};
function add(name, type, version, position, parameters, extra = {}) {
  nodes.push({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, type: `n8n-nodes-base.${type}`, typeVersion: version, position, parameters, ...extra });
}
function code(name, position, fn, call) { add(name, 'code', 2, position, { jsCode: `${fn.toString()}\nreturn [{ json: ${call} }];` }); }
function gate(name, position, expression) {
  add(name, 'if', 2.2, position, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: `${name}-condition`, leftValue: expression, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} });
}
function link(from, to, output = 0) {
  const c = connections[from] ||= { main: [] };
  while (c.main.length <= output) c.main.push([]);
  c.main[output].push({ node: to, type: 'main', index: 0 });
}
function http(name, pos, path, jsonBody) {
  add(name, 'httpRequest', 4.2, pos, { method: 'POST', url: `http://app:3001/${path}`, sendBody: true, specifyBody: 'json', jsonBody, options: { timeout: 5000 } }, { onError: 'continueRegularOutput', retryOnFail: true, maxTries: 2, waitBetweenTries: 500 });
}
add('Lead intake', 'webhook', 2, [0, 0], { httpMethod: 'POST', path: 'leadops-intake', responseMode: 'responseNode', options: {} }, { webhookId: '4e95f503-e7bc-473c-b633-5a0a81806612' });
code('Validate and normalize', [240, 0], validateLead, 'validateLead($json.body, { runId: $execution.id, startedAt: new Date().toISOString() })');
gate('Valid lead?', [480, 0], '={{ $json.validation.valid }}');
http('Look up mock CRM', [720, -100], 'lookup', '={{ JSON.stringify({ email: $json.lead.email }) }}');
code('Deduplicate', [960, -100], applyDedupe, "applyDedupe($('Validate and normalize').first().json, $json)");
gate('New lead?', [1200, -100], "={{ $json.status === 'processing' }}");
code('AI classifier - SIMULATED', [1440, -200], classifyMock, 'classifyMock($json)');
gate('AI contract valid?', [1680, -200], "={{ $json.status === 'processing' }}");
code('Deterministic priority', [1920, -300], scoreLead, 'scoreLead($json)');
http('Commit mock CRM - SIMULATED', [2160, -300], 'commit', '={{ JSON.stringify($json) }}');
code('Follow-up draft - NEVER SENT', [2400, -300], buildFollowUp, "buildFollowUp($('Deterministic priority').first().json, $json)");
code('Finalize evidence', [2640, 100], finish, 'finish($json)');
add('Return result', 'respondToWebhook', 1.4, [2880, 100], { respondWith: 'json', responseBody: '={{ $json }}', options: { responseCode: "={{ ({ completed: 200, validation_failed: 422, duplicate: 409, ai_failed: 502, crm_failed: 503 })[$json.status] || 500 }}" } });
add('Simulation boundary', 'stickyNote', 1, [1360, -540], { width: 700, height: 220, color: 5, content: '## Explicit simulation boundary\nAI classification uses deterministic JavaScript only. No model, API key, token usage or AI fee.\nCRM is a local fictional JSON store. No HubSpot, Salesforce, Airtable or Sheets connection.\nFollow-up is an unsent draft; no sender or scheduler exists.\n\nOriginal implementation. Design references and license notices: docs/SOURCES.md and THIRD_PARTY_NOTICES.md.' });
add('Operational guardrails', 'stickyNote', 1, [240, -380], { width: 900, height: 210, color: 4, content: '## Real n8n orchestration\nPOST /webhook/leadops-intake. Synthetic data and .test emails only.\nValidation → normalized email lookup → duplicate gate → simulated classifier → deterministic score → atomic mock commit → draft.\nAll blocked and error routes converge on an inspectable response with $execution.id. A concurrent duplicate is also stopped at commit.' });
link('Lead intake', 'Validate and normalize'); link('Validate and normalize', 'Valid lead?');
link('Valid lead?', 'Look up mock CRM'); link('Valid lead?', 'Finalize evidence', 1);
link('Look up mock CRM', 'Deduplicate'); link('Deduplicate', 'New lead?');
link('New lead?', 'AI classifier - SIMULATED'); link('New lead?', 'Finalize evidence', 1);
link('AI classifier - SIMULATED', 'AI contract valid?'); link('AI contract valid?', 'Deterministic priority'); link('AI contract valid?', 'Finalize evidence', 1);
link('Deterministic priority', 'Commit mock CRM - SIMULATED'); link('Commit mock CRM - SIMULATED', 'Follow-up draft - NEVER SENT'); link('Follow-up draft - NEVER SENT', 'Finalize evidence'); link('Finalize evidence', 'Return result');
const workflow = { id: 'LeadOpsDemoV1', name: 'LeadOps | Synthetic lead intake (AI + CRM SIMULATED)', active: false, nodes, connections, settings: { executionOrder: 'v1', saveExecutionProgress: true, saveDataSuccessExecution: 'all', saveDataErrorExecution: 'all', executionTimeout: 30 }, pinData: {}, tags: [] };
const output = `${JSON.stringify(workflow, null, 2)}\n`;
const target = new URL('../workflows/leadops.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Workflow JSON is stale. Run npm run generate.');
  console.log(`Workflow artifact matches source (${nodes.length} nodes, no credentials).`);
} else {
  mkdirSync(new URL('../workflows/', import.meta.url), { recursive: true });
  writeFileSync(target, output);
  console.log(`Generated ${nodes.length} nodes.`);
}
