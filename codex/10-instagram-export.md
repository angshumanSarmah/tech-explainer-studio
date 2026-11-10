# Phase 10 — Branded Instagram Reels export and manual publishing

**Goal:** Produce an editable, reviewed Reels package without Instagram account automation.    
**Stage:** Cross-platform offline handoff    
**Roadmap mapping:** Phase 4 — Publisher / Instagram manual bundle    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt only after **Phase 09** has been verified in `PROJECT_STATUS.md` (and required prior phases remain complete). Revised next phase: **Phase 13**.

```text
You are implementing Phase 10 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/08-publisher.md
  - docs/10-visual-system.md
  - docs/21-channel-launch.md

GOAL
Produce an editable, reviewed Reels package without Instagram account automation.  

IMPLEMENTATION WORK
  - Export existing approved vertical MP4 with size/aspect/codec checks and caption file.
  - Produce an original cover image, suggested caption, credits, source notes and hashtag candidates for manual review.
  - Keep metadata out of platform-native UI overlays; use safe area preview.
  - Write a release bundle manifest and publish checklist, record optional manual-post status in local database.

ADDITIONAL V4 REQUIREMENTS — INTEGRATE PHASE 05/06 CONTRACTS
  - Reuse selected BrandProfile for branded cover, caption styles and placement; test mobile platform-safe zones without assuming identical safe zones to YouTube Shorts.
  - Export the exact approved MP4 unchanged when compatible. If different crops, subtitles, transcoding or cover assets are generated, hash every derivative and require the appropriate fresh review/approval before treating it as publish-ready. Never claim the derived video's hash equals the original.
  - Include approved original captions, source credits, license/rights notes, content origin and resolved brand version in the export manifest; captions/hashtags are candidates until reviewed.
  - The process must remain strictly offline and manual for Instagram account posting; do not integrate automation just to match YouTube.

OUT OF SCOPE
  - No Instagram Graph API automation, paid scheduler, follower/view buying or scraping.

ACCEPTANCE CRITERIA
  - AC-01: Exports contain video, cover, caption copy, subtitle file and manifest; bad aspect or rights blocks export.
  - AC-02: Export makes no external calls. Unchanged approved media retains its hash; any changed derivative gets a new hash and requires fresh review.

  - AC-03: A transcoded, cropped or caption-changed derivative has a new content hash, review state and explicit sign-off; unchanged media retains its original hash.
  - AC-04: Cover/caption use the resolved BrandProfile and follow tested Reels safe zones.

VERIFICATION
  - Filesystem/package manifest tests, video probe checks and manual phone preview.

  - Test original-vs-derivative manifest hashes, approval invalidation, phone-safe preview and no network calls.

LIKELY AREAS (inspect current repository before creating them)
  - src/publisher/instagram/
  - src/export/
  - tests/export/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 10. The next planned phase is Phase 13; do not implement it now.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
