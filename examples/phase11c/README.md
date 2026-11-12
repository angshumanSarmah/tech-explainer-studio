# Phase 11C manual composition examples

These are explicit VideoScript 1.2.0 revisions, not migrations of historical scripts. Every generic example uses ComposedScene and the same finite grammar/renderer. Narration and claims remain subject to human factual, timing, listening and rights review. No LLM is required.

| Fixture | Purpose | Saved local narration used in verification |
|---|---|---|
| caching.videoscript.json | Three-node cache-aside request flow; intentional cut then opt-in crossfades | output/phase11/caching-delivery/narration |
| files.videoscript.json | Asset-backed device/cloud/storage, failure and reverse motion, raised depth and gentle camera | output/phase11/demos-gQdOmK/cloud-sync/render/narration |
| queue.videoscript.json | Producer, waiting work and consumer; six bounded illustrative beats | output/phase11/queue-final/narration |
| boundary-chain.videoscript.json | CacheAsideScene → CacheAsideScene → composed → CacheAsideScene | caching saved narration above |
| matched-handoff.videoscript.json | One stable token moves between compatible composed scenes without duplication | caching saved narration above; first two scenes |
| kafka-holdout.videoscript.json | User-selected after source/grammar freeze; illustrative single-partition append/read/offset | output/phase11c/kafka-narration-revision-2 |

Existing audio is reused byte-for-byte, with explicitly revised authored minimum holds of 2 seconds. Measured WAV duration remains authoritative; speech is never shortened. Caption fallback is review-only. First Kafka revision exceeded the inherited caption layout limit; its retained failed attempt led to a shorter authored narration revision and new measured local Kokoro WAVs, without changing application source or frozen vocabulary.

File/cloud assets refer to the existing immutable local VisualAsset records and bytes originally imported for Phase 11. These JSON references are not self-contained approval grants. On another checkout, use the existing `assets import/review` workflow, review the original example SVG rights, and explicitly update references to the resulting exact record hashes. Do not fabricate records or auto-approve. The local records exercised here identify automated-test-harness-only review; human production rights acceptance remains pending. They demonstrate technical preflight/staging and meaningful document/cloud imagery rather than human publication clearance.

Validate with `npm run studio -- script validate --file <fixture>`. Render using the existing `render --script ... --narration ... --output <fresh-dir> --allow-caption-fallback`; output paths must be new. For a new narration revision use existing local `audio narrate --config narration.config.example.json --script ... --output <fresh-dir> --allow-local-synthesis`. Model installation/download and paid providers are not part of these examples.

The compiler chooses bounded positions/path geometry; author JSON supplies only stable identities, semantic roles, slots and finite cue windows. There are no topic-specific handlers. Camera/depth/layers are modest 2D/2.5D; true GPU 3D, Kafka replication/rebalance/retention simulation, universal layouts and automatic source-guided planning are not implemented. See `output/phase11c/REVIEW.md` and PROJECT_STATUS.md for exact evidence, failures and pending human complete-video/phone review.


`engineering-regression.videoscript.json` is a short mechanical test, not a new educational storyboard or holdout. It exercises a moving/matched item, non-overlapping title changes, readable multiline status inside an asset-backed node, specialized→specialized and both mixed directions. It uses new local measured test narration and the existing original asset record; human production rights remain pending. The four existing topic fixtures are preserved unchanged. See PROJECT_STATUS for the new capture profile and exact engineering evidence.
