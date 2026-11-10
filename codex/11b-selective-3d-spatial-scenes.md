# Phase 11B — Optional selective 3D, spatial scenes and animated heatmaps

**Goal:** Add a **small, deterministic** spatial-visual capability to Tech Explainer Studio for a polished 3D cloud infrastructure or stylized city heatmap demo. This phase is optional; it must not gate ordinary production, local 2D rendering, or the Vue dashboard.

**Run after:** Verified Phase 11 visual asset foundation. May run before or after Phase 12; do not rerun Phases 01–07. Preserve Phase 08 rights and review gates.

## Run this phase in Codex

```text
You are implementing OPTIONAL Phase 11B of Tech Explainer Studio, an independent project. Do not copy proprietary employer or third-party animation source code or imitate a competitor's distinctive signature layouts.

Read AGENTS.md, ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, docs/20-component-specs.md, docs/05-video-engine.md, docs/11-security-and-legal.md, and the actual Phase 06 BrandProfile, Phase 08 approval, Phase 11 asset manager/scene registry and Phase 07 cache contracts. Inspect the real current Git diff and installed package versions first.

GOAL
Prove that one selective 3D or map/heatmap scene can be rendered reproducibly inside the existing Remotion pipeline at 1080x1920, 30 FPS, with branded captions and narration, without losing the existing 2D fallback path.

ARCHITECTURAL DECISION
- Remotion remains the timeline, audio, caption and composition owner.
- For true 3D, prefer the OFFICIALLY SUPPORTED @remotion/three + React Three Fiber integration, but first verify actual package compatibility, Remotion version, available rendering backend and local/CI hardware. Use ThreeCanvas and animation driven by useCurrentFrame(), not real-time useFrame() physics or wall-clock time. Configure renderer/WebGL settings deliberately, including server render where needed.
- Alternative for complex assets: a reviewed local pre-rendered 3D video/transparent image sequence can be composed in Remotion; this is an explicit alternate path, not a new engine.
- Heatmaps should work from a deterministic, synthetic, local spatial dataset. A 2D Canvas/SVG heatmap over a stylized isometric grid may be preferable to expensive full 3D. Only add a Three.js layer when it materially improves the explanation.
- Do not fetch real Uber rider/driver positions, use copyrighted maps, access location data, depend on live tile servers, scrape map APIs or claim demo data is live. Clearly mark the visuals synthetic/illustrative.

IMPLEMENTATION
1. Run a short, documented feasibility probe first: dependency compatibility, available WebGL/ANGLE context, frame reproducibility, performance on target machine, typography/caption layering, and ability to render a small headless MP4. If this fails, implement the best safe 2D/2.5D fallback and report 3D blocked rather than creating broken code.
2. Add only ONE polished, registered template in this phase, chosen by usefulness and feasibility:
   a. `CityDemandHeatmap`: stylized isometric city/grid, fixed roads/buildings, deterministic cells/pulses, moving demo vehicles and a time-dependent density overlay; OR
   b. `CloudStorage3D`: a few branded storage nodes, file transfers and a virtual camera with subtle depth.
   Do not attempt both full implementations by default. Prefer the heatmap proof when a clear visual pay-off exists.
3. Define Zod-validated template props: scene type, camera presets, bounded positions, fixed-size time series/data points, cue anchors, semantic palette roles and asset IDs. Bound object count, polygon/texture size, temporal resolution and scene duration. No free-form GLSL/shaders/code/raw Three.js scene graph from any LLM.
4. Make all motion deterministic from frame index and input; fixed synthetic fixtures, no random values without explicit seed, no network during render, no uncontrolled physics or non-deterministic external GPU output assumptions. For render regressions compare tolerant visual metrics where necessary rather than requiring exact GPU pixel equality.
5. Keep the Phase 11 asset pipeline: hash/cache models, image textures and optional pre-rendered footage, rights/attribution/size checks, approved BrandProfile, and safe paths. Report missing assets before rendering.
6. Provide a branded, mobile-readable overlay and 2D fallback when WebGL unavailable or performance is inadequate. Preserve actual Kokoro narration, captions, audio muxing and timing review.
7. Update the live animation catalog (auto-export), manual ChatGPT Director contract and optional DeepSeek catalog so the new scene is available only when proved renderable. Preserve unknown-component rejection.
8. Document the actual commands and target hardware. Do not promise acceptable render speed without measuring it; record wall time, peak memory if measurable, output duration/frame count, failure modes and fallback availability.
9. Produce one real 10–20s vertical visual test, ideally a short narrated MP4, plus a minimal valid VideoScript fixture. Verify audio/video streams, safe zones, captions and input-hash manifest.
10. Run TypeScript/lint/unit tests, component validation negative tests, schema/catalog parity and deterministic input tests. Test no external network requirement at render time.

OUT OF SCOPE
- No general-purpose scene editor, city-scale 3D engine, photoreal rendering requirement, generation of 3D models from AI, arbitrary Three.js/React code emitted by an LLM, access to real location data, paid map tiles, live internet GPU rendering, autonomous asset scraping, or external publishing.
- Do not implement a new UI dashboard, API-powered image generation or future phases.

DEPENDENCY AND SAFETY RULES
- Inspect existing versions, licenses and platform compatibility before proposing packages. Ask for explicit approval before materially new dependencies, large downloads, paid services or architecture changes under existing project rules.
- Treat assets and external data as untrusted, guard file paths, licenses, texture size and rendering budgets. Do not weaken Phase 08 human approvals.
- Do not run paid DeepSeek calls, OAuth, uploads, commit/push or global installations without explicit authorization.

ACCEPTANCE CRITERIA
AC-01: A registered 3D/spatial template with validated inputs renders a local 10–20s 9:16 test OR a documented safe fallback shows why true 3D is blocked.
AC-02: No remote resources or unlicensed map/3D assets are needed at render time.
AC-03: Verified Director registry parity, consistent BrandProfile, captions, source/asset provenance and optional narration.
AC-04: Reproducible rendering from fixed inputs and explicit preflight/fallback when required graphics support is unavailable.
AC-05: No LLM-generated executable code and no real user-location, rider or traffic data is used.

AFTER THE PHASE
1. Update PROJECT_STATUS.md with actual status, artifacts, commands, outcomes, performance metrics, barriers and next recommended phase.
2. Update ARCHITECTURE.md only for implemented interfaces/decisions; keep docs/02-architecture.md and docs/20-component-specs.md consistent; add ADR only for real significant decisions.
3. Summarize exactly which template was implemented, the fallback, real MP4 path, tests, render cost and safety/rights review.
4. STOP. Do not start the next phase.
```

## Human completion check

Inspect the actual local MP4 on a phone-sized viewer. Look for readable moving data, meaningful movement tied to narration, no stutter/caption clipping and visibly consistent branding. Verify the simulated data is labeled illustrative and no unreleased rights assets appear.
