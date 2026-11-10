const $ = selector => document.querySelector(selector);
const form = $('#lead-form');
const stages = [
  ['validation', 'Validate', 'Required fields & consent'], ['dedupe', 'Deduplicate', 'Normalized email lookup'],
  ['ai', 'Classify', 'Simulated AI'], ['priority', 'Prioritize', 'Deterministic rules'],
  ['crm', 'Record', 'Simulated CRM'], ['followup', 'Follow up', 'Draft only'],
];
let scenarios = [], result = null, selectedStage = 'validation', busy = false;
const labels = { sales_ready: 'Sales ready', nurture: 'Nurture', needs_review: 'Human review' };
const outcomes = {
  completed: ['Ready for the next action', 'Completed', 'success'],
  validation_failed: ['Check the lead details', 'Validation blocked', 'error'],
  duplicate: ['Duplicate prevented', 'Stopped safely', 'warning'],
  ai_failed: ['AI simulation failed', 'No CRM write', 'error'],
  crm_failed: ['CRM simulation failed', 'No follow-up draft', 'error'],
};
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function announce(message) { $('#announcement').textContent = message; }
function setBusy(value) {
  busy = value;
  $('#run-button').disabled = value; $('#reset-demo').disabled = value;
  $('#run-button').textContent = value ? 'Running in n8n…' : 'Run lead workflow ↗';
  document.querySelectorAll('.scenario-button').forEach(button => { button.disabled = value; });
  $('#result').setAttribute('aria-busy', String(value));
}
function clearResult() {
  result = null;
  selectedStage = 'validation';
  $('#result-empty').hidden = false; $('#result-content').hidden = true;
  $('#outcome-title').textContent = 'Ready when you are.';
  $('#result-empty p').textContent = 'Run the enquiry through n8n to see its category, priority and next action.';
  $('#outcome-state').textContent = 'Awaiting run'; $('#outcome-state').className = 'pill';
  $('#download-result').disabled = true;
  $('#run-id').textContent = 'n8n execution evidence appears here';
  $('#raw-result').textContent = 'No execution yet.';
  $('#ai-input').textContent = 'Run a new, valid lead to inspect the input.';
  $('#ai-output').textContent = 'No AI step has run yet.';
  form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  renderPipeline();
}
function loadScenario(scenario) {
  for (const [key, value] of Object.entries(scenario.lead)) {
    const field = form.elements.namedItem(key);
    if (field.type === 'checkbox') field.checked = value; else field.value = value;
  }
  form.elements.namedItem('synthetic').checked = true;
  form.elements.namedItem('simulate').value = scenario.simulate;
  $('#scenario-title').textContent = scenario.label;
  $('#expected').textContent = `Expected: ${scenario.expected}`;
  document.querySelectorAll('.scenario-button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === scenario.id)));
  clearResult(); announce(`${scenario.label} loaded. Edit the inputs or run the workflow.`);
}
function renderScenarios() {
  $('#scenarios').replaceChildren(...scenarios.map((scenario, index) => {
    const button = el('button', 'scenario-button'); button.type = 'button'; button.dataset.case = scenario.id;
    button.setAttribute('aria-pressed', 'false');
    button.append(el('span', `case-dot${scenario.simulate !== 'none' ? ' failure' : ''}`, String(index + 1)));
    const copy = el('span'); copy.append(el('strong', '', scenario.label), el('small', '', scenario.hint)); button.append(copy);
    button.addEventListener('click', () => loadScenario(scenario));
    return button;
  }));
}
function renderPipeline() {
  $('#pipeline').replaceChildren(...stages.map(([key, title, hint], index) => {
    const entry = result?.trace.find(item => item.stage === key);
    const status = entry?.status || 'pending';
    const button = el('button', `stage ${status}`); button.type = 'button'; button.dataset.stage = key;
    button.setAttribute('aria-pressed', String(key === selectedStage));
    button.setAttribute('aria-label', `${title}: ${status}. ${hint}`);
    const top = el('span', 'stage-top'); top.append(el('span', 'stage-number', status === 'passed' ? '✓' : String(index + 1)), el('span', '', status));
    button.append(top, el('strong', '', title), el('small', '', hint));
    button.addEventListener('click', () => { selectedStage = key; renderPipeline(); });
    return button;
  }));
  const stage = result?.trace.find(item => item.stage === selectedStage);
  $('#stage-title').textContent = `${stages.find(([key]) => key === selectedStage)[1]}${stage ? ` · ${stage.status}` : ''}`;
  $('#stage-detail').textContent = stage?.detail || 'Run a lead to inspect the workflow evidence.';
  $('#stage-json-details').hidden = !result;
  if (result) {
    const data = { validation: result.validation, dedupe: result.duplicate || { normalizedEmail: result.lead.email }, ai: result.ai, priority: result.priority, crm: result.crm, followup: result.followUp }[selectedStage];
    $('#stage-json').textContent = JSON.stringify(data || { status: stage.status, detail: stage.detail }, null, 2);
  }
}
function renderResult(value) {
  result = value;
  $('#result-empty').hidden = true; $('#result-content').hidden = false;
  const [title, state, tone] = outcomes[value.status] || ['Workflow unavailable', 'Connection error', 'error'];
  $('#result-title').textContent = title;
  $('#outcome-state').textContent = state; $('#outcome-state').className = `pill ${tone}`;
  $('#result-subtitle').textContent = value.lead.company || 'Fictional lead submission';
  $('#score-block').hidden = !value.priority;
  $('#score').textContent = value.priority ? String(value.priority.score) : '—';
  $('#category').textContent = labels[value.ai?.output?.category] || 'Not classified';
  $('#owner').textContent = value.priority?.owner || 'No assignment';
  const errors = value.validation.errors;
  $('#validation-errors').hidden = !errors.length;
  const list = el('ul'); errors.forEach(error => { list.append(el('li', '', error.message)); form.elements.namedItem(error.field)?.setAttribute('aria-invalid', 'true'); });
  $('#validation-errors').replaceChildren(list);
  $('#score-rules').replaceChildren(...(value.priority?.breakdown || []).map(rule => {
    const row = el('div', 'score-rule'); row.append(el('span', '', rule.rule), el('span', '', `${rule.points} / ${rule.max}`)); return row;
  }));
  $('#next-action-title').textContent = value.followUp ? `${value.priority.tier} follow-up plan` : 'Recovery action';
  $('#next-action-text').textContent = value.followUp?.action || value.recovery;
  $('#due-at').textContent = value.followUp ? `Demo target: ${new Date(value.followUp.dueAt).toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong', dateStyle: 'medium', timeStyle: 'short' })} HKT · not scheduled` : 'No message sent or scheduled.';
  $('#follow-up').hidden = !value.followUp; $('#follow-up').open = false;
  $('#follow-up-text').textContent = value.followUp ? `${value.followUp.subject}\n\n${value.followUp.body}` : '';
  $('#recovery').textContent = value.recovery;
  $('#run-id').textContent = `n8n execution #${value.runId} · ${new Date(value.startedAt).toLocaleTimeString('en-HK', { timeZone: 'Asia/Hong_Kong' })} HKT`;
  $('#download-result').disabled = false;
  $('#raw-result').textContent = JSON.stringify(value, null, 2);
  $('#ai-input').textContent = value.ai ? JSON.stringify(value.ai.input, null, 2) : 'Skipped. This lead stopped before classification.';
  $('#ai-output').textContent = value.ai ? JSON.stringify(value.ai.output || { error: value.ai.error }, null, 2) : 'No simulated AI output.';
  selectedStage = value.trace.find(item => ['blocked', 'failed'].includes(item.status))?.stage || 'priority';
  renderPipeline(); announce(`${state}. ${value.followUp?.action || value.recovery} n8n execution ${value.runId}.`);
}
async function refreshCrm() {
  const response = await fetch('/api/crm'); if (!response.ok) throw new Error('Mock CRM could not be loaded.');
  const { records } = await response.json();
  $('#crm-rows').replaceChildren(...records.map(record => {
    const row = el('tr'); row.dataset.recordId = record.id;
    const contact = el('td'); contact.append(el('strong', '', record.name), el('small', '', record.company), el('small', '', record.email));
    const category = el('td', '', labels[record.category] || record.category);
    const priority = el('td'); priority.append(el('span', `pill ${record.tier === 'P1' ? 'success' : 'warning'}`, `${record.tier} · ${record.score}`));
    const owner = el('td', '', record.owner); const id = el('td'); id.append(el('strong', '', record.id));
    if (/^\d+$/.test(record.runId)) { const link = el('a', '', `n8n #${record.runId} ↗`); link.href = `http://localhost:5678/workflow/LeadOpsDemoV1/executions/${record.runId}`; link.target = '_blank'; link.rel = 'noreferrer'; id.append(link); } else id.append(el('small', '', 'Seed record'));
    row.append(contact, category, priority, owner, id); return row;
  }));
  if (!records.length) { const row = el('tr'); const cell = el('td', '', 'No fictional records yet. Run a lead or reset the demo.'); cell.colSpan = 5; row.append(cell); $('#crm-rows').append(row); }
  $('#crm-count').textContent = `${records.length} fictional record${records.length === 1 ? '' : 's'} · A repeated email stops as a duplicate. Reset before replaying successful cases.`;
}
form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  clearResult(); setBusy(true); announce('Running the lead workflow in n8n.');
  const fields = new FormData(form); const lead = Object.fromEntries(['name', 'email', 'company', 'market', 'service', 'message'].map(key => [key, fields.get(key)]));
  for (const key of ['budgetHkd', 'timelineDays']) lead[key] = fields.get(key) === '' ? null : Number(fields.get(key));
  lead.consent = $('#consent').checked;
  try {
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead, synthetic: $('#synthetic').checked, simulate: fields.get('simulate') }) });
    const value = await response.json();
    if (!value.runId || !Array.isArray(value.trace)) throw new Error(value.error || 'The workflow returned no execution evidence.');
    renderResult(value); await refreshCrm();
  } catch (error) {
    $('#outcome-state').textContent = 'Connection error'; $('#outcome-state').className = 'pill error';
    $('#outcome-title').textContent = 'Start the workflow, then retry.';
    $('#result-empty p').textContent = error.message;
    announce(error.message);
  } finally { setBusy(false); }
});
$('#reset-demo').addEventListener('click', async () => {
  if (busy) return; setBusy(true);
  try {
    const response = await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('Demo reset failed. Retry after checking the app.');
    await refreshCrm(); clearResult(); announce('Mock CRM reset to one fictional seed record. n8n history has been kept.');
  } catch (error) { announce(error.message); $('#crm-count').textContent = error.message; }
  finally { setBusy(false); }
});
$('#download-result').addEventListener('click', () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
  const link = el('a'); link.href = url; link.download = `leadops-execution-${result.runId}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
async function health() {
  try {
    const response = await fetch('/api/health'); const data = await response.json();
    $('#connection').textContent = data.n8n ? 'n8n connected' : 'n8n offline';
    $('#connection').className = `connection${data.n8n ? ' online' : ''}`;
  } catch { $('#connection').textContent = 'App offline'; $('#connection').className = 'connection'; }
}
try {
  const response = await fetch('/api/scenarios'); if (!response.ok) throw new Error('Cannot load fictional scenarios. Reload after starting the app.');
  scenarios = await response.json(); renderScenarios(); loadScenario(scenarios[0]); await refreshCrm();
} catch (error) { announce(error.message); $('#crm-count').textContent = error.message; }
await health(); setInterval(health, 30000);
