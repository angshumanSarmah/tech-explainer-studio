# Phase 11C — Generic declarative visual composition, compiler and cross-scene continuity

**Purpose:** Build a reusable semantic scene language from the EXISTING visual engine, a deterministic compilation/timeline layer and deliberate scene transitions. No LLM is required to prove this phase. This is a prospective NEW phase, not a replacement of Phases 01–11B.

**Hard prerequisites:** Phase 11B preserved; existing [architecture audit](../docs/architecture-next/ARCHITECTURE_VERIFICATION_2026-11-11.md) completed; [ADR-019 ACCEPTED in the existing ADR log](../docs/15-adrs.md#adr-019--bounded-composition-and-shared-scene-continuity), with its [detailed amended decisions](../docs/architecture-next/ADR-019-PROPOSED-composed-scenes.md); explicit user authorization to implement 11C; Phase 08 gates preserved. These acceptance/authorization gates were supplied by the user on 2026-11-11. Do not rerun the audit or infer authorization for 11D/12. If the accepted ADR and this prompt conflict substantively, STOP and report the conflict.

**Next:** Phase 11D after acceptance gates and human preview review. Do not implement it now.

**Delta scope:** This is a NEW phase. Do not rerun Phases 01–08/11/11B; modify their modules only for evidence-backed compatibility work owned by 11C.

## Run this phase in Codex

```text
You are implementing NEW Phase 11C of Tech Explainer Studio. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/03-contracts.md, docs/05-video-engine.md, docs/04-content-director.md, docs/12-quality-and-tests.md, docs/15-adrs.md, docs/20-component-specs.md, docs/13-roadmap.md, docs/25-build-phase-map.md, the reviewed repository-evidenced architecture verification report and accepted ADR, and ACTUAL Phases 01–08/11/11B code and tests. Inspect git status/diff before edits.

GOAL
Build a versioned, bounded, declarative generic visual composition path. A human can give different valid data inputs for unrelated technical explanations and get coherent animated videos through the SAME renderer WITHOUT per-topic code changes. Preserve prior VideoScripts and specialized visual templates.

NON-NEGOTIABLE RUNTIME RULES
- No LLM-supplied JS, TS, JSX, React code, arbitrary SVG/HTML/CSS, shader, function expression, script, executable content, unsafe file/network reference or package install.
- No arbitrary topic-name dispatch or new per-topic component generated during production. Existing specialized templates and historical default behavior remain functional; shared opt-in continuity may wrap compatible existing handlers in explicitly revised scripts. Generic composition MUST be first-class.
- Generic != universal. Unsupported concepts produce a structured limitation or truthful, explicitly recorded alternative; no silent title-card downgrade.
- Compile and render deterministic frames from validated data and approved assets; no remote fetch in renderer, real-time physics, nondeterministic clocks or unrestricted user-supplied expressions.
- Inspect actual dependency versions and feasibility before selecting Remotion transition APIs. Do not assume @remotion/transitions or a particular Three/R3F package is installed. New major dependencies require human approval.

A. SPECIFY THE CONTRACT BEFORE IMPLEMENTING
1. Use existing audit evidence and accepted amended ADR-019 for the contract/registry/brand/asset/Director/Remotion boundaries; inspect current state for implementation drift without rerunning the architecture audit. Retain one author-facing VideoScript contract family, one existing Producer and one LLMProvider interface.
2. Write one short decision table mapping semantic visual intent -> validated primitive/layout/action -> derived compiled render instructions. Distinguish: (i) persisted Script/Scene fields, (ii) derived compiled render plan, (iii) output manifest. No duplicate authority for the same timing/brand/rights data.
3. Add strict VideoScript 1.2.0 with bounded `composed` entities, stable IDs, relationships, layout hints and action/cue tracks. Put opt-in boundary policy at scene level so compatible specialized types can crossfade too. Keep 1.0.0/1.1.0 strict branches/defaults/pixels unchanged; no automatic migration. New transitions on historical content require an explicit revised 1.2.0 script. Preserve historical Director draft reads and original prompt/schema identities through version-aware contract handling; do not relabel saved drafts.
4. Separate educational/semantic objects (e.g. producer, worker, data-item, server, generic node) from appearance. Start with bounded node/link/token, labels/status, flat groups and row/column/small-grid hints. This is an initial slice, not final product capability. Reuse approved existing VisualAssets and supported reusable 2D/2.5D motion, depth/parallax and camera primitives under finite registered controls. Require a visually meaningful asset-backed generic composition. Existing specialized scenes remain optional tools, not the primary generic generation path. True GPU 3D remains unimplemented.
5. Use a finite typed action vocabulary: appear/disappear, move-to, follow-path, pulse/highlight, scale, state change, focus/zoom, directional reveal. Implement only small, demonstrable subset first; add others only as acceptance needs justify. Never implement an arbitrary expression/scripting language.
6. Layout choices should be deterministic (grid, row, column, tree/graph where existing capability supports it, spatial 2.5D positions where justified). Let the compiler calculate real screen coordinates with collision/safe-zone checks; any manual coordinates or easing curves must be bounded/validated.
7. Define hard resource limits: number of objects, layers, labels, path vertices, active motions, actions, scenes, duration, nesting depth, image dimensions/rights, per-frame work. Create actionable errors on constraint violations.

B. VISUAL COMPILER AND CAPABILITY CATALOG
1. Implement validate -> normalize semantic refs -> resolve registered layouts/objects/actions -> resolve measured audio cues -> compile bounded frame-state/render plan. Compiler output is a DERIVED artifact, not a competing editable JSON standard. Record compiler version/hash and renderer registry version in relevant manifests.
2. Single authoritative executable registry drives local render handlers, validation, catalog export, examples, finite transition compatibility and UI-facing controls. Test ACTUAL schema/catalog/renderer dispatch parity by exercising handlers; source-text/name comparisons alone are insufficient. Retain title cards and specialized dispatch for older scripts.
3. Allow semantic intent such as 'file moves from A to B' to compile to stable frame positions/paths across supported layouts. All animations are pure functions of frame number and validated properties.
4. Resolve objects to approved BrandProfile appearance and real VisualAsset references; do not allow model-controlled arbitrary colors, fonts, image URLs or CSS except existing specifically authorized semantic tokens.
5. Preserve IDs and relationships that are important educationally, not every implementation detail. If a requested layout/motion/asset is impossible, return typed unsupported capabilities with exact paths/IDs and an honest supported alternative when available.
6. Keep exported catalog/prompt contexts within documented byte/token limits. Check the complete schema/catalog/examples/evidence/feedback request under the existing 96KiB Director request-data cap and adapter-specific limits. Reject oversized inputs actionably; do not omit required restrictions/evidence or widen caps silently. 11D consumes this bounded export.

C. AUTHORITATIVE TIMELINE AND SCENE CONTINUITY
1. Use the audit's existing boundary evidence: hard scene selection, local-progress/entrance-opacity restarts, template-specific continuity and measured WAV/padding/caption gaps. Do not rerun the audit or claim universal background/camera resets. Verify the implemented repair against new real output during this authorized phase.
2. Keep measured Kokoro audio and Phase 04 timing as authority. Resolve speech/cue anchors to global frame IDs. Visual overlaps MUST NOT accidentally overlap narration, clip speech, shorten synchronized audio, create caption flicker or cause A/V drift.
3. Preserve intentional hard cuts; add opt-in bounded basic visual crossfade across compatible scene types INCLUDING existing specialized templates, plus matched-object handoff for compatible composed scenes with stable IDs. Crossfade does not require matching objects. Use the same Remotion composition/local handlers with at most two content layers; no second scene/video renderer. Export compatibility and typed unsupported scene-pair/path/reason diagnostics; no silent cut/fallback on unsupported combinations. Verify specialized→specialized and both composed↔specialized crossfade directions. Matched-object handoff must reject incompatible representations, assets or conflicting actions.
4. Follow ADR-019 fixed-total-frame overlap: initial W=12 at boundary B uses [B,B+W), fitting both adjacent scenes, holds outgoing terminal content and advances incoming content with k/(W-1). Do not subtract W from total frames or alter measured WAV/caption epochs. Draw global captions/progress/chrome once; blend scene-local titles and avoid extra entrance dimming in opted-in transitions. Test local/global frames, bounds and mux end conditions. Preserve Phase 04 as sole time authority; no FFmpeg/UI/Director shadow timer.
5. Make camera focus/position changes purposeful and bounded. Support continuity of compatible objects across scenes without a free-form global state machine or arbitrary code.
6. Maintain safe zones and compositional visual hierarchy on 1080x1920 9:16; graceful handling of crowded diagrams, overlong text, overlapping objects and small labels. Reuse existing visual/asset work rather than redesigning templates.
7. Add Phase 04-owned boundary-pacing diagnostics for EVERY adjacent narrated scene: exact sample/ms activity gap decomposed into outgoing WAV trailing inactivity + explicit padding + incoming WAV leading inactivity, caption-free intervals, input hashes and detector/report identity. Activity detection is not word alignment. Follow ADR-019's initial gap >=500ms review trigger, authored pause mismatches and unexpected decoded-audio discontinuities. Structural QC failures fail; long silence alone is human-review-needed, not automatic failure or deliberate intent. The audited ~900ms city gap is an existing example, not permission to trim it.
8. Listen/watch across every tested boundary and complete real narrated MP4s. Human records deliberate/unintended/unresolved pause intent and rationale; explicit padding is a mechanical contributor, not proof of intent. Unresolved flagged pacing cannot pass quality acceptance. Never silently trim/rewrite/time-stretch WAVs, fabricate alignment, add audio crossfades or shorten measured duration. Any requested repair is an explicit revision/remeasurement with normal cache/Phase 08 invalidation.

D. CACHE, REVIEW, RIGHTS, SAFETY
1. Extend Phase 07 keys using audit evidence. Bind both adjacent scenes' content/handler/terminal-state digests, compiled plan, registry/compiler/compatibility identities, camera/layout/cues/transition, global timing/captions, BrandProfile/tools and asset file+record identities from both layers. Edits to either neighbor invalidate affected boundary consumers, including successor clips/scene-only exports. Explicitly test unchanged valid audio-cache reuse for purely visual/asset/camera/transition changes.
2. Phase 08 owns all factual/media/asset/release invalidation. New visual/continuity meaning must invalidate factual review even when narration and claim IDs are unchanged; test that case. Bind complete render/compiled/pacing reports and final metadata/artifacts, preserving unrelated decisions only where dependencies permit. Models/compiler/tests cannot grant approval.
3. Reuse/extend the existing asset-reference collector and preflight beyond LayeredAssetScene, including both boundary layers. Track portable asset bytes/records, rights evidence and attribution through compiled plan, caches and release inventory; test missing/tampered/unreviewed assets. Keep untrusted source strings out of execution, enforce local IDs/path containment/passive SVG and no rendering-time network.
4. Do not perform paid LLM API requests, publish, push/commit, clone unapproved repositories or install new dependencies without explicit authorization.

E. REQUIRED INTERFACE DECISIONS / LIMITS — DOCUMENT BEFORE IMPLEMENTING
1. Apply accepted ADR-019: additive strict VideoScript 1.2.0 with legacy branches retained, one internal derived CompiledVisualPlan, one executable capability catalog. Scene-level continuity can reference compatible specialized or composed visuals. No extra authoring format, duplicate style/time authority or second renderer. Document boundary examples with exact repo types.
2. VisualIntent may contain named entities, relationships, action sequence, layout *hints* and cue IDs. The compiler owns resolved pixel geometry, path interpolation, text fitting, absolute frame mapping and safe zones. Reject unregistered intent or impossible layouts; it must not call an LLM or source fetcher.
3. Ensure compiled plan is reproducible with identical schema/catalog, assets, brand, measured narration and compiler version. Test serialization/canonical hashes and fixed-frame replay; no rendering results that depend on mutable external state.
4. Explicitly test real multi-scene narration under intentional cuts, specialized/mixed crossfade and composed handoff. Preserve total frames, actual measured WAV timing and caption epoch; inspect real output visually AND audibly at each boundary, with pacing causes/intent recorded separately.
5. Preserve deterministic evidence of unsupported representation (`unsupportedCapability`, path/IDs, viable bounded alternatives), rather than silently substituting a generic title card. A user-requested fallback is a new recorded storyboard revision subject to normal review.
6. Freeze/hash schema/grammar, registry/compiler/renderer implementation and evaluation prompts before selecting the unseen holdout. No application source-code changes between holdout-topic renders, including outside handlers. Do not change vocabulary/prompts in response and count the same run as a pass. Unsupported results are valid coverage evidence.

F. IMPLEMENTATION SLICES — STOP IF EARLIER SLICE FAILS
1. Confirm the implementation review/authorization gate and existing audit's contract/boundary evidence; document only implementation drift and the chosen compatible integration. Do not rerun the architecture audit.
2. Minimal generic scene schema + compiler + two or three common primitives, with a manually authored JSON fixture.
3. Deterministic motion/layout and catalogue export; validation/negative tests.
4. Shared basic continuity for compatible specialized and composed scenes, composed handoff, measured speech/captions and pacing diagnostics; real boundary/QC/cache/rights tests.
5. Three EXPLICIT generic compositions using unchanged source code: caching/request flow, cloud file movement, and a dataflow/queue or Kubernetes scheduling illustration. Include a meaningful approved-asset-backed composition with supported motion/depth/camera, not merely decorated rectangles. Existing 11B city remains a specialized regression/opt-in transition fixture and does not count as generic.
6. Reserve a FOURTH previously unseen holdout example (not used to implement grammar) for review. Test it with unchanged registry/compiler code and the same instructions; don't let a custom hardcoded handler masquerade as composition.
7. Render actual narrated vertical videos and extract before/during/after transition frames; report precise visual deficiencies and manual phone/playback results. Human must review visuals separately from functional tests.

ACCEPTANCE — ALL REQUIRED
AC-01 Old VideoScript 1.0.0/1.1.0 fixtures/defaults/pixels and historical Director draft reads are preserved. New transition use requires explicit revised 1.2.0 inputs; no automatic migration or historical-script edits.
AC-02 At least 3 different technical concepts use ONE generic composed variant, shared primitives and no per-topic source-code changes between runs.
AC-03 A previously unseen holdout topic can be represented using existing generic primitives, or capability gaps are clearly recorded WITHOUT developer adding a new handler. Do not advertise unlimited-topic coverage.
AC-04 Actual schema/catalog/renderer handler dispatch has tested parity; invalid JSON, unknown IDs, loops/budgets, cross-scene refs and unsupported transition pairs fail with typed diagnostics. Complete exported contexts fit documented size/token limits.
AC-05 Compatible specialized→specialized and both composed↔specialized bounded crossfades plus composed stable-ID handoff work through the existing renderer. Intentional/historical cuts remain unchanged; no silent transition fallback.
AC-06 Total frames, measured WAV timing and caption epoch are preserved; real MP4 listening/playback checks continuity. Every boundary has pacing decomposition; flagged pauses have human deliberate/unintended/unresolved findings, with unresolved quality left pending. No silent trimming or fabricated alignment.
AC-07 Both-neighbor boundary invalidation, visual-only audio-cache reuse, complete artifact/asset-rights dependencies and Phase 08 exact-hash gates pass; visual meaning changes invalidate factual review despite unchanged narration.
AC-08 Factual/visual distinction and limitations are documented; no success claim based only on unit tests or isolated stills.
AC-09 Render-only generation uses no network and no executable LLM-provided code.
AC-10 Compiler output and transition timing reproducible from pinned inputs; evidence includes cross-boundary frame/time tests and hash changes when affecting inputs change.
AC-11 Renderer capability limits for the holdout are frozen before selection; both success and honest unsupported results are recorded without post-hoc handlers.
AC-12 At least one composed demonstration meaningfully reuses approved existing assets and supported 2D/2.5D motion/depth/camera. Human real narrated-video playback assesses mobile framing, hierarchy, animation clarity and narration continuity. The initial grammar is not presented as final/universal capability or true GPU 3D.

VERIFICATION
Run real typecheck, lint, unit, schema contract/parity tests, negative security/budget tests, cache/invalidation checks and integration renders using repo-supported commands. Save machine-readable timelines, actual MP4 evidence and selected boundary frames. Review and report mobile readability, transition quality, audio and captions. Document timing arithmetic and performance on actual hardware. If some visual criteria need human approval, leave them pending; do not mark them passed.

OUT OF SCOPE
No Phase 11D LLM orchestration; no paid image/video/voice provider; no arbitrary 3D geometry or unrestricted scene editor; no runtime code generation; no new 3D engine as a prerequisite; no publisher/UI.

AFTER THE PHASE
Update PROJECT_STATUS.md, docs/03-contracts.md, docs/05-video-engine.md, docs/20-component-specs.md, ARCHITECTURE.md and docs/15-adrs.md ONLY for implemented behavior. Export a real schema/catalog package and valid examples. State exact old-vs-new behavior, paths, commands/tests, timing and render evidence, blocking limitations and manual review needed. STOP. Do not implement 11D or 12.
```

**Human completion check:** A new topic using generic composition must work without a per-topic component. Watch the whole video, including scene boundaries, with audio. Reject any result that passes tests but still looks like a series of disconnected title cards.
