import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const seed = JSON.parse(readFileSync(new URL('../fixtures/crm-seed.json', import.meta.url), 'utf8'));

export class MockCrm {
  constructor(file) {
    this.file = file;
    mkdirSync(dirname(file), { recursive: true });
    // Refuse corrupt data instead of silently replacing a persisted store.
    this.records = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : structuredClone(seed);
    if (!Array.isArray(this.records)) throw new Error('Invalid mock CRM store');
    if (!existsSync(file)) this.save(this.records);
  }
  save(next) {
    writeFileSync(`${this.file}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(`${this.file}.tmp`, this.file);
    this.records = next;
  }
  list() { return structuredClone(this.records); }
  lookup(email) {
    const record = this.records.find(row => row.email === String(email).trim().toLowerCase());
    return { exists: Boolean(record), ...(record ? { record: structuredClone(record) } : {}) };
  }
  commit(context) {
    const lead = context.lead;
    if (context.synthetic !== true || !lead || typeof lead.email !== 'string' || !lead.email.endsWith('.test') || !context.ai?.simulated || !context.priority) {
      return { outcome: 'failed', error: 'Only validated fictional lead contexts can enter the mock CRM.' };
    }
    if (context.simulate === 'crm_failure') return { outcome: 'failed', error: 'Injected mock CRM storage failure. No record was written.' };
    // Synchronous lookup + atomic file replacement in one Node process prevents concurrent duplicate writes.
    const existing = this.lookup(lead.email);
    if (existing.exists) return { outcome: 'duplicate', record: existing.record };
    if (this.records.length >= 500) return { outcome: 'failed', error: 'Demo capacity reached (500 records). Reset the demo and retry.' };
    const record = {
      id: `DEMO-${String(this.records.length + 1).padStart(3, '0')}`,
      name: lead.name, email: lead.email.trim().toLowerCase(), company: lead.company, market: lead.market,
      category: context.ai.output.category, score: context.priority.score, tier: context.priority.tier,
      owner: context.priority.owner, createdAt: new Date().toISOString(), runId: context.runId, simulated: true,
    };
    this.save([...this.records, record]);
    return { outcome: 'created', record: structuredClone(record) };
  }
  reset() { this.save(structuredClone(seed)); return this.list(); }
}
