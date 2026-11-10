# Phase 09 — Private YouTube publishing from approved branded release

**Goal:** Upload one explicitly approved release privately to YouTube, reliably recording API status and avoiding accidental duplicate uploads.    
**Stage:** First safe distribution    
**Roadmap mapping:** Phase 4 — Publisher / YouTube    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt only after **Phase 12 (and phases 07–08)** has been verified in `PROJECT_STATUS.md` (and required prior phases remain complete). Revised next phase: **Phase 10**.

```text
You are implementing Phase 09 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/08-publisher.md
  - docs/07-workflow.md
  - docs/09-data-and-api.md
  - docs/11-security-and-legal.md

GOAL
Upload one explicitly approved release privately to YouTube, reliably recording API status and avoiding accidental duplicate uploads.  

IMPLEMENTATION WORK
  - Implement YouTube Data API OAuth integration with minimal scopes and local secure token storage.
  - Explicitly force private visibility on every MVP upload; do not accept public/unlisted flag in this phase.
  - Bind publication request to exact approved hashes, destination and idempotency key.
  - Persist outbox intent before upload; reconcile uncertain failure against records/remote status before reattempt.
  - Implement `publish youtube --job ... --privacy private` with dry-run and explicit confirmation.
  - Derive metadata from approved script/release, using measured chapter timestamps where applicable, no workplace PHI/Jira tags.

ADDITIONAL V4 REQUIREMENTS — INTEGRATE PHASE 05/06 CONTRACTS
  - Read current approved ReleaseManifest and Phase 06 BrandProfile identity; publish the approved final media artifact only, with exact asset hash, matching reviewed metadata and source attribution notes.
  - Use reviewer-approved title/description/tags/thumbnail. AI may suggest metadata, but generated suggestions cannot bypass approval or be uploaded without explicit review.
  - Validate audio/video streams and safe-zone/caption QC for the release target; preserve publishing audit with job, brand, media hash, destination, idempotency key and remote video ID.
  - Bind the publish request to approved target account/channel and exact private visibility. Never infer approval from a dashboard button press alone; recheck the service gate server-side.
  - This phase follows Phase 12 in the revised execution order; avoid depending on a future Phase 13 collector.

OUT OF SCOPE
  - No automatic public uploads, scheduled campaigns, artificial views or paid ad tools.
  - No real network upload in automated tests.

ACCEPTANCE CRITERIA
  - AC-01: Mocked adapter receives private privacy status only after exact-hash gate passes.
  - AC-02: OAuth errors, retryable failures and uncertain upload outcomes are differentiated.
  - AC-03: A manually approved private upload can be verified from the returned video ID and remote status.

  - AC-04: No upload when approved brand, narration, MP4, thumbnail or metadata hashes differ; the dashboard and CLI both hit the same eligibility gate.

VERIFICATION
  - Fake API integration with success, 401, 429, timeouts and duplicate uncertainty.
  - Optional user-authorized real private upload smoke test.

  - Test private-only uploads for imported and automated script origins, hash mismatches, stale thumbnails and missing audio, all with mocked API.

LIKELY AREAS (inspect current repository before creating them)
  - src/publisher/youtube/
  - src/cli/
  - tests/publisher/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 09. The next planned phase is Phase 10; do not implement it now.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
