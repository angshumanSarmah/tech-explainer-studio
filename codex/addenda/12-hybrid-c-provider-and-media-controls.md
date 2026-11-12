# Phase 12 ADDENDUM — Hybrid C model settings, portable imports and media consent

**Read all three together:** existing `codex/12-local-creator-dashboard.md`, existing `codex/addenda/12-source-guided-creator-workflow-v61.md`, **this** addendum. This extends only future UI scope; it never authorizes implementing provider services inside Vue. If H1/H2 are not implemented, show the relevant UI as unavailable/disabled rather than working.

## Creator journey

- Topic, multiple approved source references (with explicit GitHub file/revision selection), audience, BrandProfile, video target and evidence/review states.
- Director mode: **integrated configured model** (provider + model where supported), **external/manual VideoScript JSON upload**, and available local/in-house configured LLM where genuinely implemented. One Director model shared by content/visual is an acceptable first implementation; don't manufacture separate functional selectors without adapters.
- Download current **Director Kit** with exact versioned schema/catalog/example/brand and selectively approved shareable research (redact by default; display privacy warning). Upload external Claude/ChatGPT/Codex `.json`; show field-level schema/capability/claim/asset errors and copyable repair feedback. No dependency on an installed paid LLM.
- Asset mode: existing approved assets, manual PNG/JPEG/WebP (and safely supported SVG) upload, one available image generator, local generator if supported. Display generated-vs-available-vs-needs-upload/approval and linked source/rights metadata.
- Optional video clip generation: independent toggle **OFF by default**. Separate image generation on/off. Provider/model controls reflect implemented capabilities, safe stored defaults and project-level override. Do not let hidden/missing credentials initiate paid calls. Enable/disable controls are enforced by backend API and durable job state.
- **Preview Before Spend** first shows storyboard/asset briefs/clip requests; not fake pre-generated footage. Display each scene's selected method, estimated cost, provider/model/quantity/duration, retries/maximum and cost uncertainty; cumulative authorized cap. Allow individual approve/reject/replace actions; show hashed-plan approval status, refresh stale approvals when configuration changes; explain fallback to programmatic/manual assets.
- Director API costs require separate preauthorized budget before planning. Media approval is distinct from Director planning, rights review, source approval and release approval.
- Review real draft frames/MP4/audio/captions, asset hashes/identities/provider receipts and technical-human-source-rights statuses. No auto-publish or claim of model-based human aesthetic review.

## Technical boundaries / acceptance

- Vue sends typed requests to **existing Node.js services**; never duplicates model orchestration, asset storage, rights, budget calculations, compiler, renderer or job state.
- API tokens/credentials server-side only, source upload privacy explicit; local-only access, CSRF/origin, mime/content sniffing, upload limits and file containment tests.
- CLI-initiated and UI-initiated identical plan with identical selected settings should resolve through the same service/asset/render identities; test disabled/gating state, stale approval and interrupted resumptions.
- Preserve existing Phase 12 source-guided editor, real catalog-derived controls, draft preview and human release distinctions. Unavailable future functionality should be labeled rather than misleadingly selectable.
- Keep UI scoped to a **practical creator workflow**, not a full NLE visual editor. STOP at Phase 12 acceptance.
