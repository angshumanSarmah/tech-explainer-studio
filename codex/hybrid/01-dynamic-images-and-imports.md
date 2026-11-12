# H1 — Topic-aware image resources, imports and common paid-media approval service

**Prerequisites:** human-reviewed 11D implementation, actual Phase 11 VisualAsset infrastructure, Phase 07 job/cache/receipts, Phase 08 rights/release gates, accepted Hybrid C architecture. This is a new bounded workstream, **not** a historical phase rerun. Inspect real code, diffs and contracts first. STOP if the current VideoScript/asset architecture conflicts with the accepted ADR rather than inventing a parallel schema.

## Goal

From a real 11D AI resource proposal, allow operator to choose existing approved asset, upload a file, or generate a **new topic-specific illustration** using one configured provider (hosted OR local if actually supported). Freeze and validate the asset before compositing it with the **existing** Producer and applying its existing review/cache controls. This must not require a developer to build a per-topic React component.

## Implement in manageable slices

A. **Audit/reuse current assets.** Inventory VisualAsset record, `LayeredAssetScene`/registered asset-backed components, asset staging, storage, ReleaseManifest, job receipts and service methods. Implement the smallest missing import/resolution path. First prove user PNG/JPEG/WebP import from a safe local location with correct MIME/magic, bounds, dimensions, raster safety and storage containment. Existing SVG sanitization/rasterization restrictions apply. No arbitrary source-provided remote URL embedded in render props.

B. **Typed request/status.** Take proposed `AssetNeed` (or existing equivalent) with purpose, scene, required animation, output spec and allowed image media type. Reflect `proposed → consent_pending → in_progress → validated → rights_review_needed/approved_for_use` or actual existing statuses. Do not force a separate database if Phase 07 can persist it. A draft may remain blocked until the asset is available. Plain generated still is not automatically a separated layered rig: only animate layers that actually exist and have supported transforms.

C. **Shared Preview Before Spend (image first).** Before any **paid media** call, show storyboard, each asset brief, chosen provider/model, dimensions/options, quoted/estimated price including attempts, current total, max cap and cheaper/manual/registered alternatives. Human approves selected immutable plan items. Bind approval to canonical digest, exact model/provider/config and budget ceiling. A modified or resumed plan needs fresh approval as appropriate. Atomically reserve budget across concurrent jobs/retries; never exceed authorized max, including charged failures. If upper bound is not safely enforceable, block or explicitly re-authorize. This approval service is reusable by H2; don't implement a second service later. Director LLM calls remain separately pre-authorized.

D. **One real provider.** Add one validated image-provider adapter consistent with established project patterns. It may be a hosted API with credentials or a demonstrably working local generator; optional other providers are placeholders/disabled until implemented. No hardcoded prices without source/date/version; record estimates vs provider-observed usage separately. Pin provider/model/options in receipts. Explicit operator permission for any live paid test; mocks are not live-quality evidence. Check provider terms and consent for sending source-derived prompts.

E. **Freeze assets before rendering.** Store hash of actual bytes and metadata, provenance (human prompt/AI prompt hash, provider/model/version/options and timestamps), rights review status, usage restrictions, approval receipt and asset dependency in job. Render a scene using the real existing asset-backed registered handler(s), appropriate cropping/depth/parallax supported by the actual engine. Avoid regenerating assets during frame rendering or on cache replay.

F. **Failure and edits.** Failed request can retry only within original approved attempt/cost limit. Users can supply replacement image, choose a different approved provider (with new consent) or retain an honest limitation. Asset replacement invalidates correct render/release dependencies; unchanged audio work should reuse permitted cache results.

## Tests and demos

- Manual media import → verify bounds/hash/rights/asset reference → actual narrated MP4 using existing compiler; no code change for an unrelated second topic.
- Mock provider: consent denied, modified prompt/model/price, stale approval, over-limit retry, concurrent budget reservations, duplicate submission/resume and cancellation all fail safely.
- If authorized: actually produce **at least one** original image through the configured adapter and inspect it, its metadata, and the final rendered MP4. Explicitly mark provider test unavailable if not configured.
- Validate security of malformed/non-image/oversized/active SVG/path-traversal inputs; version/catalog parity; Phase 08 rights and exact-hash invalidation; deterministic re-render from frozen bytes; no fresh charge on replay.
- Human review: is the imagery technically misleading, composition readable, source/usage rights adequate, appropriate for 9:16? Test results cannot self-approve these.

**Out of scope:** AI video clips, true GPU 3D, arbitrary external media fetching, image-generation business logic in Vue, a universal layer/rig generator, multiple provider integrations, autonomous purchase/permission. **STOP for human review; do not begin H2/12.**
