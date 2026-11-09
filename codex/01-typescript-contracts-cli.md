# Phase 01 — TypeScript foundation, schema, fixture and CLI validation

**Goal:** Create one strict TypeScript package that parses VideoScript v1, validates per-component props and provides an offline script-validation CLI.    
**Stage:** Offline contract slice    
**Roadmap mapping:** Phase 1 — Contract and offline render / contract slice    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 01 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - AGENTS.md
  - docs/03-contracts.md
  - docs/09-data-and-api.md
  - docs/12-quality-and-tests.md
  - docs/20-component-specs.md
  - examples/http-server.videoscript.json

GOAL
Create one strict TypeScript package that parses VideoScript v1, validates per-component props and provides an offline script-validation CLI.  

IMPLEMENTATION WORK
  - Create package manifest, strict TS config, test runner and lint/format scripts; choose compatible current dependency versions and lock them.
  - Implement Zod `VideoScriptV1` and discriminated scene visual types from the docs, with strict component-specific BrowserRequestFlow props.
  - Preserve fixture semantics; document and update fixtures only when contract conflict is explicitly approved.
  - Implement structured validation errors with scene ID, path and reason; reject unknown component IDs, arbitrary expressions and out-of-range cues.
  - Add CLI entrypoint with `script validate --file` and help; keep single-package layout.
  - Write valid, invalid, malformed JSON and invalid-component tests; no network required.

OUT OF SCOPE
  - No Remotion render, Kokoro audio, DeepSeek, database, dashboard, publisher, shell execution of scene data.
  - No monorepo expansion unless an ADR establishes necessity.

ACCEPTANCE CRITERIA
  - AC-01: Valid HTTP fixture parses; invalid variants fail with actionable errors and nonzero code.
  - AC-02: Unknown component and extra props are rejected at runtime, not only TypeScript compile time.
  - AC-03: `typecheck`, `lint` and unit tests pass using commands documented in package.json.
  - AC-04: No API keys or outbound calls are needed to validate scripts.

VERIFICATION
  - Run test/typecheck/lint; include command outputs and counts.
  - Demonstrate valid fixture accepted and two invalid fixtures rejected.

LIKELY AREAS (inspect current repository before creating them)
  - package.json
  - package-lock.json
  - tsconfig.json
  - src/domain/
  - src/cli/
  - tests/

EXECUTION RULES
Implement the smallest coherent changes that satisfy the phase. Inspect the actual code and current git diff first; do not assume planned commands or files already exist. Use small, testable iterations and regression tests. Run the relevant validation, typecheck, lint and targeted tests; do not claim success for unrun commands. For media work, produce and inspect real render artifacts where the environment permits; otherwise report the limitation. Stop and ask before a materially conflicting architecture change, a new paid/remote service, irreversible action, confidential-code import or security downgrade. Do not begin any later phase.
- Maintain strict TypeScript, Zod validation of LLM-generated data, and deterministic render-only execution where applicable.
- Do not run a paid DeepSeek call, live OAuth flow, upload, commit/push, global installation or download large assets unless I explicitly authorize the specific action. Mock outside services for ordinary tests.
- Protect credentials, API keys, copyrighted references, and employer intellectual property. No automatic public publishing.
- Preserve previously working phases. If a safety or correctness invariant conflicts with these instructions, stop and explain the conflict rather than silently weakening it.

AFTER THE PHASE
1. Update PROJECT_STATUS.md: observed phase status, work completed, commands executed and their actual outcomes, artifacts, blockers, and recommended next phase.
2. Update the MAIN ARCHITECTURE.md only if implemented components, interfaces, boundaries or decisions truly changed. Clearly distinguish planned from implemented. Keep docs/02-architecture.md consistent when technical detail changes.
3. Update contract/component/reference docs only when their real behavior changed. Record significant architecture decisions in docs/15-adrs.md.
4. Update AGENTS.md or CLAUDE.md ONLY when a new durable project-wide coding rule is necessary. Avoid accumulating phase logs in agent instructions.
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 01.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
