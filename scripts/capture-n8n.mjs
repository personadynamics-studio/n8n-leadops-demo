import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Local browser setup/capture helper. Never prints credentials or includes them in evidence.
const local = new URL('../.local/', import.meta.url);
const credentialFile = new URL('n8n-owner.json', local);
mkdirSync(local, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
try {
  await page.goto('http://localhost:5678');
  await page.waitForTimeout(1200);
  let owner = existsSync(credentialFile) ? JSON.parse(readFileSync(credentialFile, 'utf8')) : null;
  if (await page.getByText('Set up owner account', { exact: true }).isVisible()) {
    owner = { email: 'demo-owner@leadops.test', password: `Demo!${randomBytes(24).toString('base64url')}9`, firstName: 'Demo', lastName: 'Operator' };
    await page.locator('#email').fill(owner.email); await page.locator('#firstName').fill(owner.firstName); await page.locator('#lastName').fill(owner.lastName); await page.locator('#password').fill(owner.password);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(1500);
    writeFileSync(credentialFile, JSON.stringify(owner, null, 2), { mode: 0o600 });
    console.log('Created a local n8n demo owner. Access details are stored only in ignored .local/n8n-owner.json.');
  } else if (await page.locator('input[type="password"]').count()) {
    if (!owner) throw new Error('Sign in to your n8n instance; this helper will not reset an existing owner.');
    await page.locator('input[type="email"]').fill(owner.email);
    await page.locator('input[type="password"]').fill(owner.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
  }
  await page.goto('http://localhost:5678/workflow/LeadOpsDemoV1');
  await page.waitForTimeout(2500);
  if (await page.getByText('Ignore for all workflows', { exact: true }).isVisible()) await page.getByText('Ignore for all workflows', { exact: true }).click();
  mkdirSync(new URL('../docs/screenshots/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../docs/screenshots/09-n8n-workflow.png', import.meta.url)), fullPage: true });
  const cases = JSON.parse(readFileSync(new URL('../fixtures/scenarios.json', import.meta.url), 'utf8'));
  await fetch('http://localhost:3000/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const response = await fetch('http://localhost:3000/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cases[0]) });
  const run = await response.json();
  if (run.status !== 'completed') throw new Error('Evidence run did not complete.');
  await page.goto(`http://localhost:5678/workflow/LeadOpsDemoV1/executions/${run.runId}`);
  await page.waitForTimeout(2200);
  const text = await page.locator('body').innerText();
  console.log(text.slice(0, 2800));
  await page.screenshot({ path: fileURLToPath(new URL('../docs/screenshots/10-n8n-execution.png', import.meta.url)), fullPage: true });
  mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../docs/evidence/n8n-inspection.json', import.meta.url), `${JSON.stringify({ capturedAt: new Date().toISOString(), workflow: 'LeadOpsDemoV1', executionId: run.runId, responseStatus: run.status, inspectedUrl: page.url(), visibleExecutionText: text.slice(0, 2800) }, null, 2)}\n`);
  console.log(`Captured published workflow and live execution #${run.runId}.`);
} finally { await browser.close(); }
