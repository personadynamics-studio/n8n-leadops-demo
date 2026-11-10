import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const base = process.env.DEMO_URL || 'http://localhost:3000';
const scenarios = JSON.parse(readFileSync(new URL('../fixtures/scenarios.json', import.meta.url), 'utf8'));
const evidence = { capturedAt: new Date().toISOString(), target: base, note: 'Actual responses from the running n8n workflow. AI and CRM are simulated. All data is fictional.', checks: [], runs: [] };
async function post(path, payload, headers = {}) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  return { httpStatus: response.status, result: await response.json() };
}
function check(name, fn) { fn(); evidence.checks.push(name); console.log(`PASS ${name}`); }
async function crm() { return (await (await fetch(`${base}/api/crm`)).json()).records; }
await post('/api/reset', {});
const expected = { hot: [200, 'completed', 'P1', 100], warm: [200, 'completed', 'P2', 65], cold: [200, 'completed', 'P3', 25], missing: [422, 'validation_failed'], duplicate: [409, 'duplicate'], 'ai-failure': [502, 'ai_failed'], 'crm-failure': [503, 'crm_failed'] };
for (const scenario of scenarios) {
  const response = await post('/api/leads', scenario);
  const [http, status, tier, score] = expected[scenario.id];
  check(`scenario ${scenario.id}: HTTP ${http}, ${status}`, () => {
    assert.equal(response.httpStatus, http); assert.equal(response.result.status, status);
    assert.match(response.result.runId, /^\d+$/); assert.equal(response.result.trace.length, 6);
    assert.equal(response.result.mode.ai, 'simulated'); assert.equal(response.result.mode.crm, 'simulated');
    if (tier) { assert.equal(response.result.priority.tier, tier); assert.equal(response.result.priority.score, score); assert.equal(response.result.followUp.sent, false); }
    else assert.equal(response.result.followUp, undefined);
    if (['missing', 'duplicate'].includes(scenario.id)) assert.equal(response.result.ai, undefined);
  });
  evidence.runs.push({ case: scenario.id, ...response });
}
check('failed and blocked runs did not write CRM records', () => assert.equal(evidence.runs.filter(x => x.result.crm?.written).length, 3));
const afterCases = await crm();
check('only seed and three successful case records exist', () => assert.equal(afterCases.length, 4));
const hot = structuredClone(scenarios[0]);
hot.lead.email = '  AVERY@HARBOR.TEST  ';
const duplicate = await post('/api/leads', hot);
check('normalized replay is a duplicate, not a new record', () => assert.equal(duplicate.result.status, 'duplicate'));

for (const id of ['ai-failure', 'crm-failure']) {
  const retry = structuredClone(scenarios.find(x => x.id === id)); retry.simulate = 'none';
  const response = await post('/api/leads', retry);
  check(`safe retry after ${id}`, () => assert.equal(response.result.status, 'completed'));
  evidence.runs.push({ case: `${id}-recovered`, ...response });
}
const invalid = structuredClone(scenarios[0]); invalid.lead.email = 'contract@invalid.test'; invalid.simulate = 'ai_invalid';
const invalidResult = await post('/api/leads', invalid);
check('malformed mock AI output is rejected without a CRM write', () => { assert.equal(invalidResult.result.status, 'ai_failed'); assert.equal(invalidResult.result.priority, undefined); });
evidence.runs.push({ case: 'malformed-ai', ...invalidResult });
const review = structuredClone(scenarios[0]); review.lead.email = 'review@unknown.test'; review.lead.service = 'unknown';
const reviewResult = await post('/api/leads', review);
check('unknown service explicitly routes to human review', () => { assert.equal(reviewResult.result.priority.tier, 'review'); assert.equal(reviewResult.result.ai.output.category, 'needs_review'); });
evidence.runs.push({ case: 'human-review', ...reviewResult });
const concurrent = structuredClone(scenarios[0]); concurrent.lead.email = 'parallel@race.test';
const races = await Promise.all(Array.from({ length: 8 }, () => post('/api/leads', concurrent)));
check('eight concurrent identical leads create exactly one record', () => { assert.equal(races.filter(x => x.result.status === 'completed').length, 1); assert.equal(races.filter(x => x.result.status === 'duplicate').length, 7); });
assert.equal((await crm()).filter(row => row.email === concurrent.lead.email).length, 1);
evidence.runs.push(...races.map((response, index) => ({ case: `concurrent-${index + 1}`, ...response })));
const forbidden = structuredClone(scenarios[0]); forbidden.lead.email = 'not-a-demo@example.com';
const rejected = await post('/api/leads', forbidden);
check('non-.test contact address cannot be processed', () => assert.equal(rejected.result.status, 'validation_failed'));
const origin = await post('/api/reset', {}, { Origin: 'https://external.example' });
check('cross-origin reset is blocked', () => assert.equal(origin.httpStatus, 403));
const noType = await fetch(`${base}/api/leads`, { method: 'POST', body: '{}' });
check('mutation requires JSON content type', () => assert.equal(noType.status, 415));
const oversize = await post('/api/leads', { large: 'x'.repeat(17000) });
check('oversized payload is bounded', () => assert.equal(oversize.httpStatus, 413));
const internal = await fetch(`${base}/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
check('internal CRM commit is not exposed by public app port', () => assert.equal(internal.status, 404));
await post('/api/reset', {});
const afterReset = await crm();
check('reset restores only one seed record', () => assert.equal(afterReset.length, 1));
mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/evidence/integration-results.json', import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${evidence.checks.length} live checks passed. Evidence written to docs/evidence/integration-results.json.`);
