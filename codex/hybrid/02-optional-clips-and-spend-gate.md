# H2 — Optional AI-generated clips, controlled by user and composed on one measured timeline

**Prerequisites:** accepted H1 import/asset/approval service; accepted Hybrid C decision; Phase 11C single measured timeline/Producer; 11D source/visual planning. Inspect actual CLI/provider/render contracts first. No code changes to historical phases except necessary backward-compatible integration fixes supported by tests.

## Goal

Add **one** configured short AI-video provider, optional generated footage OFF by default, selective scene-level Preview Before Spend and safe integration with the **same** VideoScript/Producer pipeline. A normal entirely programmatic video must still work with zero video-provider credentials.

## Requirements

1. **Independent user controls.** Backend-enforced `allowAiVideo=false` default, image controls independently configured, provider/model selection only for actually working adapters. Model suggestion never changes a disabled setting. Distinguish *generate new clip* from *use approved uploaded/pre-existing clip*; turning off generation does not imply all user-uploaded media is forbidden. Unsupported provider gives disabled/error state, never a fake working selector.
2. **Scene-level plan.** Director proposes when generated footage adds value, duration/aspect/quality/prompt, narrative purpose, and a deterministic registered alternative. Verify factual claims will remain supported by overlays or exact animations where footage is unreliable. The operator can approve/reject each scene's request and cap generated-video duration share of total, model/provider, max attempts and costs.
3. **Shared approval service.** Use H1's immutable plan hash, selected-item approvals, atomic budget reservations and retry caps. Show provider/model-specific estimated cost, generated seconds, retakes, total and uncertainty. Do not place a paid order until explicit operator approval. Any meaningful change to prompt/model/duration/price ceiling/settings invalidates approval. Failed billed attempts count toward cap; never silently switch vendors.
4. **Adapter and job durability.** Implement one provider adapter with actual capabilities, timeouts/cancellation/polling as supported, failure/receipt categories, bounded retries and persist/recover through Phase 07. No LangGraph requirement or parallel process store. If provider is unavailable, mocks still prove safety but do NOT prove live media generation.
5. **Generated media verification.** Ingest bytes via existing validated asset storage. Check hash, codecs, decoded duration, fps, dimensions, audio tracks, size, path, content safety, provider provenance, terms and rights review. Stage locally before Remotion uses asset; never load unchecked arbitrary model URL during rendering.
6. **Deterministic clip placement.** Integrate footage through **existing renderer's measured per-scene frame allocation**. Define deterministic cover/contain/trim/loop/freeze/hold behavior, safe zones, transitions and sensible missing/short clip failures; clip is muted by default to preserve the measured Kokoro narration and caption authority. No automated TTS stretch, auto-trim of recorded narration, scene-frame subtraction or new FFmpeg-only timing authority. If an accepted VideoScript authoring contract cannot reference media scenes, STOP for versioned-contract review; add a backward-compatible new version with strict validation, keeping 1.0/1.1/1.2 unchanged.
7. **Reproducibility + security.** Freeze provider output once; include output hash and transformation config in scene/transition cache/ReleaseManifest. Re-render never re-generates. Off mode prevents **all newly requested AI video** calls including retries. Media prompt/source privacy requires user consent. LLM/remote provider cannot mark generated clips factually correct, licensed or release-approved.
8. **CLI first.** CLI must allow selecting the OFF setting, listing/approving individual requests and declining expensive clips; implement smallest compatible interactive or staged command workflow. Phase 12 UI will call same services. No hidden purchases or automatic posting.

## Tests / acceptance

- OFF mode: generate complete narrated multi-scene MP4, confirm zero AI-video provider calls and no credentials required; malicious LLM request is rejected.
- Toggle ON but not approved: generated-clip request remains `approval_pending`; no charge even if user clicks ordinary render.
- Selective approval: approve one of two proposed clips, reject another, use an accurate supported visual or clearly block the unresolved scene.
- Changed provider/model/prompt/settings/duration/estimated max → invalidates approval; mocked over-budget retries and concurrent reservations block safely.
- Authorized live generation (only if configured and approved) yields at least one actual clip with documented source, hash and observed media inspection; run through real Producer and listen across boundaries. Mark it NOT TESTED if unavailable.
- Old VideoScript and old video frame comparisons remain intact; exact 24kHz/30fps narration/caption timing and Phase 08 cache/release hash invalidation verified.
- No second scene/timing service, runtime LLM code, content self-approval or new publisher.

**STOP after H2 for user review.** Do not start Phase 12, 09, 10 or 13.
