import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

let server;
const dist = new URL('../dist/', import.meta.url);
const assets = new Set(['index.html', 'app.js', 'app.css', 'favicon.svg', 'site/adapter.mjs', 'site/runtime.mjs', 'site/data.mjs', 'workflow/logic.mjs']);
if (!process.env.SITE_URL) {
  server = createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (!assets.has(name)) { res.writeHead(404); return res.end(); }
    const type = name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : name.endsWith('.svg') ? 'image/svg+xml' : 'text/javascript';
    res.writeHead(200, { 'Content-Type': type, 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" });
    res.end(readFileSync(new URL(name, dist)));
  });
  await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
}
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [], requests = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
page.on('request', request => requests.push({ url: request.url(), method: request.method(), type: request.resourceType() }));
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
async function run(expected) {
  await page.getByRole('button', { name: 'Run demo' }).click();
  await page.waitForFunction(() => document.querySelector('#result-content').hidden === false && document.querySelector('#run-button').disabled === false);
  const result = JSON.parse(await page.locator('#raw-result').textContent());
  assert.equal(result.status, expected); assert.equal(result.mode.orchestration, 'browser_simulation'); assert.match(result.runId, /^DEMO-/);
  assert.equal(result.trace.length, 6); return result;
}
async function reset() { await page.getByRole('button', { name: 'Reset demo data' }).click(); await page.waitForFunction(() => document.querySelector('#crm-count').textContent.startsWith('1 fictional')); }
const screenshotPath = new URL('../docs/screenshots/11-standalone-website.png', import.meta.url);
try {
  const navigation = await page.goto(base);
  assert.equal(navigation.status(), 200);
  assert.match(navigation.headers()['content-security-policy'] || '', /connect-src 'none'/);
  await page.waitForSelector('[data-case="hot"]');
  assert.match(await page.locator('.simulation-banner').innerText(), /Workflow, AI & CRM are simulated/);
  assert.match(await page.locator('.simulation-banner').innerText(), /No n8n backend/);
  assert.equal(await page.getByRole('link', { name: /Open n8n/ }).count(), 0);
  assert.equal(await page.locator('a[href*="localhost"]').count(), 0);
  pass('public site explicitly identifies the browser simulation and has no localhost links');
  for (const [id, expected] of [['hot', 'completed'], ['warm', 'completed'], ['cold', 'completed'], ['missing', 'validation_failed'], ['duplicate', 'duplicate'], ['ai-failure', 'ai_failed'], ['crm-failure', 'crm_failed']]) {
    await page.locator(`[data-case="${id}"]`).click();
    const value = await run(expected);
    if (expected !== 'completed') assert.equal(value.followUp, undefined);
    pass(`${id}: ${expected}`);
  }
  await page.locator('#simulate').selectOption('none');
  await run('completed'); pass('CRM failure recovers by switching injection off');
  await page.locator('[data-case="ai-failure"]').click(); await page.locator('#simulate').selectOption('ai_invalid');
  await run('ai_failed'); pass('malformed simulated AI output fails closed');
  await reset(); await page.locator('[data-case="hot"]').click();
  await page.locator('#budgetHkd').fill('35000'); await page.locator('#timelineDays').fill('60');
  const edited = await run('completed'); assert.equal(edited.priority.score, 65); assert.equal(edited.priority.tier, 'P2');
  pass('editing budget and timing changes the route to P2 / 65');
  await reset(); await page.locator('#service').selectOption('unknown');
  assert.equal((await run('completed')).priority.tier, 'review'); pass('unknown service routes to human review');
  const other = await browser.newContext(); const otherPage = await other.newPage(); await otherPage.goto(base); await otherPage.waitForSelector('[data-case="hot"]');
  assert.match(await otherPage.locator('#crm-count').innerText(), /^1 fictional/); await other.close();
  pass('visitor CRM state is independent');
  await page.locator('[data-stage="ai"]').click(); assert.match(await page.locator('#stage-detail').innerText(), /Simulated category/);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download result JSON' }).click();
  assert.match((await pending).suggestedFilename(), /^leadops-execution-DEMO-/); pass('decision trail and JSON download work');
  await reset(); await page.locator('[data-case="hot"]').click();
  await page.locator('#name').fill('<img src=x onerror=alert(1)>'); await run('completed');
  assert.equal(await page.locator('#crm-rows img').count(), 0); pass('lead text is safely rendered');
  await page.reload(); await page.waitForSelector('[data-case="hot"]'); assert.match(await page.locator('#crm-count').innerText(), /^1 fictional/);
  pass('reload restores the fictional seed');
  await run('completed');
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(audit.violations.map(x => ({ id: x.id, nodes: x.nodes.map(n => n.target) })), []); pass('automated accessibility audit: zero violations');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  pass('layout works at 320 / 768 / 1440 pixels');
  await page.evaluate(() => window.scrollTo(0, 0));
  mkdirSync(new URL('../docs/screenshots/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(screenshotPath) });
  assert.equal(requests.filter(x => x.method !== 'GET' || ['fetch', 'xhr'].includes(x.type)).length, 0);
  assert.equal(requests.filter(x => new URL(x.url).origin !== new URL(base).origin).length, 0);
  assert.deepEqual(errors, []); pass('zero API requests, external requests or browser errors');
  mkdirSync(new URL('../docs/evidence/', import.meta.url), { recursive: true });
  const evidence = { capturedAt: new Date().toISOString(), url: base, browser: browser.version(), mode: 'browser_simulation', checks, browserErrors: errors, apiRequests: 0, externalRequests: 0, accessibilityViolations: 0 };
  writeFileSync(new URL('../docs/evidence/standalone-results.json', import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`${checks.length} standalone browser checks passed.`);
} finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
