# Phase 11 original review fixtures

These fixtures are unapproved examples, not publishable episodes. Run them through the same `audio narrate` / `render --narration` Producer as HTTP. No provider or paid API is needed. `node scripts/render-phase11.mjs` explicitly synthesizes local Kokoro speech, retains original WAVs, applies the documented constant DC-offset correction with sample/speech-span assertions, binds mechanism progress windows to measured speech activity and renders new exclusive output directories. Supply component example names to run a subset. `http` uses the unchanged root HTTP fixture.

| Fixture | Component | Intended nominal length | Reviewed behavior |
|---|---|---:|---|
| caching | CacheAsideScene | 32s | lookup, miss→app→DB, DB→app→cache, hit with DB idle |
| cloud-sync | FileTransfer | 30s | upload/store, failure without storage, download |
| queue | EventQueue | ≥30s | single consumer, waiting capacity, block/drop, FIFO, empty |
| btree | BTreeLookup | 32s | different search paths, early match, absent key |
| git-objects | HashObjectGraph | 30s | typed commit/root/entry relationships, illustrative IDs |
| code-trace | CodeTrace | 7s scene proof | inert reviewed lines and arithmetic states |

Sources are reference links with explicitly unknown snapshots/hashes and `needs_human_review` claims. Source-backed mechanism choices were checked against Python's queue documentation, Open Data Structures B-tree chapter, Pro Git object chapter, MDN HTTP and the previously saved Redis cache-aside evidence. This is not a new approved evidence bundle. The cloud transfer is an original explicit protocol illustration, not a claim about any storage provider. Technical correctness tests do not approve wording, rights or aesthetics.

`cloud-illustration.svg` and `document-illustration.svg` are original code-native passive geometry, with no copied images, font dependencies or external references. To use your own approved image layers:

1. `studio assets import --file <local image> --metadata <json>`; metadata is `{ "originalSource": "...", "metadata": { "title": "...", "description": "..." } }`. Import starts pending.
2. Save the returned `ref` as JSON. Inspect it with `studio assets inspect --ref <json>`.
3. A human explicitly runs `studio assets review --ref <json> --review <json>` with `reviewer`, `rationale`, `rights` (`original` or `permitted`), `licenseEvidence`, and `attribution: {required, text}`. Keep the new immutable approved ref; the pending record is preserved.
4. Use that ref in LayeredAssetScene's generated catalog example. `studio director export --output <new directory>` includes complete VideoScripts for every reusable library component and the exact props/cue schemas. The LayeredAssetScene catalog example deliberately has zero hashes until real reviewed refs replace them; it validates structurally but preflight must reject missing assets.

Renderer asset storage defaults to `data/visual-assets`. The `--root` asset CLI option supports isolated stores for API/tests; CLI rendering uses the default store. No raw paths/URLs/CSS/code appear in layer props. Native WebP import currently requires macOS `sips`; convert to PNG locally on other systems. SVG accepts only a documented passive subset; unsupported SVGs must be safely rasterized by the operator before import. No automatic external converter/download is run.

Human review must include full listening, pronunciation, phone playback, captions and mechanism timing. Scene speech-span captions are intentionally flagged `requiresTimingReview:true`; artistic mechanism windows do not imply word alignment. Asset import approval is separate from Phase 08 release rights review and exact MP4/metadata approvals. The earlier proof remains preview-only; no file here changes that restriction.
