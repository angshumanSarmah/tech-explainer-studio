# Phase 07 — SQLite jobs, provenance and incremental recovery

**Goal:** Persist production jobs and recover from interruption while invalidating only changed scenes or dependencies.    
**Stage:** Production resilience    
**Roadmap mapping:** Phase 3 — Recoverability, repairs and releases / persistent workflow    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt only after **Phase 06** has been verified in `PROJECT_STATUS.md` (and required prior phases remain complete). Revised next phase: **Phase 08**.

```text
You are implementing Phase 07 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/07-workflow.md
  - docs/09-data-and-api.md
  - docs/05-video-engine.md
  - docs/12-quality-and-tests.md

GOAL
Persist production jobs and recover from interruption while invalidating only changed scenes or dependencies.  

IMPLEMENTATION WORK
  - Introduce SQLite migrations and typed repositories for jobs, steps, script revisions, assets and render manifests.
  - Implement state transitions with transaction boundaries and step input/output hashes; preserve scene failure diagnostics.
  - Add content-addressed scene cache; include scene, audio, theme, renderer, fonts, dimensions and tool versions in cache key.
  - Implement `jobs list`, `jobs inspect`, `jobs resume` and scene-only render command.
  - Add per-job lock/lease and bounded retries; avoid duplicated jobs or races.
  - Record provider token spend and suppress paid provider construction in render-only resume.

ADDITIONAL V4 REQUIREMENTS — INTEGRATE PHASE 05/06 CONTRACTS
  - Persist content origin (`manual_import`, `deepseek`, later provider), validated VideoScript revision, Phase 05 ResearchBundle identity/revision and source/claim review references without persisting secrets or unbounded raw prompts.
  - Persist BrandProfile ID/version/resolved config fingerprint and Kokoro narrator/model/speed identity, linked to each render/job manifest. Keep user-provided brand assets and content provenance separate.
  - Define dependency-aware invalidation rather than rerendering everything: brand colors/fonts -> affected frames/captions/final assembly, not unchanged speech; narrator/lexicon -> affected audio/timeline/mux, not Director; scene edits -> changed scene outputs; source/claim changes -> evidence/review invalidation and Director draft status, not automatic paid regeneration.
  - Cache keys must include the actual implementation's relevant scene, renderer, font, brand, narration, timing, input and tool versions. Be conservative where dependencies are unknown; avoid incorrect reuse.
  - Resume and render-only retry must never silently re-call DeepSeek or regenerate source research; preserve paused review/approval state and invalidate stale release approvals after any artifact change.
  - Handle legacy Phase 01–06 fixtures/jobs without assumed brand fields through tested migration/default handling; use actual state schema first.

OUT OF SCOPE
  - No Temporal, LangGraph, Redis, distributed queue or cloud hosting.
  - No automatic rerun of the whole script or publisher after a scene render failure.

ACCEPTANCE CRITERIA
  - AC-01: A simulated interrupted job resumes after last valid output without DeepSeek re-request.
  - AC-02: Editing one scene leaves unrelated asset hashes/cache entries unchanged.
  - AC-03: Invalid transitions and concurrent conflicting mutations are rejected.
  - AC-04: CLI exposes stage-scoped errors and uses atomic asset writes.

  - AC-05: Changing only theme colors leaves existing narration WAV checksums intact, while regenerating only visually dependent outputs.
  - AC-06: Changing only the narrator invalidates audio/timeline/mux but preserves script and unrelated visual work; resume never makes an unapproved paid call.
  - AC-07: Manual/LLM origin and source/brand revisions round-trip through SQLite and manifests; stale approval states are not reused.

VERIFICATION
  - SQLite migration tests, crash/restart integration, cache invalidation graph tests and lease conflict.

  - Add cache dependency matrix tests (script-only, source-review, brand tokens, caption style, narrator, output dimensions), migration/backcompat and cost/no-provider-construction checks.

LIKELY AREAS (inspect current repository before creating them)
  - src/storage/
  - src/workflow/
  - src/cli/
  - tests/workflow/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 07. The next planned phase is Phase 08; do not implement it now.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
