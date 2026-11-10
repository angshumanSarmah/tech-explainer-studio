# Phase 13 — Quality metrics, analytics and controlled launch

**Goal:** Measure real production quality, repeatability and channel results before scaling cadence or complexity.    
**Stage:** Optional iteration after first videos    
**Roadmap mapping:** Phase 5 — Channel-scale refinement / optional analytics & launch readiness    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt only after **Phase 10** has been verified in `PROJECT_STATUS.md` (and required prior phases remain complete). Revised next phase: **Phase 14 (optional)**.

```text
You are implementing Phase 13 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/21-channel-launch.md
  - docs/22-budget-and-metrics.md
  - docs/14-operations.md
  - docs/12-quality-and-tests.md

GOAL
Measure real production quality, repeatability and channel results before scaling cadence or complexity.  

IMPLEMENTATION WORK
  - Add read-only YouTube analytics collector through official APIs if permissions allow, with source dates and freshness.
  - Track effort per video, corrected claims, render retry frequency, cost per finished video and component reuse.
  - Create a simple topic backlog ranking and deduplication without claiming external-demand metrics not measured.
  - Run full smoke suite and reproducibility/security/license audit; document backup/restore procedures and capacity limits.
  - Record honest launch retrospective and first 5-video improvement plan.

ADDITIONAL V4 REQUIREMENTS — INTEGRATE PHASE 05/06 CONTRACTS
  - Measure actual end-to-end quality and editorial effort: unsupported claims corrected, sources per video, time researching, per-scene repair counts, pronunciation corrections, missing-audio failures, timing-review rates, readability issues and visual component reuse.
  - Track AI usage separately by origin: manually generated ChatGPT/Codex scripts versus optional provider API tokens/cost; do not fabricate zero-cost accounting or infer precise model costs where unavailable.
  - Track BrandProfile version, cross-video consistency and deviations; assess visual identity and narration consistency before scaling.
  - Support honest optional YouTube analytics only with authorized credentials; allow manual CSV/notes when APIs are unavailable, never infer subscriber/view metrics.
  - Validate three different technical videos, fact/source approval quality, captions, voice, variety and mobile readability before considering production cadence increases.
  - Include launch readiness for both YouTube Shorts and manual Instagram Reels; all publishing remains opt-in and approval-bound.
  - Document when an autonomous Research Agent would provide measurable benefit; do not secretly implement one in the analytics phase.

OUT OF SCOPE
  - No automated growth bots, spam, purchased views, 60-videos-per-month production target or opaque recommender.
  - No new agent frameworks without measured operational evidence.

ACCEPTANCE CRITERIA
  - AC-01: Metrics show actual measured data and distinguish estimates and missing periods.
  - AC-02: Five varied video topic plans can be reviewed; three distinct videos reuse registered components.
  - AC-03: Release checklist, rollback/backup procedure and operator runbook validated.

  - AC-04: A production dashboard/review report distinguishes actual measurements, estimates, missing data and manual time for at least three different demos.
  - AC-05: Human QC covers real audio, brand consistency, caption/readability and fact accuracy, with explicit remaining defects.

VERIFICATION
  - Read-only mock analytics and incomplete-data reporting tests.
  - Full validation suite, security and recovery tabletop tests.

  - Add small fixture-driven analytics tests for sparse data, mixed manual/provider origins and unreconciled approval states.

LIKELY AREAS (inspect current repository before creating them)
  - src/analytics/
  - src/topics/
  - docs/operations/
  - tests/analytics/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 13. The next planned phase is Phase 14 (optional); do not implement it now.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
