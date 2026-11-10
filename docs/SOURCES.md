# Research, selection and provenance

Reviewed on **2026-11-10**. Read primary text documentation, repository source, workflow `nodes` / `parameters` / `connections` and license files. No YouTube material was used. No external template was executed with real credentials. Popularity is context, not proof of reliability.

## Installation and implementation sources

| Primary source | What was verified and used |
| --- | --- |
| [Official Docker installation](https://docs.n8n.io/hosting/installation/docker/) | Official n8n image, stable version selection and persistent `/home/node/.n8n` volume. The retrieved page reports stable 2.47.3 and points to the newer Compose guide. Actual image was pulled and pinned by digest. |
| [Official Compose setup](https://docs.n8n.io/deploy/host-n8n/install-options/install-using-docker-compose.md) | Compose-based self-hosting and WSL2 guidance. Its optional Assistant/sandbox/search stack is outside this demo's requirements and was not installed. Persistent data uses Linux named volumes; only a small read-only workflow import folder is mounted from Windows. |
| [Official server CLI](https://docs.n8n.io/hosting/cli-commands/) | `import:workflow`, `export:workflow`, `publish:workflow` and restart behavior. Verified these commands inside the actual 2.47.3 image. |
| [Official Webhook node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) | Published production webhook, JSON request, response node and execution inspection. |
| [Official Code node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/) | JavaScript Code-node execution and n8n item shape. Exact functions are embedded into the workflow artifact. |
| [Official HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/) | JSON requests and fixed mock CRM endpoints. No user-controlled outbound URL. |
| [n8n 2.47.3 module config source](https://github.com/n8n-io/n8n/blob/n8n%402.47.3/packages/%40n8n/backend-common/src/modules/modules.config.ts) | Verified `N8N_DISABLED_MODULES` and `mcp-registry` are supported in this version. |
| [n8n license at the installed version](https://github.com/n8n-io/n8n/blob/n8n%402.47.3/LICENSE.md) | Sustainable Use License and separate enterprise exceptions. n8n is not relicensed as MIT by this project. |

Adaptation: the cloud-server guide includes domain/TLS/proxy setup; this localhost-only demo binds to 127.0.0.1 with HTTP and disables secure cookies only for that local use. It is not a public-hosting recipe. Docker Desktop 29.9 did not expose the published ports on an `internal: true` network in this environment; a normal private Compose bridge was verified instead. No claim of an egress firewall is made.

## Workflow references actually read

### 1. n8n template 5428 by marth — principal end-to-end reference

[Template page](https://n8n.io/workflows/5428-qualify-real-estate-leads-automatically-with-openai-gmail-and-airtable-crm/) · [actual template JSON API](https://api.n8n.io/api/templates/workflows/5428)

Created 2025-06-28; the API reported **10,634 views** when reviewed. Read all 12 nodes (including notes), field mappings, extractor schema, score threshold and connections. The implemented pattern is form intake → structured extraction → qualification gate → CRM and follow-up notification.

Useful for the complete operational shape and a visible AI boundary. It uses real OpenAI, Airtable and Gmail nodes, so it was **not imported or executed as the demo**. Its configuration is real-estate-specific and still requires service setup. No explicit standalone redistribution license was verified on the template/API. **Design reference only; no JSON, prompt, imagery or substantial code is redistributed.**

### 2. erikMMIV / ai-lead-qualification-agent — structured extraction and deterministic scoring

[Repository](https://github.com/erikMMIV/ai-lead-qualification-agent) · [reviewed workflow](https://github.com/erikMMIV/ai-lead-qualification-agent/blob/ca3dc13f6b9681e7ae3d920a6ed776ab5165f2c8/workflow/AI%20Lead%20Qualification%20%26%20Appointment%20Agent%20-%20V1%20Foundation.json) · [license](https://github.com/erikMMIV/ai-lead-qualification-agent/blob/ca3dc13f6b9681e7ae3d920a6ed776ab5165f2c8/LICENSE)

Revision **ca3dc13f6b9681e7ae3d920a6ed776ab5165f2c8**. MIT, copyright 2026 Yurii Vityuk. Read the nine-node workflow: webhook, normalization, Gemini extractor schema, `Score & Qualify Lead` JavaScript, reply chain, Merge and structured output. Useful separation: extraction/classification is distinct from deterministic scoring and final response assembly. Its prompt treats customer text as untrusted data.

**Selected as a design reference**, not a fork. LeadOps uses its own field contract, weights, branches and draft text. No Gemini call or prompt is retained. Full original MIT notice is preserved in `licenses/erikMMIV-MIT.txt`. This small repository was not treated as proof of production maturity.

### 3. Bakaare / ai-lead-qualification-n8n — early data-quality and duplicate gates

[Repository](https://github.com/Bakaare/ai-lead-qualification-n8n) · [reviewed workflow](https://github.com/Bakaare/ai-lead-qualification-n8n/blob/415fa92ea65ef73f88953249c7454a7f65938d94/workflow.json) · [license](https://github.com/Bakaare/ai-lead-qualification-n8n/blob/415fa92ea65ef73f88953249c7454a7f65938d94/LICENSE)

Revision **415fa92ea65ef73f88953249c7454a7f65938d94**. MIT, copyright 2026 Mohamed Bakaar. Read all 11 nodes: required-field If, Google Sheets lookup (including `alwaysOutputData`), duplicate gate, input projection, structured OpenAI schema, append row and separate webhook responses for success, duplicate and validation error.

**Selected as a design reference** for validating/deduplicating before classification and distinct response branches. Its live Sheets IDs, cached URLs and credential references were not copied. LeadOps adds email normalization, atomic duplicate protection, explicit mock failure/retry paths and an interactive interface. Full MIT notice: `licenses/Bakaare-MIT.txt`. No external integration was tested or claimed.

### 4. Zie619 / n8n-workflows — large collection, inspected critically

[Collection](https://github.com/Zie619/n8n-workflows) at **94007c1445d9258a7da116646b79473e7c7c3282** (57,209 stars reported by the GitHub API at review). MIT, copyright 2025 Zie619; preserved notice: `licenses/Zie619-MIT.txt`.

Read these exact exports:

- [0379_Code_Pipedrive_Create_Triggered.json](https://github.com/Zie619/n8n-workflows/blob/94007c1445d9258a7da116646b79473e7c7c3282/workflows/Code/0379_Code_Pipedrive_Create_Triggered.json)
- [1619_Code_Pipedrive_Automation_Triggered.json](https://github.com/Zie619/n8n-workflows/blob/94007c1445d9258a7da116646b79473e7c7c3282/workflows/Code/1619_Code_Pipedrive_Automation_Triggered.json)
- [0896_Facebookleadads_Stickynote_Automate_Triggered.json](https://github.com/Zie619/n8n-workflows/blob/94007c1445d9258a7da116646b79473e7c7c3282/workflows/Facebookleadads/0896_Facebookleadads_Stickynote_Automate_Triggered.json)

The Pipedrive examples suggest CRM search → interest classification → deal creation, but the reviewed connection maps contain only an error-handler connection keyed by an ID rather than the visible named-node flow. The Facebook lead export has an empty connection map. **Rejected as an executable base.** This is an observed issue in these files at this revision, not a claim about the entire collection. No source code from them was copied into the demo.

### 5. n8n template 6414 — nurturing overview with empty implementation

[Template](https://n8n.io/workflows/6414-automated-lead-nurturing-and-qualification-with-gmail-google-sheets-and-slack/) · [actual JSON](https://api.n8n.io/api/templates/workflows/6414)

Read webhook, qualification, Sheets CRM, assignment, Gmail, Slack and Wait nodes. The actual export has empty `parameters` for the functional nodes. **Rejected as a base**; useful only as a conceptual list of nurturing steps. No standalone redistribution license was verified; no content is redistributed.

## Final selection

The implementation is original, informed by the principal template's end-to-end shape and the two MIT examples' separation of concerns. It combines deterministic simulation, a visible UI, failure injection and local testing without importing account-specific data, real-model nodes or senders.

The repository retains provenance links and full MIT notices. The original LeadOps code carries its own MIT license; reference and dependency terms remain separate.
