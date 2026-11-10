import { validateLead, applyDedupe, classifyMock, scoreLead, buildFollowUp, finish } from '../workflow/logic.mjs';

// Each browser tab owns this in-memory simulation. No backend or shared visitor data.
export function createDemoRuntime({ scenarios, seed }) {
  let records = structuredClone(seed);
  return {
    scenarios: () => structuredClone(scenarios),
    list: () => structuredClone(records),
    reset() { records = structuredClone(seed); return this.list(); },
    run(payload) {
      let context = validateLead(payload, { runId: `DEMO-${crypto.randomUUID().slice(0, 8)}`, startedAt: new Date().toISOString() });
      context.mode.orchestration = 'browser_simulation';
      if (context.status !== 'processing') return finish(context);
      const existing = records.find(record => record.email === context.lead.email);
      context = applyDedupe(context, { exists: Boolean(existing), ...(existing ? { record: structuredClone(existing) } : {}) });
      if (context.status !== 'processing') return finish(context);
      context = classifyMock(context);
      if (context.status !== 'processing') return finish(context);
      context = scoreLead(context);
      let commit;
      if (context.simulate === 'crm_failure') {
        commit = { outcome: 'failed', error: 'Injected mock CRM failure. No record was written.' };
      } else if (records.length >= 500) {
        commit = { outcome: 'failed', error: 'Demo capacity reached. Reset this tab to continue.' };
      } else {
        const record = {
          id: `DEMO-${String(records.length + 1).padStart(3, '0')}`, ...context.lead,
          category: context.ai.output.category, score: context.priority.score, tier: context.priority.tier,
          owner: context.priority.owner, createdAt: context.startedAt, runId: context.runId, simulated: true,
        };
        records.push(record);
        commit = { outcome: 'created', record: structuredClone(record) };
      }
      return finish(buildFollowUp(context, commit));
    },
  };
}
