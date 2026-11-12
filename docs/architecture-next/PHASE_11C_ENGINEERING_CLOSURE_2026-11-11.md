# Phase 11C engineering closure — 2026-11-11

**Human engineering acceptance — 2026-11-12:** The user accepted Phase 11C as engineering-complete. The engineering review gate is closed. Production quality, factual/source/rights/listening and release approvals remain separate. Phase 11D/12 has not been authorized or started by this acceptance.

**Decision: ENGINEERING GO for Phase 11D, subject to the user's review/start instruction. STOP here.** No confirmed blocking generic engineering defects remain in the supported, tested local execution profile. This is not production-quality video acceptance, factual/source approval, asset-rights approval or release permission. Phase 11D/12 was not implemented.

The latest user instruction separates engineering readiness from manual-video aesthetics. The four topic storyboards were not redesigned. Kafka's frozen JSON, both recorded holdout MP4s and freeze/selection receipts remain byte-identical. This is generic post-experiment correction, not a new holdout success claim. The earlier acceptance report and its failed pixel evidence remain historical records.

## Confirmed generic corrections

- Scene headings fade through the midpoint of the existing 12-frame overlap. The effective heading alphas are max(1−2u,0) and max(2u−1,0), so only one heading is visible. Body content retains the accepted u=k/11 crossfade and held predecessor terminal pose; captions/chrome/progress remain singletons. No global time, scene duration, narration start or caption epoch changes.
- Derived layout/compiler **1.0.1** reserves the largest authored status/image/label space before frame evaluation. Node/status/token text uses 36px type, row nodes 240px width and other nodes 320px. Group captions have a separate footer. Text never silently shrinks; nodes do not resize during state changes. Token lanes account for wrapped labels, with a side lane for column layouts.
- Compiler bounds/clearance validation rejects crowded node/group/path combinations with scene/path diagnostics and explicit alternatives. Browser checks verify actual glyph containment in node boxes and detect text hitting other nodes. Matching also rejects incompatible reserved node geometry. Finite grid is not a general obstacle router.
- Existing Remotion capture is pinned to concurrency 1, parallel encoding disabled and shared-memory capture disabled, retaining the swangle/SVG backend. The profile is recorded in manifests and existing implementation hashes invalidate affected visual caches. Audio implementation/cache identities are unchanged. No engine/package/provider or authoring vocabulary is added.

These corrections affect eight application files, listed in [engineering-acceptance.json](../../output/phase11c/engineering-closure-20261111/engineering-acceptance.json). The VideoScript 1.2.0 schema family remains unchanged, and 1.0.0/1.1.0 branches/drawing paths are retained. Phase 04, source provenance, asset store and Phase 08 gate code were not changed in this closure.

## Evidence-based engineering acceptance matrix

| Area | Decision | Evidence and scope |
|---|---|---|
| Generic composition / actual dispatch | PASS | 11 real React handlers, runtime/schema/catalog tests; compiler/ComposedScene1.0.1; author schema1.2.0 unchanged |
| Multiple topics / common primitives | PASS | Unmodified caching, cloud-transfer and queue JSON rerendered through ComposedScene |
| Existing scripts | PASS | 9 compiled legacy validations, 3 saved historical drafts; 1602 legacy frames exact under aligned capture profile |
| Frozen holdout integrity | PASS (preservation) | Original Kafka input, both movies, freeze and selection records unchanged; no new holdout evaluation claimed |
| Transitions / object continuity | PASS | 341-frame proof covers match, both mixed directions and specialized pair; separate nonzero202-frame handoff inspected; headings never overlap |
| Deterministic rendering | PASS (recorded profile) | 341-frame replay is byte-identical; 1943 decoded comparison frames have zero pixel delta |
| Audio / caption timing | PASS (engineering) | Known timelines/SRT unchanged; measured WAV/decode checks pass; fallback timing/voice/listening approvals remain pending |
| Cache / release dependencies | PASS | Real Remotion cache edits hit both audio entries and invalidate required clips; derived tamper and full Phase 08 tests pass; gates unchanged |
| Unsupported diagnostics | PASS | Crowded layout fails with scene/path/alternative; incompatible pairs/actions remain typed; no fallback |
| Asset-backed composition | PASS (technical) | Existing original document/cloud assets render and preflight; human production rights/quality approval remains pending |

Tools: Node 24.15.0, Remotion 4.0.542, Chrome 157.0.8103.39, pinned FFmpeg n7.1, Inter 5.3.0/font SHA 3100e775…d4c62, macOS/arm64. This is bounded verification under recorded inputs/profile, not universal bitwise identity across browsers, hardware or platforms. No CI/cross-platform result is claimed.

## Actual media and boundary evidence

The new short mechanical regression has **341 measured frames /11.3667s**, real local Kokoro narration and an existing original document asset. It exercises a moving/matched item, readable multiline status, specialized→specialized and both mixed transition directions. Its replay has exactly the same MP4 SHA, compiled plan, timeline and WAVs. A separate unchanged handoff proof verifies nonzero cache→application interpolation, not only a stationary shared ID.

| Artifact | Playback | Frames / duration | Exact MP4 SHA-256 |
|---|---|---|---|
| regression | [MP4](../../output/phase11c/engineering-closure-20261111/regression-a/video.mp4) | 341 / 11.367s | `e10a152a24fba8a3bacd4795552a428e063de34cb2c5ef37818bf4bd3e2ae09d` |
| caching | [MP4](../../output/phase11c/engineering-closure-20261111/caching/video.mp4) | 408 / 13.600s | `52d87275e345c52b41761a7ab71a8bc7b9013760745a976f5256734875ac9c83` |
| files | [MP4](../../output/phase11c/engineering-closure-20261111/files/video.mp4) | 423 / 14.100s | `4d76d681efc9d5745f06a3613db0a00309ea186cdd3b4d13c5bbd2ea2607642b` |
| queue | [MP4](../../output/phase11c/engineering-closure-20261111/queue/video.mp4) | 736 / 24.533s | `2951288e8ba53a9449124cdee68758e0701fb167c87a304d790bfeae9289bf01` |
| handoff | [MP4](../../output/phase11c/engineering-closure-20261111/handoff/video.mp4) | 202 / 6.733s | `3a18d2cf251fd8f78eda8ce878ce2d28619039b73af0af03c513257fae465d44` |
| legacyhttp | [MP4](../../output/phase11c/engineering-closure-20261111/legacy-http/video.mp4) | 1113 / 37.100s | `875daa7df2456179285683ac797842f5828ae923329d934a75a0bdbb2004bcdb` |
| legacycity | [MP4](../../output/phase11c/engineering-closure-20261111/legacy-city/video.mp4) | 489 / 16.300s | `e17b32df91b9752bf0624d15ea01e9c635ccf6adcae0f0ce5840eb8a8a1b6e66` |
| replay | [MP4](../../output/phase11c/engineering-closure-20261111/regression-b/video.mp4) | 341 / 11.367s | `e10a152a24fba8a3bacd4795552a428e063de34cb2c5ef37818bf4bd3e2ae09d` |

All remain approvedForRelease:false and require normal production review. The original document/cloud asset records identify automated-test-harness-only rights review; this technical support proof does not grant human production rights. The new mechanical fixture is [engineering-regression.videoscript.json](../../examples/phase11c/engineering-regression.videoscript.json), not a new educational storyboard or holdout.

Before/during/after encoded mobile frames:

| Boundary | Before | During | After | Finding |
|---|---|---|---|---|
| Matched item / heading B69 | [68](../../output/phase11c/engineering-closure-20261111/review-a/regression-f68-mobile.png) | [74](../../output/phase11c/engineering-closure-20261111/review-a/regression-f74-mobile.png) | [81](../../output/phase11c/engineering-closure-20261111/review-a/regression-f81-mobile.png) | One item remains visible; old and new headings are never superimposed; status stays inside its reserved asset-backed node. |
| Composed→specialized B146 | [145](../../output/phase11c/engineering-closure-20261111/review-a/regression-f145-mobile.png) | [151](../../output/phase11c/engineering-closure-20261111/review-a/regression-f151-mobile.png) | [158](../../output/phase11c/engineering-closure-20261111/review-a/regression-f158-mobile.png) | Body crossfade remains; scene headings fade through without ghosting. |
| Specialized→specialized B212 | [211](../../output/phase11c/engineering-closure-20261111/review-a/regression-f211-mobile.png) | [217](../../output/phase11c/engineering-closure-20261111/review-a/regression-f217-mobile.png) | [224](../../output/phase11c/engineering-closure-20261111/review-a/regression-f224-mobile.png) | Shared transition works across existing registered templates. |
| Specialized→composed B274 | [273](../../output/phase11c/engineering-closure-20261111/review-a/regression-f273-mobile.png) | [279](../../output/phase11c/engineering-closure-20261111/review-a/regression-f279-mobile.png) | [286](../../output/phase11c/engineering-closure-20261111/review-a/regression-f286-mobile.png) | The common primitives and asset-backed node return without overlapping scene titles. |
| Nonzero matched handoff B91 | [90](../../output/phase11c/engineering-closure-20261111/review-last/handoff-f90-mobile.png) | [96](../../output/phase11c/engineering-closure-20261111/review-last/handoff-f96-mobile.png) | [103](../../output/phase11c/engineering-closure-20261111/review-last/handoff-f103-mobile.png) | A single stable Key token interpolates cache→application with a continuous endpoint; heading overlap is absent. |

Full-size/mobile scene poses and B−1/B/B+5/B+11/B+12 frames, plus decoded-MP4 boundary audio excerpts, are retained in [review-a](../../output/phase11c/engineering-closure-20261111/review-a), [review-known](../../output/phase11c/engineering-closure-20261111/review-known) and [review-last](../../output/phase11c/engineering-closure-20261111/review-last). Complete human voice/phone/word-timing approval remains pending; agent image/signal inspection is not that approval.

## Determinism and compatibility controls

All **1,943** compared decoded mobile frames have **zero** pixel delta:341 in the independent regression replay, 1113 for legacy HTTP and 489 for legacy city. No tolerance was widened. The 341-frame replay MP4 is also byte-identical. [pixel-final.json](../../output/phase11c/engineering-closure-20261111/pixel-final.json) records every comparison/hash; detailed frame reports are retained beside the earlier pixel tooling outputs.

Legacy baselines use a saved pre-closure source snapshot with **only capture/encoding settings aligned** to the new profile. Legacy drawing, timing and schema code is untouched in that control; [baseline-profile-control.json](../../output/phase11c/engineering-closure-20261111/baseline-profile-control.json) verifies restoration of the original renderer hash. This separates drawing compatibility from the previously unstable capture profile. It does not relabel the older failed comparisons as passing. The serial profile removes the reproduced failure in these controls; the unique underlying Chrome/compositor cause was not isolated and is not asserted.

Three unchanged topic JSON files rerender through ComposedScene. Their inputs match prior delivered scripts; all five known/legacy render timelines and SRT files are byte-identical to their preceding versions. [timing-preservation.json](../../output/phase11c/engineering-closure-20261111/timing-preservation.json) binds input, timeline, captions, source and final video hashes. The original Kafka holdout is neither modified nor rerendered under 1.0.1; only its integrity/history is verified. New geometry/capture behavior is established by the separate generic regression and common-topic rerenders, not an invented new unseen-topic pass.

## Timing, cache, rights and diagnostics

The shared Phase 04 timeline still owns cumulative integer frames and original WAV samples. Independent final decode/probe, actual WAV identity, SRT and compiled/pacing reconstruction pass. The new mechanical boundaries report 360ms, 366.667ms, 320ms and 346.667ms, below the 500ms trigger. Editorial intent remains unresolved until human review; a below-threshold signal is not a deliberate-pause approval. The existing city 900ms pause is unchanged and still needs human listening/rationale. No speech is trimmed, stretched, rewritten or overlapped. Scene speech-span captions remain explicitly unreviewed; manual reviewed word alignment is supported and tested, while automatic word alignment is not implemented.

The [real-producer cache check](../../output/phase11c/engineering-closure-20261111/real-cache-check.json) uses fresh isolated job state and actual Remotion/FFmpeg. Initial audio-stage misses import supplied saved Kokoro WAVs, not new synthesis. A predecessor role edit rebuilds both clips; an incoming-only edit rebuilds only the incoming clip. Both visual revisions hit both audio caches, with exact original waveform bytes. All three final assemblies independently pass media inspection. Existing complete file/asset/rights identities, append-only review decisions and source provenance remain unchanged.

Full tests still verify factual invalidation for composed visual meaning with unchanged narration, specialized predecessor semantics, rights/attribution and exact pacing receipts. Temporary-copy tampering of compiled/pacing reports is rejected as COMPILED_BINDING_INVALID in [derived-integrity.json](../../output/phase11c/engineering-closure-20261111/derived-integrity.json). No real approval was granted. A crowded-layout negative CLI case returns UNSUPPORTED_STORYBOARD with exact path $.scenes[0].visual.props.entities[1] and roomier-layout/shorter-copy guidance; see [unsupported-layout.log](../../output/phase11c/engineering-closure-20261111/unsupported-layout.log). Unknown/unsafe actions, references and transition pairs retain their typed rejection; there is no silent fallback.

## A. Engineering defects blocking 11D

**None remain confirmed in the supported, tested profile.** Title overlap, confirmed status/box collisions, unstable capture and compatibility concerns have passing current evidence. Validated unsupported layouts are explicit limitations rather than silently accepted malformed output. General integration, platform and performance limits remain bounded by the recorded local configuration; future failures must still fail closed.

Actual commands: npm run typecheck, npm run lint (**154 files**), npm run build and npm test (**247 passed, 0 failed, 0 skipped**) all pass. Current export, actual handler parity, legacy contracts, negative diagnostics, media and real cache checks pass. Complete request data is 81,313 bytes, or 81,404 with feedback, inside the unchanged 98,304-byte data cap. Fixed system/message framing is separately subject to the existing adapter message and spend limits. No paid call or dependency install occurred.

## B. Creative/content limitations for better JSON

Relative diagram scale and whitespace, meaningful progressive disclosure, scene variety, hierarchy, purposeful existing motion/focus, choosing cuts versus crossfades, finite record/copy representations and accurate titles/status/source metadata remain storyboard work. Crossfading unrelated dense diagrams can still mix body content temporarily; the planner must select appropriate transitions. Stable IDs and valid JSON alone cannot certify correct educational meaning.

Kafka's stale caching metadata, weak append-only-log explanation and sole moving record remain known fixture issues, not a new engine implementation claim. Future explicit JSON revisions can distinguish a stored entity from a read-copy entity, retain earlier finite record cells, improve scene selection and correct metadata under normal factual/source review. The user requested no new manual redesign cycle here, so the four topic JSON files are preserved. Phase 11D may attempt better storyboards using registered capabilities; success is not guaranteed and still needs review.

## C. Genuine missing/intentional unsupported capabilities

- Native dynamic append-log containers, automatic offset allocation, runtime cloning/copy actions and semantic storage simulation. Finite explicit entities can illustrate a bounded example, but no log simulator is implemented.
- General graph layout/obstacle routing, arbitrary coordinates/styles/typography, unrestricted camera paths/scale and independent link reveal tracks. Crowded grid routes may be rejected; supported row/column alternatives are explicit, not hidden fallback.
- Arbitrary cross-template object matching. Matched identity is limited to compatible composed primitives/assets/layout/camera/reserved geometry.
- Automatic WAV word alignment. Existing reviewed alignment input is supported; prompts cannot fabricate it.
- True GPU 3D, new shaders/3D engines and runtime generated application code. These are not implemented by SVG depth/layer/camera primitives.

These capabilities cannot be declared implemented through prompting or JSON alone. None is required to silently expand the accepted initial 11C vocabulary for this engineering GO.

## Review boundary

Source SHA: 3f1376a44bb0f31b98a5cd0820e9c815c365572969cf5cae50d71e9fc24732d1. The six protected holdout/ADR artifacts are byte-identical to the pre-closure check; [contracts-and-preservation.json](../../output/phase11c/engineering-closure-20261111/contracts-and-preservation.json) and the machine [engineering acceptance record](../../output/phase11c/engineering-closure-20261111/engineering-acceptance.json) retain provenance and scope.

**ENGINEERING GO, not production-video acceptance.** Source facts, human rights, full listening/mobile/caption quality and exact Phase 08 release decisions remain separate. The user must review this closure and explicitly start any next phase. No Phase 11D/12 implementation, new model integration, source crawling, publication, dependency installation, commit or push occurred. STOP for review.
