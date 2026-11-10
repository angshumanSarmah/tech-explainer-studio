# Phase 11 — Advanced 2D/2.5D visuals and visual asset pipeline

**Goal:** Prove the engine generalizes beyond HTTP with visually distinct, technically correct reusable animations.    
**Stage:** Visual reuse and topical breadth    
**Roadmap mapping:** Phase 5 — Channel-scale refinement / animation components    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt only after **Phase 08** has been verified in `PROJECT_STATUS.md` (and required prior phases remain complete). Revised next phase: **Phase 12** (or optional **Phase 11B** first if 3D/heatmap is needed).

```text
You are implementing Phase 11 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/20-component-specs.md
  - docs/05-video-engine.md
  - docs/23-90-day-topics.md
  - docs/16-example-http-server.md

GOAL
Prove the engine generalizes beyond HTTP with visually distinct, technically correct reusable animations.  

IMPLEMENTATION WORK
  - Implement EventQueue with explicit capacity, arrival and processing semantics.
  - Implement BTreeLookup with validated acyclic tree and deterministic search traversal.
  - Implement HashObjectGraph for Git blob/tree/commit relationships with illustrative labeling.
  - Implement CodeTrace with bounded reviewed inputs and zero execution of supplied code in render process.
  - Add one fixture/test per component, updated component registry, mobile golden frames and a small set of complete 30–60-second examples.

ADDITIONAL V4 REQUIREMENTS — INTEGRATE PHASE 05/06 CONTRACTS
  - Preserve original EventQueue, BTreeLookup, HashObjectGraph and CodeTrace scope, but prioritize visual storytelling quality, mobile readability and technically meaningful motion, not component count for its own sake.
  - Every component must use the Phase 06 BrandProfile and the same validated scene/cue contracts used by manual ChatGPT and optional DeepSeek Director outputs; no arbitrary inline styling or executable LLM code.
  - Maintain one live authoritative component registry; update Phase 06 animation catalog exports and current external-AI prompt package automatically when components or allowed props are added. Test export/runtime registry parity to avoid schema drift.
  - Provide clear public component descriptions, prop schemas, supported cue anchors and an example VideoScript for each reusable component. Include failure/empty-state examples and visual-safe-zone rules.
  - Build at least three visibly distinct complete 30–60-second demos (HTTP/server, queue/event loop, B-tree or Git graph where relevant), with Kokoro narration, captions and real mobile frame review. Use source-backed accurate behavior and illustrative labeling.
  - Do not implement open-ended AI code generation, arbitrary JS execution, unrestricted 3D or a proprietary competitor's signature layouts.

ADDITIONAL V5 REQUIREMENTS — PREMIUM VISUAL ASSETS AND 2.5D MOTION
  This phase now delivers a SMALL but usable Visual Asset Manager and richer 2D/2.5D visuals. Do not attempt a universal AI image generator or full Three.js city engine here.

  1. Audit existing renderer, scene registry, BrandProfile, media paths, Content Director exports, render manifests and Phase 07 cache before changing interfaces. Preserve existing working rendering/audio.
  2. Add a typed, minimal VisualAsset record for user-imported approved image/illustration assets, with stable ID, file hash, mime type, dimensions, file size, original source, license/usage-rights status, attribution requirements, status and metadata. Use actual application storage patterns and safe local paths. Do not accept arbitrary remote URLs in renderer props.
  3. Support safe local import of PNG/JPEG/WebP/SVG (sanitized or rasterized where SVG security cannot be guaranteed). Enforce allowed extensions AND decoded content type, size/dimension limits, path containment, file naming, and no remote loads. Reject active scripts, SVG foreignObject/external references or other unsafe embedded content. Optional animation formats (Lottie/Rive), 3D models, remote assets or paid generation should stay behind separate vetted adapters; do not silently add all of them.
  4. Use a deterministic, cacheable asset staging/preflight mechanism compatible with actual Remotion bundling: render only reviewed/local and resolvable assets, verify availability before render, and make emitted render manifests refer to hashed inputs. Avoid fragile absolute paths or late missing assets. Never embed user-authored code as an animation.
  5. Add a validated `LayeredAssetScene` (or existing equivalent) with image layers, composition order, aspect-fit/crop, bounded parallax, zoom/pan, soft shadows, depth cues, entrance/exit timing, and caption-safe placement. Animation is a deterministic function of Remotion frame number; the layer is 2.5D, not mandatory GPU 3D.
  6. Add one reusable branded `FileTransfer` or `CloudSync` scene template: document icons/files move between device, cloud and storage with a meaningful upload/download/sync state. It must be technically honest and support on-screen events/cue timing rather than random motion.
  7. Keep the original EventQueue, BTreeLookup, HashObjectGraph and CodeTrace scope and contracts. Refactor only as needed. Prefer excellent finished examples over an unmaintainably broad list of unfinished scene types.
  8. Formalize a typed, versioned, extensible scene visual taxonomy without breaking earlier VideoScript versions: `diagram_2d`, `flow_animation`, `illustration_layered`, `hybrid_2_5d`, and future reserved values such as `map_heatmap`, `scene_3d`. Reserved types must NOT validate as renderable components until registered and proven. An unknown/unimplemented type returns actionable validation failure.
  9. Expose asset requirements and only actually registered scene components through the existing auto-generated Director animation catalog. For external ChatGPT-generated JSON and optional DeepSeek, provide allowed props, semantic visual intent, cue support, fallback options and an example. Do not let the LLM specify arbitrary CSS, JS, raw file paths or network fetches.
 10. Resolve BrandProfile tokens in all asset scenes: fonts, color grading/overlays, caption safe-zone, transition style and logo layers. The Director may choose semantic intent, not arbitrary brand redesign.
 11. Create three finished example videos or scene demos across (a) cloud sync/file movement, (b) event queue/B-tree/data structure, (c) existing HTTP flow. Include visible depth, smooth motion, meaningful animated state change, narration and captions when full example rendering is feasible.
 12. Add media/rights preflight, deduplication, cache invalidation tests, invalid asset/security tests, component registry/schema parity, visual golden frames and render output checks. Do not require cloud image generation to pass Phase 11.
 13. Explicitly leave genuine 3D, map heatmaps, AI image API integration and photoreal assets to a separate optional Phase 11B or future asset provider adapter. Do not pretend layered PNGs are full 3D.

## ADDITIONAL PHASE 11 REQUIREMENTS — PREMIUM MOTION DESIGN AND DIRECTOR QUALITY

### Context

Phases 01–08 have been completed and verified before Phase 11 begins.

We previously generated a 52-second caching video containing 13 `title-card` scenes. Although technically valid, the video looked like an automated presentation rather than a creative technology explainer.

A subsequent 11-second caching motion proof demonstrated:

- Moving request packets
- Cache miss
- Database retrieval
- Cache population
- Subsequent cache hit
- Technically correct cache-aside behavior

This proof was approved as a functional animation demonstration, but NOT as the final visual-quality standard.

**Phase 11 must build on this work and prevent recurrence of the slideshow problem.**

### A. Diagnose and reuse existing work

Before implementing new components:

1. Inspect the previous caching VideoScript and Director-generated storyboard.
2. Inspect the registered Remotion scene components and scene dispatch logic.
3. Identify why the Director selected only title-card scenes.
4. Locate and reuse the successful caching motion proof.
5. Identify reusable motion primitives already implemented.
6. Preserve existing BrandProfile, voice, captions and synchronized audio.
7. Do not unnecessarily rewrite working rendering infrastructure.

Document which problems originate in the Content Director and which originate in the renderer.

### B. Motion design must explain the concept

Visual quality is a primary acceptance criterion.

An animation must demonstrate meaningful technical behavior instead of merely changing explanatory text.

Examples:

**Caching**
- Request travels between application, cache and database.
- Cache miss visibly changes routing.
- Retrieved data populates the cache.
- Subsequent cache hit avoids the database.

**Cloud storage**
- Files move between a local device and cloud storage.
- Upload, processing and synchronization states are visible.
- File movement follows meaningful paths.

**Event queues**
- Events enter a queue.
- Queue occupancy changes.
- Consumers process events.
- Processing and waiting states are distinguishable.

**B-tree**
- Search traverses nodes.
- Active branches are highlighted.
- Unvisited branches remain visually secondary.

The principal subject should undergo visible, purposeful changes during the explanation.

Simple text fades, changing title cards, progress bars and decorative particles alone do NOT satisfy this requirement.

### C. Premium visual storytelling

Create reusable visual techniques supporting:

1. Animated object movement along straight and curved paths.
2. Smooth easing and controlled motion timing.
3. Clear state transitions and visual feedback.
4. Progressive disclosure of technical concepts.
5. Dynamic visual hierarchy.
6. Camera-like focus, zoom and pan effects.
7. Layered compositions with subtle parallax and depth.
8. Branded lighting, shadows and glow where appropriate.
9. Smooth transitions between related visual states.
10. Strong readability on mobile screens.

Avoid excessive labels, debugging indicators and visually repetitive layouts.

The key animated mechanism should remain the visual centerpiece.

Use accurate, original technical visuals rather than copying another creator's proprietary scenes or distinctive designs.

### D. Content Director integration — prevent slideshow output

This requirement is mandatory.

The AI Content Director must know which animation components actually exist and what each component can demonstrate.

Extend the existing Director integration to:

1. Publish all newly registered components through the authoritative animation catalog.
2. Include component descriptions, validated props, supported cues and representative examples.
3. Clearly describe when an animation component should be preferred over a title card.
4. Encourage mechanism-based storytelling for suitable technical topics.
5. Validate generated scenes against actual renderer capabilities.
6. Reject unsupported component names and invalid props.
7. Never silently replace an unsupported animation with a generic title card.
8. Return an actionable unsupported-visual or review-needed state where no valid visual representation exists.
9. Keep manual ChatGPT-generated and automated DeepSeek-generated scripts compatible with the same contracts.

Add Director-level regression tests.

At minimum, verify that a caching-explainer test fixture uses actual mechanism-based animations rather than a sequence of title cards.

Do not introduce arbitrary LLM-generated executable JavaScript or React code.

### E. Visual quality checkpoints

Implement Phase 11 in small, testable increments.

**Checkpoint 1 — Motion primitives**

Create or reuse motion primitives and demonstrate actual frame-based changes.

**Checkpoint 2 — Premium caching example**

Upgrade the existing caching proof with stronger visual hierarchy, larger packets, reduced debugging-style text, smoother trajectories and subtle depth.

**Checkpoint 3 — Cloud/file-transfer example**

Demonstrate files moving between device, cloud and storage using reusable motion primitives and a BrandProfile.

**Checkpoint 4 — General-purpose components**

Implement the original Phase 11 components:

- EventQueue
- BTreeLookup
- HashObjectGraph
- CodeTrace

Ensure technical correctness, valid props and consistent branding.

**Checkpoint 5 — Director integration and finished examples**

Update animation registry exports, Director prompt templates and fixtures.

Generate the complete video demonstrations required by the existing Phase 11 prompt.

These are implementation checkpoints, not separate phases or documents.

### F. Visual quality verification

Technical tests alone are insufficient.

For representative animations:

1. Render real MP4 files.
2. Inspect multiple frames within each animation event.
3. Verify that important objects move or change state.
4. Verify narration-event synchronization.
5. Verify caption placement and mobile readability.
6. Verify consistent branding.
7. Check that diagrams remain technically correct.
8. Confirm there are no unintended static slide fallbacks.
9. Preserve asset-rights review and all Phase 08 release restrictions.
10. Verify playable audio and video streams.

Automated visual checks may confirm motion and geometry, but do not substitute those checks for actual human visual review.

### G. Acceptance requirements

In addition to the existing Phase 11 acceptance criteria:

**AC-06:** The caching example demonstrates meaningful motion and visually improved storytelling compared with the previous proof.

**AC-07:** The cloud/file-transfer example contains visible object movement, layer transitions and meaningful technical states.

**AC-08:** New visual components are available to the Director through the actual exported animation catalog.

**AC-09:** Unsupported animation requests cannot silently become title-card scenes.

**AC-10:** Existing BrandProfile styling, Kokoro narration, subtitles, timing review and release-approval behavior remain compatible.

**AC-11:** The phase includes real rendered demonstrations, representative animation-state screenshots and a human-review checklist.

**AC-12:** The completion report distinguishes technical correctness from visual quality and explicitly identifies any remaining limitations.

### H. Boundaries

Do not implement Phase 11B, Phase 12, publishing integrations or autonomous research.

Do not add paid AI-image services without explicit authorization.

Do not introduce full 3D rendering as part of this phase.

Do not weaken or bypass Phase 08 factual, media-rights or release approval restrictions.

Do not overwrite already approved production assets without preserving their provenance and hashes.

Do not mark generated demonstrations as publicly approved merely because their animations render successfully.

Complete the full existing Phase 11 requirements plus these additions.

Update PROJECT_STATUS.md and relevant architecture/component documentation based on actual implementation.

**Stop after Phase 11 for human visual review.**

OUT OF SCOPE
  - No indiscriminate 3D, arbitrary dynamic JSX, unrestricted code execution or clone of competitor layouts.
  - No daily autonomous content production.

ACCEPTANCE CRITERIA
  - AC-01: At least three additional concepts render through same producer without custom per-topic code paths.
  - AC-02: All props validated and golden visuals reviewed at mobile size.
  - AC-03: Technical invariants tested: queue capacity, B-tree path, Git graph edge validity and code trace bounds.

  - AC-04: Director contract export auto-reflects all registered components/props/cues; unknown names remain rejected.
  - AC-05: Three different explainer demos demonstrate consistent brand identity, readable captions and measurable narration timing, with any timing warnings retained.

VERIFICATION
  - Component schema negative tests, frame snapshot tests and visual sign-off.

  - Add component-contract parity tests, branded golden frames and actual varied topic MP4 reviews where environment permits.

LIKELY AREAS (inspect current repository before creating them)
  - src/visuals/
  - src/domain/visual-registry*
  - examples/
  - tests/visual/

EXECUTION RULES
Implement the smallest coherent changes that satisfy the phase. Inspect the actual code and current git diff first; do not assume planned commands or files already exist. Use small, testable iterations and regression tests. Run the relevant validation, typecheck, lint and targeted tests; do not claim success for unrun commands. For media work, produce and inspect real render artifacts where the environment permits; otherwise report the limitation. Stop and ask before a materially conflicting architecture change, a new paid/remote service, irreversible action, confidential-code import or security downgrade. Do not begin any later phase.
- Maintain strict TypeScript, Zod validation of LLM-generated data, and deterministic render-only execution where applicable.
- Do not run a paid DeepSeek call, live OAuth flow, upload, commit/push, global installation or download large assets unless I explicitly authorize the specific action. Mock outside services for ordinary tests.
- Protect credentials, API keys, copyrighted references, and employer intellectual property. No automatic public publishing.
- Preserve previously working phases. If a safety or correctness invariant conflicts with these instructions, stop and explain the conflict rather than silently weakening it.

AFTER THE PHASE
1. Update PROJECT_STATUS.md: observed phase status, work completed, commands executed and their actual outcomes, artifacts, blockers, and recommended next phase.
2. Update the MAIN ARCHITECTURE.md only if implemented components, interfaces, boundaries or decisions truly changed. Clearly distinguish planned from implemented. Keep docs/02-architecture.md consistent when technical detail changes.
3. Update contract/component/reference docs only when their real behavior changed. Record significant architecture decisions in docs/15-adrs.md.
4. Update AGENTS.md or CLAUDE.md ONLY when a new durable project-wide coding rule is necessary. Avoid accumulating phase logs in agent instructions.
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 11. The next planned phase is Phase 12; do not implement it now.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
