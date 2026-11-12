# Hybrid C — evidence-driven acceptance matrix

Each gate has three independent decisions: **engineering functionality**, **human technical/creative/media review**, **fact/rights/release authority**. A GO in the first does not imply either of the others.

| Area | Proof needed | Negative/holdout verification |
|---|---|---|
| 11C preservation | Legacy 1.0/1.1, 1.2 scripts; unchanged 11B; existing compiler and 24kHz/30fps audio | Pixel regressions, crossfade boundary and cache/review invalidation |
| 11D independent creation | Real newly authored VideoScript from approved sources via configured LLM or plainly labeled offline mock/manual; actual CLI narrated MP4 | Previously unseen topic, no per-topic code, hostile source, unsupported schema, bounded repair |
| Director Kit | ZIP exports real schema/registry/brand/evidence/valid examples, matches engine & can produce importable JSON | Missing/rejected claims, stale kit, privacy-disabled source excerpts, invalid refs |
| Provider configuration | Actual adapter/model choices match available capabilities; manual mode keyless | Unknown model, missing keys, disabled provider, budget exhaustion and cancellation |
| H1 import & images | Real imported image; optional actual generated image from authorized configured provider; freeze output/provenance, stage/render with current VisualAsset handlers | Malicious SVG, mime mismatch, oversized, missing file, invalid rights, hash replacements |
| H1 shared approval | Scene-level plan cost preview, per-item approve/reject, immutable digest + max spend & retries | Changed prompt/model/price, expired approval, duplicate job, concurrency, billed retry over cap |
| H2 video OFF | User can render without video provider and zero newly generated clips | LLM requesting disabled media, toggled off during pending work, provider fallback attempts |
| H2 optional clip ON | One authorized clip generated and inspected if integration is configured; frozen/muted clip composed to existing narration frames | Altered FPS/duration, media audio collision, stale approval, missing clip, failed retries |
| Unified CLI/UI | Same business services and validation; per-stage configuration; import, upload, review, spend status | CSRF/origin/upload attack, stale previews, race between approval and execution |
| Publishing/social/metrics | Exact used media hashes/rights in ReleaseManifest and exports; observed vs quoted charges | New asset bytes or transform must invalidate approval; social export cannot regenerate media |

## Suggested honest first experiment

Choose a previously unseen technical topic with at least **two** genuinely approved sources. Create a 30–45s narration script, 1–2 ordinary declarative technical scenes, one AI-illustrated/layered-or-still scene (after H1), and optionally one short generated clip (after H2 and separate approval). Preview cost **before** each paid media call. The topic is chosen after freezing capability/prompt versions. Compare with fully programmatic mode. Record model identity, exact kit/schema/catalog version, source review status, all job artifacts, provider request receipts (if live), assets, narration, final MP4/frame hashes, human listening/visual notes and unsupported features. Do not hardcode a topic-specific handler.

## What cannot be claimed merely from tests

No fabricated vision assessment by text-only models, no guaranteed technical correctness in AI-generated imagery, no automatic multimedia copyright license, no guaranteed true 3D, no promises of a live model run when only a mock was used, no assumption that Studio is publicly deployable or approved for YouTube posting.
