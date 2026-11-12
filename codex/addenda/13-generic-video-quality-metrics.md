# Phase 13 delta — Measure true cross-topic video-generation quality

**Read alongside the existing `codex/13-analytics-and-launch-readiness.md` when Phase 13 runs.**

Beyond performance and channel analytics, collect reproducible quality metrics for the source-guided pipeline: source ingestion success/claim grounding, unsupported capability diagnostics, semantic schema validity, compile/render success, manual vs automated Director parity, repair attempts and limits, primitive reuse, transition issues, caption/audio timing review, human visual scores and production cost/time.

Evaluate multiple different topics and one *unseen holdout* chosen only after the grammar/prompt/catalog freeze. Do not change source code or topic-specific instructions to pass the holdout. Report unsupported concepts honestly, including topics that cannot yet be visually represented. Distinguish test passing from aesthetic approval and user-signed rights/factual/publication approval.

Phase 13 must not silently start Phase 14 source discovery or perform extra paid model calls.
