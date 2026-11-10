import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.env.DEMO_URL || 'http://localhost:3000';
const output = new URL('../docs/screenshots/', import.meta.url);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], outside = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'warning') errors.push(message.text()); });
page.on('request', req => { if (!new URL(req.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/)) outside.push(req.url()); });
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
async function reset() {
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await page.waitForFunction(() => document.querySelector('#crm-count').textContent.startsWith('1 fictional'));
}
async function runCase(id, expected, screenshot) {
  await page.locator(`[data-case="${id}"]`).click();
  const pending = page.waitForResponse(response => response.url() === `${base}/api/leads` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Run lead workflow' }).click();
  const response = await pending; const result = await response.json();
  await page.waitForFunction(() => document.querySelector('#run-button').disabled === false);
  assert.equal(result.status, expected);
  assert.match(await page.locator('#run-id').innerText(), new RegExp(`execution #${result.runId}`));
  if (screenshot) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: fileURLToPath(new URL(screenshot, output)), fullPage: true });
  }
  pass(`UI ${id}: ${expected}, real n8n #${result.runId}`);
  return result;
}
try {
  await page.goto(base); await page.waitForSelector('[data-case="hot"]');
  await reset();
  await page.screenshot({ path: fileURLToPath(new URL('01-workbench.png', output)), fullPage: true });
  await runCase('hot', 'completed', '02-hot-lead.png');
  assert.equal(await page.locator('#score').innerText(), '100');
  await page.locator('#follow-up summary').click();
  assert.match(await page.locator('#follow-up-text').innerText(), /has not been sent/);
  await page.getByRole('button', { name: /Classify: passed/ }).click();
  assert.match(await page.locator('#stage-detail').innerText(), /Simulated category/);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download result JSON' }).click();
  const download = await downloadEvent; assert.match(download.suggestedFilename(), /^leadops-execution-\d+\.json$/);
  pass('draft stays unsent, stages are inspectable and JSON downloads');
  await runCase('warm', 'completed');
  await runCase('cold', 'completed');
  await runCase('missing', 'validation_failed', '03-validation-blocked.png');
  assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#email').getAttribute('aria-invalid'), 'true');
  await runCase('duplicate', 'duplicate', '04-duplicate.png');
  await runCase('ai-failure', 'ai_failed', '05-ai-failure.png');
  await runCase('crm-failure', 'crm_failed', '06-crm-failure.png');
  await page.locator('#simulate').selectOption('none');
  await page.getByRole('button', { name: 'Run lead workflow' }).click();
  await page.waitForFunction(() => document.querySelector('#outcome-state').textContent === 'Completed');
  pass('CRM failure recovers through the same interface');
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(audit.violations.map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.map(n => n.target) })), []);
  pass('axe WCAG 2.1 AA automated audit: zero violations');
  await page.locator('[data-case="hot"]').click();
  await page.locator('#name').fill('<img src=x onerror=alert(1)>');
  await page.locator('#email').fill('xss@safe.test');
  await page.getByRole('button', { name: 'Run lead workflow' }).click();
  await page.waitForFunction(() => document.querySelector('#outcome-state').textContent === 'Completed');
  assert.equal(await page.locator('#crm-rows img').count(), 0);
  assert.match(await page.locator('#crm-rows').innerText(), /<img src=x onerror=alert\(1\)>/);
  pass('untrusted lead text renders as text, not executable HTML');
  await reset();
  await page.locator('[data-case="hot"]').click();
  await page.getByRole('button', { name: 'Run lead workflow' }).click();
  await page.waitForFunction(() => document.querySelector('#outcome-state').textContent === 'Completed');
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `page overflow at ${width}px`);
    const runButton = page.getByRole('button', { name: 'Run lead workflow' }); await runButton.scrollIntoViewIfNeeded();
    assert.equal(await runButton.isVisible(), true);
    if (width === 320) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: fileURLToPath(new URL('07-mobile.png', output)), fullPage: true });
    }
    pass(`responsive layout at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL('00-overview.png', output)) });
  await page.goto(base); await page.waitForSelector('[data-case="hot"]');
  await page.keyboard.press('Tab'); assert.equal(await page.locator('.skip-link').evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Run lead workflow' }).focus();
  assert.equal(await page.getByRole('button', { name: 'Run lead workflow' }).evaluate(node => node === document.activeElement), true);
  pass('skip link and primary action accept keyboard focus');
  await page.route('**/api/leads', route => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'Injected browser test: n8n offline' }) }));
  await page.getByRole('button', { name: 'Run lead workflow' }).click();
  await page.waitForFunction(() => document.querySelector('#outcome-state').textContent === 'Connection error');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL('08-connection-error.png', output)), fullPage: true });
  await page.unroute('**/api/leads');
  await page.locator('[data-case="warm"]').click();
  assert.equal(await page.locator('#outcome-title').innerText(), 'Ready when you are.');
  pass('connection failure is visible and scenario switching restores the ready state');
  assert.deepEqual(errors, []); assert.deepEqual(outside, []);
  pass('zero browser exceptions, warnings or external requests');
  await reset();
  const timings = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { domContentLoadedMs: Math.round(n.domContentLoadedEventEnd), loadMs: Math.round(n.loadEventEnd) }; });
  mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../docs/evidence/browser-results.json', import.meta.url), `${JSON.stringify({ capturedAt: new Date().toISOString(), browser: browser.version(), base, checks, errors, outsideRequests: outside, automatedAccessibilityViolations: audit.violations.length, localPageTiming: timings, note: 'Connection error screenshot uses an explicitly injected browser test response. All business-case screenshots use the live n8n backend.' }, null, 2)}\n`);
  console.log(`${checks.length} browser checks passed.`);
} finally { await browser.close(); }
