import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = JSON.parse(readFileSync(new URL('../workflows/leadops.json', import.meta.url), 'utf8'));

test('distributed workflow has no model, sender, credential or external service node', () => {
  const allowed = new Set(['webhook', 'code', 'if', 'httpRequest', 'respondToWebhook', 'stickyNote'].map(name => `n8n-nodes-base.${name}`));
  for (const node of workflow.nodes) {
    assert.ok(allowed.has(node.type), `Unapproved node type: ${node.type}`);
    assert.equal(node.credentials, undefined);
  }
  const urls = workflow.nodes.filter(node => node.type === 'n8n-nodes-base.httpRequest').map(node => node.parameters.url).sort();
  assert.deepEqual(urls, ['http://app:3001/commit', 'http://app:3001/lookup']);
  assert.deepEqual(workflow.pinData, {});
  assert.equal(workflow.active, false);
});

test('all executable nodes are connected to the real webhook and connection targets exist', () => {
  const names = new Set(workflow.nodes.map(node => node.name));
  const visited = new Set();
  function walk(name) {
    if (visited.has(name)) return;
    assert.ok(names.has(name), `Broken connection to ${name}`);
    visited.add(name);
    for (const outputs of Object.values(workflow.connections[name] || {})) for (const branch of outputs) for (const edge of branch) walk(edge.node);
  }
  const triggers = workflow.nodes.filter(node => node.type === 'n8n-nodes-base.webhook');
  assert.equal(triggers.length, 1); walk(triggers[0].name);
  for (const node of workflow.nodes.filter(node => node.type !== 'n8n-nodes-base.stickyNote')) assert.ok(visited.has(node.name), `Unreachable node ${node.name}`);
});
