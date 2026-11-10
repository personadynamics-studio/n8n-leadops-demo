import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDemoRuntime } from '../site/runtime.mjs';

const scenarios = JSON.parse(readFileSync(new URL('../fixtures/scenarios.json', import.meta.url), 'utf8'));
const seed = JSON.parse(readFileSync(new URL('../fixtures/crm-seed.json', import.meta.url), 'utf8'));
const create = () => createDemoRuntime({ scenarios, seed });

test('standalone demo executes all seven scenarios without a server', () => {
  const demo = create();
  const expected = ['completed', 'completed', 'completed', 'validation_failed', 'duplicate', 'ai_failed', 'crm_failed'];
  scenarios.forEach((scenario, index) => {
    const result = demo.run(scenario);
    assert.equal(result.status, expected[index]);
    assert.match(result.runId, /^DEMO-/);
    assert.equal(result.mode.orchestration, 'browser_simulation');
    assert.equal(result.trace.length, 6);
    if (result.followUp) assert.equal(result.followUp.sent, false);
  });
  assert.equal(demo.list().length, 4);
});

test('each visitor has independent CRM state and reset only affects that visitor', () => {
  const first = create(), second = create();
  first.run(scenarios[0]);
  assert.equal(first.list().length, 2);
  assert.equal(second.list().length, 1);
  first.reset();
  assert.equal(first.list().length, 1);
  assert.equal(first.run(scenarios[0]).status, 'completed');
});

test('repeated and normalized emails are blocked before simulated classification', () => {
  const demo = create();
  demo.run(scenarios[0]);
  const replay = structuredClone(scenarios[0]); replay.lead.email = ' AVERY@HARBOR.TEST ';
  const result = demo.run(replay);
  assert.equal(result.status, 'duplicate');
  assert.equal(result.ai, undefined);
  assert.equal(demo.list().length, 2);
});

test('a simulated CRM failure can be retried safely after switching injection off', () => {
  const demo = create(); const payload = structuredClone(scenarios[6]);
  assert.equal(demo.run(payload).status, 'crm_failed');
  assert.equal(demo.list().length, 1);
  payload.simulate = 'none';
  assert.equal(demo.run(payload).status, 'completed');
  assert.equal(demo.list().length, 2);
});

test('edited inputs change priority and unknown service routes to review', () => {
  const payload = structuredClone(scenarios[0]); payload.lead.budgetHkd = 35000; payload.lead.timelineDays = 60;
  const result = create().run(payload);
  assert.equal(result.priority.score, 65); assert.equal(result.priority.tier, 'P2');
  payload.lead.service = 'unknown';
  assert.equal(create().run(payload).priority.tier, 'review');
});

test('invalid simulated AI output and non-fictional contact addresses stop safely', () => {
  const payload = structuredClone(scenarios[0]); payload.simulate = 'ai_invalid';
  assert.equal(create().run(payload).status, 'ai_failed');
  payload.simulate = 'none'; payload.lead.email = 'someone@example.com';
  assert.equal(create().run(payload).status, 'validation_failed');
});
