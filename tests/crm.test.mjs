import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockCrm } from '../app/crm.mjs';

const lead = { name: 'Avery Chan', email: 'avery@harbor.test', company: 'Harbor Retail (fictional)', market: 'Hong Kong' };
const context = { synthetic: true, lead, runId: 'test-1', simulate: 'none', ai: { simulated: true, output: { category: 'sales_ready' } }, priority: { score: 100, tier: 'P1', owner: 'Demo sales desk' } };

test('mock CRM persists records, prevents duplicates atomically and resets to the seed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'leadops-crm-'));
  try {
    const crm = new MockCrm(join(dir, 'crm.json'));
    assert.equal(crm.list().length, 1);
    const created = crm.commit(context);
    assert.equal(created.outcome, 'created');
    assert.equal(crm.commit(context).outcome, 'duplicate');
    assert.equal(crm.list().length, 2);
    assert.equal(new MockCrm(join(dir, 'crm.json')).lookup('AVERY@HARBOR.TEST').record.id, created.record.id);
    assert.equal(crm.reset().length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('injected CRM failure is side-effect free and permits a successful retry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'leadops-crm-'));
  try {
    const crm = new MockCrm(join(dir, 'crm.json'));
    assert.equal(crm.commit({ ...context, simulate: 'crm_failure' }).outcome, 'failed');
    assert.equal(crm.lookup(lead.email).exists, false);
    assert.equal(crm.commit(context).outcome, 'created');
    assert.equal(crm.commit({ ...context, lead: { ...lead, email: 'real@example.com' } }).outcome, 'failed');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
