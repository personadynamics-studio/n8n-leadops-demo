# Verification record

Executed on **2026-11-10 (Asia/Hong_Kong)** on Windows. Business-case runs used the actual published n8n webhook. No external AI, CRM or sender credentials were configured.

## Environment

- Windows 11 Pro, Docker Desktop 4.98.0, Engine 29.9.2, Compose 5.6.1, WSL2 backend.
- n8n 2.47.3, official image pinned to `sha256:6723b440354bb8e1395a1ecee12685fe03923f897bf6e4d5bb2c6c2bd2051697`.
- Node.js 24.22.1, image pinned to `sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c`.
- Test-only packages: Playwright 1.65.0 and `@axe-core/playwright` 4.14.0. Exact transitive versions are in the lockfile. No production npm dependency.

## Completed checks

| Level | Result | What was exercised |
| --- | --- | --- |
| Pure logic / storage / artifact | 20 tests passed | The original 14 checks plus six standalone-runtime tests covering seven scenarios, separate visitors, reset, normalized duplicate, recovery, edits, review and invalid input |
| Standalone website browser | 19 checks passed | Seven cases, edits, recovery, human review, session isolation, reset/reload, JSON download, escaped text, responsive layout, zero API/external requests and zero browser errors |
| Live n8n integration | 21 checks passed | All seven presets, exact HTTP/business outcomes, skipped stages, record counts, normalized replay, recovery, malformed output, human review, eight concurrent identical submissions, reserved email rejection, cross-origin block, JSON/size boundaries and public/internal port separation |
| Isolated Chromium browser | 18 checks passed | All seven scenarios from UI, actual execution IDs, draft inspection, stage switching, JSON download, recovery, escaped hostile text, 320/768/1024/1440 widths, keyboard focus, connection-error UI and state reset |
| Automated accessibility | 0 violations in audited result screen | axe WCAG 2 A/AA + 2.1 AA tags; not a complete manual conformance audit |
| Dependency audit | 0 known npm vulnerabilities | All four installed dev/transitive packages had verified registry signatures and attestations; no claim of a full container vulnerability scan |
| Startup | First-start and repeat-start passed | Fresh separate named volumes, workflow import/publication, seed record, real successful execution; original stack restored afterward |
| n8n UI | Published workflow and live execution inspected | Screenshots show actual editor, traversed nodes and an execution ID |

The 21 integration checks include one eight-request concurrency check; these are not 21 unit tests. Browser HTTP 422/409/502/503 responses are expected business outcomes. The browser report checks JavaScript exceptions, warnings and external requests; expected HTTP-error console messages are not misrepresented as application exceptions.

Machine-readable evidence:

- `evidence/integration-results.json`: actual full workflow responses and execution IDs.
- `evidence/browser-results.json`: checks, tested Chromium version, accessibility and local navigation timing.
- `evidence/startup-results.json`: independent fresh-volume startup and actual first run.
- `evidence/n8n-inspection.json`: n8n execution inspected in its own UI.
- `evidence/standalone-results.json`: standalone website tests and exact tested URL; this mode simulates the entire process in the browser.

Execution IDs identify the local database at capture time, not a globally unique public run. The workflow retains executions for seven days; historical screenshots/evidence remain valid capture records after pruning. Navigation timing is one local observation, not a performance benchmark or production SLA.

## Screenshot provenance

All PNGs are direct browser captures, without compositing or retouching:

| File | Captured state |
| --- | --- |
| `00-overview.png` | Desktop viewport with completed fictional lead |
| `01-workbench.png` | Ready state and seed CRM |
| `02-hot-lead.png` | Actual successful n8n response and P1 result |
| `03-validation-blocked.png` | Missing name/email, later stages skipped |
| `04-duplicate.png` | Normalized seeded email stopped before AI |
| `05-ai-failure.png` | Injected failure inside the simulated classifier, executed by n8n |
| `06-crm-failure.png` | Injected mock commit failure; no draft |
| `07-mobile.png` | Actual workbench rendered at 320px |
| `08-connection-error.png` | Explicit browser-test injection of unavailable n8n response; this one screenshot does not claim an actual engine outage |
| `09-n8n-workflow.png` | Published workflow in actual n8n editor |
| `10-n8n-execution.png` | Saved execution and traversed path in actual n8n |
| `11-standalone-website.png` | Separate browser-only website, clearly labeled as a simulation with no n8n backend |

## Issues found and resolved

1. Docker engine was installed but stopped. Started Docker Desktop and verified the Linux engine.
2. On an internal-only bridge, this Docker Desktop version retained HostConfig bindings but exposed no mapped localhost ports. Switched to a normal Compose bridge; verified both host bindings are 127.0.0.1. This is not an egress firewall.
3. A failed CRM lookup initially could have been treated as “not found”. Added a failing test and changed the gate to fail closed before AI.
4. An injected browser connection error left stale ready-state copy after switching cases. The browser regression test failed, then passed after the reset logic was corrected.

## Limits of verification

No real-model quality, token cost, external CRM, email delivery, multi-user authentication, distributed storage, public hosting, full container CVE scan, manual screen-reader audit, load benchmark or macOS/Linux startup execution was tested. The shell script uses the same verified Docker/CLI commands, but its operating-system path is unverified here. These are outside the local simulated demo's acceptance scope.
