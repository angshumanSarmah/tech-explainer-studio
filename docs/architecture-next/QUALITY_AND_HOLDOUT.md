# Cross-topic acceptance and visual-quality gate

**Amended under CONDITIONAL GO; final acceptance pending.** Apply [ADR-019](ADR-019-PROPOSED-composed-scenes.md) and the existing audit evidence. These are future acceptance requirements, not claims that 11C/11D or new media tests have run.

## Objective genericity test
- Freeze/hash the semantic schema/grammar, registry, compiler, renderer implementation, prompt templates and executable capabilities BEFORE selecting an unseen holdout topic. Make no application source-code changes between holdout-topic renders, including changes outside the named handlers. A required fix starts a later evaluation cycle and cannot be counted as a pass of the frozen run.
- Render existing known topics: caching/networking, cloud/file transfer and another concept such as message queues or tree traversal. Also render a previously unseen topic using THE SAME generic renderer and **without new per-topic handlers, imports, hardcoded dispatch or manual topic-specific prompt edits**.
- Specialized CityDemandHeatmap may be retained and regression-tested but cannot alone count as proof of genericity. Neither does one renderer with three hardcoded named templates.
- Validate references, claims, resource budgets, path/layout constraints, unsupported capabilities, invalid source injection, asset rights and no code execution. Unsupported intent should show a typed limitation.
- The small node/link/token grammar is an initial slice. At least one generic demonstration must use approved existing visual assets with meaningful supported 2D/2.5D motion, depth or camera behavior to explain the mechanism; a decorative asset or only moving rectangles/arrows does not satisfy this gate. True GPU 3D remains unimplemented.
- Preserve old VideoScripts and historical Director draft reads; execute schema/catalog/renderer dispatch parity tests. Test both-neighbor continuity invalidation, visual-only audio-cache reuse, complete compiled/artifact/asset-rights tracking, and changed visual meaning with unchanged narration invalidating factual review.

## Actual media review
For at least two connected transitions per representative demo, inspect frames before/during/after the boundary; do not infer smoothness from a passing unit test. Include intentional hard cuts, opt-in compatible specialized→specialized and both composed↔specialized crossfade directions, and composed stable-ID matched-object handoff across the suite. Test typed unsupported pairs and excessive duration. Keep historical scripts unchanged; transition demonstrations use explicit revised 1.2.0 scripts. Use the same Producer/handlers and preserve total frames, measured WAV timing and caption epoch.

Watch and listen to complete real narrated MP4s, including the asset-backed composition, on a phone or documented equivalent. Score mobile framing/readability, visual hierarchy, animation/asset clarity, purposeful camera movement and narration continuity. Confirm no duplicated captions/chrome, unexplained dim/re-entry, background jumps, clipped/repeated speech or A/V drift. Separate objective QC, human artistic/factual judgment and final Phase 08 approval; pending human checks remain pending.

## Boundary pacing review

Report every boundary's exact speech-activity gap, outgoing WAV trailing inactivity, explicit padding, incoming WAV leading inactivity, and caption-free interval with input/report hashes. Follow ADR-019 sample arithmetic; activity estimates are not word alignment. Initial review trigger is gap ≥500ms, an authored pause mismatch, or unexpected decoded-audio discontinuity. A threshold flags review, not automatic artistic failure or permission to trim. Structural media failures still fail QC.

The existing audited city gap of about 900ms includes about 597ms explicit padding; retain it as review evidence without asserting that the whole gap is unintended. A human records deliberate / unintended / unresolved and rationale after audible/visual boundary playback. Padding is a mechanical contributor and does not by itself establish intent. Unresolved flagged pacing cannot be scored accepted. Never trim/rewrite/time-stretch WAVs, fabricate alignment or shorten the measured timeline to pass this gate; any requested repair is an explicit revision and remeasurement with normal invalidation.

## LLM evaluation gate
Run the same schema/compiler/Producer for manual JSON and optional provider-authored JSON; no paid provider request without explicit authorization. Test bounded retries with correct source/claim IDs and machine-exported capability catalog, one unseen topic, tampered source text and a disabled-provider workflow. Models cannot grant source, rights or publication approval, and a text-only model cannot claim to watch video frames.

Test normal input with one approved source and with multiple approved sources, existing approved BrandProfile, audience/duration/creative instructions. Repository root/moving-ref cases must produce actionable selection-required outcomes and wait for exact file/revision approvals; initial 11D may accept only operator-supplied commit-pinned file URLs. Test unknown/fabricated paths/commits, unapproved file expansion and the absence of cloning/crawling. Enforce the full 96KiB Director request-data cap, adapter byte/token limits and invocation-wide cost/repair bounds before calls; oversized schema/catalog/examples/evidence/feedback must fail actionably without silently discarding constraints or claims.

Declare unmet conditions rather than tuning a single polished example to appear universally capable.
