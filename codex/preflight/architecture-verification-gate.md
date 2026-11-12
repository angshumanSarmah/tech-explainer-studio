# Preflight B — Repository-evidenced architecture verification and compatibility gate

**Run after:** Phase 11B code is preserved/checkpointed. **Run before:** Any Phase 11C implementation. This is a design/audit gate, NOT an app feature phase.

```text
You are conducting an architecture verification of the EXISTING Tech Explainer Studio repository. Inspect actual source and tests before making any design recommendation. This is inspection-only with a small report and proposed ADR; do not implement features, change APIs, install packages, delete files, create Git commits or push.

USER-LOCKED PRODUCT CONTRACT
- Input: technical topic + ONE OR MORE specifically user-approved sources (official docs, relevant public GitHub references, articles, user notes) + audience/duration/focus + approved BrandProfile.
- Content Director: source-grounded technical claims, coherent explanation and spoken narration.
- Visual Director: outputs ONLY a strict declarative scene composition using available visual elements and catalog.
- Deterministic compiler/renderer: resolves semantic relationships, layout, actions, camera, continuity and measured timeline into existing Remotion/FFmpeg/Kokoro output.
- Bounded planning/JSON repair: validates output; never writes/executes source code, downloads packages, invents sources/claims or self-approves release. User-provided source URL retrieval is explicit and bounded; topic-only autonomous discovery is optional separate Phase 14.
- Existing specialized components remain functional, but are NOT evidence of generic composition. Unsupported visuals must produce clear diagnostic/review-needed outcomes.

REPOSITORY AUDIT — EXACT CODE EVIDENCE REQUIRED
1. Record branch, Git status INCLUDING untracked paths, installed dependencies, actual commands, code/tests. Identify whether 11B is uncommitted and whether pending review assets are safely retained. No deletion/revert/reset.
2. Inspect Phase 01 VideoScript v1 Zod schema and stored fixtures; identify safe extension/migration boundary with exact consumers.
3. Inspect Phase 02 Remotion scene dispatch and layout primitives; determine whether current scenes can compose multiple nodes/objects in ONE scene or only use a component per scene.
4. Inspect Phase 03 Kokoro narration: WAV hashes, word/phrase/scene cue contracts, voice/model/lexicon identity and actual measured durations.
5. Inspect Phase 04 timeline/render/FFmpeg assembly and explain observed abrupt scene changes: cuts, concatenation, background reset, camera reset, audio/caption gaps or other mechanisms. NEVER assert the root cause without code evidence.
6. Inspect Phase 05 source ingestion: multi-URL user approval, GitHub repo file selection/ref pinning, bounded access, SSRF/redirect/DNS checks, claim IDs, rights/provenance, instructions-as-data security.
7. Inspect Phase 06 provider-independent Director, manual contract export/import, prompt versions, BrandProfile and actual runtime registry/catalog parity. Identify reused model adapter interfaces for 11D; never create a second one.
8. Inspect Phase 07 job database/cache: input hashes, resume, scene dependencies, conditions invalidating audio/visual/transition artifacts and source metadata.
9. Inspect Phase 08 exact-hash fact/rights/video/release gates and edit invalidation; code/test completion is not release approval.
10. Inspect Phase 11 VisualAsset/camera/motion primitives and Phase 11B CityDemandHeatmap 2.5D fallback. Distinguish reusable mechanisms from specialized city logic. Do NOT claim true 3D was implemented without source+render evidence.
11. Inspect docs/13-roadmap.md, docs/25-build-phase-map.md, ARCHITECTURE.md and docs/15-adrs.md for historical/current conflicts and point to smallest compatible document edits.

OUTPUT (DO NOT IMPLEMENT FEATURES)
A. One evidence matrix: subsystem, exact existing file/function, actual behavior, v6 needed behavior, smallest backwards-compatible delta, tests, owner-phase (11C or 11D), risk.
B. Decisions to lock: single public VideoScript versioning approach, derived compiled plan boundary, single animation registry and catalog export, one global timing owner, compatible scene continuity protocol, cache/dependency identity, release-invalidation owner, input source scope and optional provider adapter.
C. A narrow first-cut primitive vocabulary and what it CAN and CANNOT express. Avoid claiming it handles every topic or true 3D.
D. Inspect-oriented transition root cause report with actual evidence, not a generic crossfade recommendation.
E. A list of OLD PHASE MODULES that require minimal compatible changes during 11C/11D; no standalone reruns.
F. Risk register: 5-10 highest-impact risks including schema-breaking edits, double timelines, model-driven arbitrary code, untrusted source injection, source rights, registry drift, false visual quality claims, audio caption drift, uncommitted source loss, costly dependencies.
G. A go/no-go recommendation for Phase 11C, including blockers and exact decision items; require human review before implementation.

DO NOT
Run code generators, apply proposed architecture, modify 01–08 implementations, overwrite existing docs/status, automatically install/remediate software, fetch external sources without authorization, use paid API, start 11C/11D, assume any expected source path exists, delete Phase 11B work.

STOP for architecture review.
```

**Important:** The v6 documentation files shipped with the pack are proposals. An audit should compare them to your live repository and merge only compatible, evidenced decisions.
