# Local-demo trust boundaries

The public Cloudflare website is a separate, backend-free browser simulation. It serves only static HTML/CSS/JavaScript. Its API-shaped adapter runs entirely in memory, never calls `fetch`, never sends lead input to a server, and keeps each tab's mock CRM separate. A CSP `connect-src 'none'` blocks accidental fetch/XHR. Reload/reset restores the seed; no browser storage, database, n8n endpoint, credentials or shared reset operation is used. The website labels orchestration, AI and CRM as simulated and uses `DEMO-` run IDs. The controls below describe the optional local n8n stack.

Assets: fictional lead records, demo execution history and the local n8n owner login / generated encryption key. The workbench does not handle real customer data, provider credentials, payments or sessions. The browser, lead fields and mock output are treated as data.

| Boundary | Threat | Implemented control |
| --- | --- | --- |
| Browser → public app | External-site writes / DNS rebinding | Localhost Host allowlist, JSON mutation content type, explicit same-origin check, no CORS grant |
| Public app → n8n | Arbitrary URL fetch / excessive payload | Fixed n8n base, fixed webhook path, 16 KB request cap, 20-second proxy timeout |
| Webhook → business rules | Invalid types, fake identity, instruction-like text | Required field/length/range/enum checks, `.test` address guard, explicit synthetic and fictional-consent flags; no instruction execution |
| Classifier → business decisions | Invalid mock output | Version/category/type guard and fail-closed route; malformed-output test |
| n8n → local CRM | Duplicate race / accidental public storage API | Separate unpublished internal port; synchronous single-process uniqueness check plus atomic file replacement; concurrent-request test |
| Stored data → browser | XSS | Text nodes / `textContent`, no untrusted `innerHTML`, restrictive CSP, hostile-text browser check |
| Files / repository | Secret disclosure | No workflow credentials, named Docker volumes, `.local` / `.env` ignored, allowlisted archive, source scan |

The n8n editor has its own owner login; the public demo UI intentionally has none and is restricted to localhost. No TLS or application identity system is provided for external access. Local users/processes and anyone controlling Docker can operate the demo, reset fictional records or administer n8n. Do not publish, tunnel or share ports as though this were a production application.

The two containers use a normal Compose bridge with outbound capability. The workflow has only two fixed local mock CRM HTTP destinations and no model/sender node. Browser checks observed no external workbench requests. n8n's framework has independent upstream services and notices; disabling its diagnostics/templates/version notifications/MCP registry is not claimed to be a network firewall.

The mock CRM stores at most 500 records in a single-process JSON file. It is not a cross-process lock, multi-user authorization system or distributed transaction. Draft creation occurs after a successful local commit; a client response lost after commit may require checking the existing CRM record. Deduplication uses normalized email only, not company/entity resolution.

Test fixtures and screenshots are synthetic. The `.test` rule cannot detect real names or private information pasted into other fields. Keep all content fictional. Successful/failed n8n executions are retained for seven days, and Reset only resets mock CRM. The local owner file and volumes are outside the source archive.

Dependencies: the npm lockfile is authoritative; `.npmrc` blocks lifecycle scripts by default. The app uses only Node's standard library. Development packages and container images are version pinned. npm's audit/signature result does not establish that all image components are vulnerability-free.
