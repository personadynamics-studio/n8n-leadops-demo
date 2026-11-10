# Third-party notices

This repository's original app, logic, fixtures and workflow are MIT under `LICENSE`. It does not include or relicense n8n's implementation or the source of referenced workflows.

Design references, with complete original MIT notices retained for clear attribution:

| Work | Author / copyright | Reviewed revision | Notice |
| --- | --- | --- | --- |
| [ai-lead-qualification-agent](https://github.com/erikMMIV/ai-lead-qualification-agent) | 2026 Yurii Vityuk | ca3dc13f6b9681e7ae3d920a6ed776ab5165f2c8 | `licenses/erikMMIV-MIT.txt` |
| [ai-lead-qualification-n8n](https://github.com/Bakaare/ai-lead-qualification-n8n) | 2026 Mohamed Bakaar | 415fa92ea65ef73f88953249c7454a7f65938d94 | `licenses/Bakaare-MIT.txt` |
| [n8n-workflows](https://github.com/Zie619/n8n-workflows) | 2025 Zie619 | 94007c1445d9258a7da116646b79473e7c7c3282 | `licenses/Zie619-MIT.txt` |

These are conceptual references; their credential-bound exports are not shipped. n8n catalog templates 5428 and 6414 are research references only. No separate redistribution grant was verified for those templates, and their code/text/art is not copied into the implementation. See `docs/SOURCES.md` for selection decisions and primary links.

Runtime images are fetched from their official registries; they are not bundled in the source archive:

- **n8n 2.47.3**: Sustainable Use License with separate enterprise exceptions. Full installed-version license is retained at `licenses/n8n-LICENSE.md`; [upstream license](https://github.com/n8n-io/n8n/blob/n8n%402.47.3/LICENSE.md). This project's MIT license does not grant rights to n8n itself.
- **Node.js 24.22.1 / Debian bookworm slim**: each component retains its upstream terms; [Node.js license](https://github.com/nodejs/node/blob/v24.22.1/LICENSE). The official image includes third-party notices.

Development/test packages are pinned in `package-lock.json` and installed only when requested for development. Playwright / playwright-core are Apache-2.0; `@axe-core/playwright` 4.14.0 and axe-core 4.14.0 declare MPL-2.0 in their installed package metadata. Their package distributions retain upstream notices. These packages are not production dependencies and `node_modules` is excluded from the source archive. Browsers downloaded by Playwright retain their own terms.

No externally sourced imagery, fonts or icon package is used. The small LeadOps SVG mark is original.
