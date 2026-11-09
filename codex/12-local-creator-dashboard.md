# Phase 12 — Optional localhost review dashboard

**Goal:** Provide a small local-only UI for editing scenes, previewing runs and requesting review actions after CLI usage proves painful.    
**Stage:** Optional UX productivity    
**Roadmap mapping:** Phase 5 — Channel-scale refinement / optional UI    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 12 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/18-studio-ux.md
  - docs/09-data-and-api.md
  - docs/07-workflow.md

GOAL
Provide a small local-only UI for editing scenes, previewing runs and requesting review actions after CLI usage proves painful.  

IMPLEMENTATION WORK
  - First document concrete operator workflows not efficiently handled by CLI.
  - Create localhost-only API/UI behind existing typed services, with routes for topics, job status, script revisions and render previews.
  - Provide review controls that call audited approval methods and show exact hash/metadata before confirmation.
  - Offer scene rerender, video playback, source and claim inspection and manual publish confirmation.
  - Protect browser mutations with origin/CSRF controls and refuse non-local bind by default.

OUT OF SCOPE
  - No multi-tenant SaaS, accounts, billing, cloud deployment or background uploads.
  - Do not duplicate workflow logic between CLI and UI.

ACCEPTANCE CRITERIA
  - AC-01: One test job can be inspected, edited, rendered and reviewed from local UI with the same backend transitions as CLI.
  - AC-02: CSRF and permission boundaries tested; no remote access by default.

VERIFICATION
  - API contract tests, key E2E operator path and local-only binding assertions.

LIKELY AREAS (inspect current repository before creating them)
  - src/web/ (or approved apps/studio if justified)
  - tests/web/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 12.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
