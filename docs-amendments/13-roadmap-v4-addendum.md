# v4 Addendum for docs/13-roadmap.md (MERGE, DO NOT OVERWRITE)

This file is a proposed amendment to merge into the **current project copy** of `docs/13-roadmap.md`. It is not the historical roadmap and should not blindly replace existing implementation facts.

## Revised build priorities

1. P0: Phases 00–04 — validated narrated HTTP explainer (already in execution history; do not reset).
2. P0: Phase 05 — safe multi-source ResearchBundle, claims and human review.
3. P0: Phase 06 — **manual external-AI script import plus optional DeepSeek Director**, exported actual schema/animation catalog; consolidate *existing* BrandProfile without redesign.
4. P1: Phase 07 — SQLite persistence, recovery and dependency-aware invalidation, including source/brand/voice revisions.
5. P1: Phase 08 — independently reviewed evidence, rights, audible video, exact artifact and publish approvals.
6. P1: Phase 11 — extend brand-aware, schema-validated animation component registry; render visually distinct technical demos.
7. P1: Phase 12 — local Vue 3 creator dashboard, with guided sources, JSON import, narrator, brand, preview, QC and human approval; no external publishing yet.
8. P1: Phase 09 — **private-only** YouTube publishing of exact approved artifacts.
9. P1: Phase 10 — manual Instagram Reels package, with new approval for derived/resized media.
10. P1/P2: Phase 13 — measured video quality, cost and analytics, controlled launch and honest feedback.
11. P2 optional: Phase 14 — source discovery from a topic, through bounded queries and human approval into existing Phase 05/06 workflow.

**Execution order (retain existing numbers):** `00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 11 → 12 → 09 → 10 → 13 → 14 (optional)`.

## Architectural ownership

- Phase 05: sources, fetched provenance, claim references and review state; supports multiple user-approved URLs and manual notes.
- Phase 06: manual/importable external-AI VideoScript, optional DeepSeek provider adapter, source-bound storyboard generation and central BrandProfile extracted from Phase 02–04 visuals/captions and Phase 03 narration defaults.
- Phase 07: persist hashes/manifest versions and re-render only dependencies that changed.
- Phase 08: exact-hash human approval; no LLM can self-approve.
- Phase 11: visual component library and automatically synchronized Director animation catalog export.
- Phase 12: workflow UI over shared typed services, NOT an independent implementation of approvals or validators.
- Phases 09–10: private upload/manual export, no autonomous public posting.
- Phase 13: measure actual first videos' technical accuracy, visual variety, brand coherence, audio sync, cost, and operator effort.
- Phase 14: optional discovery of sources from a topic, NOT automatic factual approval.

## Exit checks before scaling publishing

- Produce and review three materially different videos (e.g. HTTP request flow, queue/event loop, B-tree lookup), using the same narration/rendering pipeline and BrandProfile.
- Verify audio/video streams, caption readability, cue timing, source/claim integrity and media rights.
- Demonstrate ChatGPT-created JSON import using exported real schema/catalog and optional mocked LLM generation through same validation pipeline.
- Keep final content and publication approvals human-controlled; no bought views or spam automation.

## Migration rule

Do not change the original completion state or declare code implemented simply by merging this addendum. Update roadmap as planning, and mark individual phases done only after observed tests in PROJECT_STATUS.md.
