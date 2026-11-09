# Tech Explainer Studio

> **Phase 01 implemented:** offline VideoScript validation CLI and tests. Video rendering and publishing are still planned. Verified progress is recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md).
>
> **Read [EXECUTION_FLOW.md](EXECUTION_FLOW.md) first for the exact Codex build process.**

Tech Explainer Studio turns a technical topic or a public engineering reference into an **original, fact-checked, narrated, animated explainer** for YouTube Shorts and Instagram Reels. Technical topics come from system design, standards, computer-science principles and projects such as [Build Your Own X](https://github.com/codecrafters-io/build-your-own-x). The previously supplied dark-store / heatmap videos are **visual style references only**, not content requirements.

## At a glance

| Topic | Choice |
|---|---|
| Repository | New independent `tech-explainer-studio`; do not fork the entire automation-agent repository |
| Workflow | Three **logical stages**: Content Director → Video Producer → Publisher |
| AI | DeepSeek API opt-in (usage-priced); mock provider/local Ollama alternative |
| Scenes | Versioned `VideoScript` data + registered components, Zod validation, no arbitrary LLM code execution |
| Animation | Remotion + React + SVG, optional Playwright for legitimate UI walkthroughs |
| Audio/video | Local Kokoro + FFmpeg; captions aligned to actual audio timing |
| Persistence | SQLite and local artifacts (implemented in a later phase) |
| Publishing | Human approval; YouTube **private by default**, Instagram export first |
| Reference project | `phi-video-gen` is an architecture inspiration, **not** a code source unless rights permit |
| Tooling | Primarily local/free; API calls and cloud resources are optional and controlled |

## Start here

1. **[EXECUTION_FLOW.md](EXECUTION_FLOW.md)** — single authoritative setup, phase execution, review and handoff process.
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — main architecture and Mermaid diagram; updated only when design changes.
3. **[AGENTS.md](AGENTS.md)** — persistent Codex engineering rules; Claude Code starts from [CLAUDE.md](CLAUDE.md).
4. **[PROJECT_STATUS.md](PROJECT_STATUS.md)** — factual phase completion log; updated after **each** phase.
5. **[CODEX_PROMPTS.md](CODEX_PROMPTS.md)** — index of the 14 copy-ready implementation phase prompts under [`codex/`](codex/).
6. **[docs/02-architecture.md](docs/02-architecture.md)**, **[docs/03-contracts.md](docs/03-contracts.md)**, **[docs/20-component-specs.md](docs/20-component-specs.md)** — detailed implementation references.
7. **[MIGRATION_FROM_PREVIOUS_ZIP.md](MIGRATION_FROM_PREVIOUS_ZIP.md)** — what changed, what old files to remove, how to preserve existing work.

## First milestone

**Phase 00–04:** render one original, mobile-readable **HTTP server** explainer from the checked-in [`examples/http-server.videoscript.json`](examples/http-server.videoscript.json) **without making a DeepSeek call**. The test should demonstrate browser → HTTP request → server → response using reusable SVG/Remotion components, measured Kokoro narration, captions, and FFmpeg assembly.

**Phase 05–06:** verify technical sources, implement the DeepSeek Content Director, and generate a strict source-backed `VideoScript`. **Phase 07–10:** recovery, approvals, private publishing and Instagram export. **Phases 11–13** add optional animation components, creator dashboard and analytics.

## Run the offline validator

Use Node 24.15.0 (`.nvmrc`) and npm 11.12.1. Dependencies are pinned in `package-lock.json`; installation needs the npm registry or a populated cache. Validation, tests and builds need no API keys or network after installation.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run studio -- --help
npm run studio -- script validate --file examples/http-server.videoscript.json
npm run typecheck
npm run lint
npm test
npm run build
node dist/cli/index.js script validate --file examples/http-server.videoscript.json
```

`npm run format` formats and applies safe Biome fixes to source, tests and configuration; it leaves the reference fixture untouched. No global CLI installation is needed. A successful validation emits JSON on stdout and exits `0`. Failures emit structured JSON on stderr: `2` for input/JSON/schema/file errors, `3` for unsupported visual types/components. Help exits `0`.

Only `title-card` and `tech-animation` with `BrowserRequestFlow` are supported. The registry contains validation schemas, not renderers. Other documented `studio` commands are proposals. Syntax/schema validity does not approve facts, rights, timing or a release.

## Detailed reference documentation

The [`docs/`](docs/) directory retains the complete product and engineering blueprint: product requirements, content strategy, schemas, video engine, workflow, security, testing, operations, decisions, animations and content backlog. Refer to the relevant documentation **for the current phase** rather than reading every file for every task. See [docs/25-build-phase-map.md](docs/25-build-phase-map.md).

## What is not included

This package does **not** contain a renderer, audio pipeline, director, database, dashboard, publisher, API credentials, model weights, third-party media, or authorized copies of workplace code. The implemented CLI validates scripts locally; the remaining architecture is a design target.
