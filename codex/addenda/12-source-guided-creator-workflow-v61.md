# Phase 12 delta — Source-guided generic creator workflow (v6.1)

**Use with the EXISTING `codex/12-local-creator-dashboard.md`; do not replace that file.** This is the only new Phase 12 delta. Read both when executing Phase 12. Where older Phase 12 instructions describe a hardcoded template picker as the primary creative tool, this addendum takes precedence.

## Scope / prerequisites
- Requires actual accepted 11C generic composer/renderer and 11D source-guided Director (or specifically mark unsupported UI areas disabled). Do not implement these engines a second time inside Vue.
- Phase 11B provides a *2.5D isometric CityDemandHeatmap* and flat fallback, NOT proof of a general GPU 3D renderer. Expose true 3D only if independently implemented and verified.
- Preserve Phase 08 exact-hash rights/facts/video release checks; UI cannot self-approve or publish.

## Required end-to-end local operator journey
1. New project: topic, audience, target length, focus/exclusions, language and BrandProfile.
2. Multiple **user-provided approved source references**: official documents, relevant GitHub file/repository references, technical articles and notes. Show retrieval status, selected repository files/commit when available, snapshot identity, claim/evidence coverage and gaps. Do not imply an entered URL was actually ingested.
3. Choose manual VideoScript JSON import (always supported without LLM API key) or explicitly enabled provider-backed Director generation. Show visible provider/cost consent before any paid API usage.
4. Display the real 11C semantic objects, relationships, motion cues, transitions and approved asset choices in scene revisions; controls derive from the actual executable capability catalog, not hardcoded topic templates.
5. Expose validation/compile limitations and honest alternatives, never a silent slide fallback. Let operator choose a revision and record its new hash.
6. Preview real rendered frames and draft MP4 + narration/captions. Clearly distinguish human review needed from automatic technical checks. Preview failure is not success.
7. Present exact draft revision/source/asset/BrandProfile/audio/video hashes, review statuses, and stale approval invalidation. No upload/public publishing in Phase 12.
8. Render the same script through CLI and Vue using **the same** backend compiler, jobs and review services; test local-only access, CSRF/origin, filesystem containment, source/candidate injection and invalid item reference handling.

## Phase 12 acceptance addendum
- A new topic with multiple supplied sources produces a draft via existing 11D services, can be revised as declarative composition and renders with no per-topic code changes.
- A manual ChatGPT-authored JSON import can complete without provider credentials.
- Unsupported primitives, invalid claim references and attempted script injection fail visibly and safely.
- A transition or audio change invalidates precisely the relevant video approval.
- Human reviewers can inspect narration, captions, actual visual motion and source provenance at mobile size.

**STOP after Phase 12.** Do not build a second compiler in Vue, implement 3D for the sake of UI parity, or begin publishing.
