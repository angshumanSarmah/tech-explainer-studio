# Phase 12 — Local Vue 3 creator dashboard

**Goal:** Provide the first practical local Vue 3 creator UI for sources, imports, scene revisions, preview and review while reusing existing typed backend services.    
**Stage:** Optional UX productivity    
**Roadmap mapping:** Phase 5 — Channel-scale refinement / optional UI    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt only after **Phase 11** has been verified in `PROJECT_STATUS.md` (and required prior phases remain complete). Revised next phase: **Phase 09**.

```text
You are implementing Phase 12 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/18-studio-ux.md
  - docs/09-data-and-api.md
  - docs/07-workflow.md

GOAL
Provide the first practical local Vue 3 creator UI for sources, imports, scene revisions, preview and review while reusing existing typed backend services.  

IMPLEMENTATION WORK
  - Document the minimal operator journey from source selection or manual JSON import through render, preview and human review.
  - Create localhost-only API/UI behind existing typed services, with routes for topics, job status, script revisions and render previews.
  - Provide review controls that call audited approval methods and show exact hash/metadata before confirmation.
  - Offer scene rerender, video playback, source and claim inspection and manual publish confirmation.
  - Protect browser mutations with origin/CSRF controls and refuse non-local bind by default.

ADDITIONAL V4 REQUIREMENTS — INTEGRATE PHASE 05/06 CONTRACTS
  - This is now a planned core local operator interface, not indefinitely optional. Use Vue 3 + TypeScript consistent with the user's frontend stack if not in conflict with existing repository architecture; keep the existing Node/TS service layer as source of truth.
  - Provide minimal flows: topic/audience/focus input; multiple Phase 05 sources and claim status inspection; director contract download; manual VideoScript JSON upload/import; mock/optional approved LLM generation; field-level errors; scene list and revisions; selected BrandProfile and narrator view/override where supported; render preview with audible audio/captions; progress and exact-file QC; Phase 08 review actions.
  - Provide review of a complete 9:16 MP4, warnings (e.g. requiresTimingReview or absent audio) and source/provenance without silently approving drafts; display approval-bound hashes and explicit confirmation.
  - Keep CLI + web UI calling the same typed application services, review transitions and schema/animation registry; never reimplement validation in Vue alone.
  - Bind localhost by default and protect origins, CSRF, file upload size/type/path traversal, preview file access and credentials. No production-wide authentication/SaaS scope.
  - Show only explicit publish eligibility, but do not build YouTube OAuth, API upload or Instagram automation here (those are Phases 09–10). Replace original 'manual publish confirmation' with an offline approval/release handoff until Phase 09.
  - A reasonable first dashboard can be compact and functional; do not invent extensive themes or multi-tenant features.

ADDITIONAL V5 REQUIREMENTS — VISUAL WORKFLOW UI
  - Build on the actual Phase 11 VisualAsset and scene contracts. Add a focused local asset library with safe manual image import, asset thumbnail/preview, resolution/mime/size, license evidence, provenance and approval status. Do not clone a full-featured asset editor or internet image browser.
  - In the storyboard editor, show registered visual scene types and supported props, with validated asset pickers, fixed brand profiles, scene timeline/cue preview and safe-zone preview. Clearly label `scene_3d` and `map_heatmap` unavailable until Phase 11B implements them; never offer dead-end choices.
  - Add a way to switch between technical diagram and layered illustration visual variants where the actual component registry supports it. Keep Director-owned semantic choices distinct from BrandProfile-owned styling.
  - Offer preview of visual layers/crop and clear warnings for unsupported props, missing asset files, risky licenses, image stretching, insufficient resolution, missing fonts and expensive 3D renders. Use existing services rather than duplicating Zod/approval logic in Vue.
  - Treat 3D/map playback as OPTIONAL: show a rendered frame/MP4 fallback when live WebGL or local browser performance is insufficient, without weakening approval gates.
  - No in-dashboard AI image API calls unless separately approved and implemented; manual asset import is sufficient for this phase.

OUT OF SCOPE
  - No multi-tenant SaaS, accounts, billing, cloud deployment or background uploads.
  - Do not duplicate workflow logic between CLI and UI.

ACCEPTANCE CRITERIA
  - AC-01: One test job can be inspected, edited, rendered and reviewed from local UI with the same backend transitions as CLI.
  - AC-02: CSRF and permission boundaries tested; no remote access by default.

  - AC-03: A user can input a topic/sources, import and validate JSON, choose existing brand/narrator defaults, render and play a narrated draft, and trigger the same reviewed state transitions as CLI.
  - AC-04: Missing audio, unresolved claims or requiresTimingReview are visible and cannot be bypassed by UI clicks.
  - AC-05: Vue/UI path uses server-side validation and verified local-only access.

VERIFICATION
  - API contract tests, key E2E operator path and local-only binding assertions.

  - E2E test with fixture video and source bundle, invalid JSON, missing audio, stale approval, CSRF/origin and path traversal handling.

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 12. The next planned phase is Phase 09; do not implement it now.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
