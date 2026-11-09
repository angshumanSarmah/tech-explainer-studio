# 01 — Product requirements document

## Problem

Creating a technically accurate, high-quality Short currently requires topic research, source checking, scripting, bespoke scene animation, voice timing, assembly, review, and publishing. Unstructured LLM pipelines hallucinate system mechanisms, drift visually, and cannot repair a scene without redoing the whole video.

## Primary user journeys

### UJ-01 — Generate from concept (P0)

Creator enters `How does an HTTP server work?`, chooses `technology-explainer`, language, audience, vertical profile, and budget. System researches sources and outputs a **draft** with citations, claims, visuals, and a previewable VideoScript; it does not publish.

### UJ-02 — Generate from source (P0)

Creator supplies a specific `build-your-own-x` link or original GitHub documentation. System identifies the actual target repository, records the exact URL, revision/commit where possible, license, permitted uses, and extracts key concepts. It creates **original** explanations—not summaries passed off as original implementation.

### UJ-03 — Fix script (P0)

Creator changes a fact or narration line; claims and timings are reevaluated; affected scenes are marked dirty. Unchanged scenes remain cached.

### UJ-04 — Repair an animation (P0)

Creator edits scene parameters or selects another registered visualization component; a single clip rerenders, then the video is assembled without new research/LLM calls.

### UJ-05 — Narrate and assemble (P0)

The producer synthesizes per-scene Kokoro narration, determines measured audio length, fits visuals and captions, validates export, and creates final MP4 and review report.

### UJ-06 — Approve and private-upload (P1)

Creator reviews sources, script, rights, video and metadata; records approvals linked to output hash; opts into upload. Upload uses explicit `private` default and stores YouTube ID/status.

### UJ-07 — Monitor performance (P2)

Creator sees impressions/views, retention where authorized/available, and completion/save/share signals provided by native platform analytics. Missing metrics display **unavailable**, never 0.

## Functional requirements

| ID | Priority | Requirement | Acceptance |
|---|---|---|---|
| FR-01 | P0 | One URL or topic as input | CLI `plan` accepts topic/URL, rejects malformed URL |
| FR-02 | P0 | Source traceability | Each nontrivial claim links to one or more source IDs or is marked unsupported |
| FR-03 | P0 | Structured AI output | Producer accepts only schema-valid VideoScript v1 |
| FR-04 | P0 | Typed scene registry | Unknown scene component/props fails before render |
| FR-05 | P0 | Local TTS | Per-scene WAV audio and duration probes saved |
| FR-06 | P0 | Deterministic renderer | Scenes produced without AI execution or network calls |
| FR-07 | P0 | Vertical output | 1080×1920, H.264/AAC MP4; ffprobe validates media |
| FR-08 | P0 | Versioned scene edits | Scene edits create new script/artifact revision and selectively invalidate cache |
| FR-09 | P0 | Human fact/media/visual review | Review report blocks unapproved publish |
| FR-10 | P0 | Safe execution | Source URLs and generated strings cannot execute shell code |
| FR-11 | P1 | YouTube upload | OAuth, exact artifact approval, private default; persisted upload ID |
| FR-12 | P1 | Thumbnail/caption generation | Local cover frame/SRT or burned captions |
| FR-13 | P1 | Retries and job checkpoints | Interrupted job resumes from last completed step |
| FR-14 | P1 | Cost meter | Track model, tokens, API USD cost estimate, per-video total |
| FR-15 | P2 | Topic discovery/backlog | Rank ideas with manual editorial approval |
| FR-16 | P2 | Web dashboard | Review queue and per-scene preview/repair UI |
| FR-17 | P2 | Instagram publishing | Manual export first; official API only after separate review |

## Non-functional requirements

- **Correctness:** claims/version flags and animation mechanism must agree; human acceptance is authoritative.
- **Reproducibility:** save model name, prompt version, source list with timestamps, script revision, component version, rendering settings and tool versions.
- **Reliability:** retries for transient network errors, max attempts, no duplicate public uploads, atomic file writes.
- **Security:** tokens in environment/keychain only, localhost binding, OAuth least privilege, no private repo/source leakage to LLM.
- **Performance targets (initial hypotheses, tune by measurement):** producer handles one ~60s Short on one developer machine; no hard real-time guarantee. Progressive local preview encouraged.
- **Accessibility:** captions, restrained motion, readable text and no color-only semantics.
- **Maintainability:** profile-based policies; separate prompt text from hard validation; dependency interfaces mockable.

## Release gates

- **Alpha / P0:** one draft and one local video, no upload necessary.
- **Private beta / P1:** two successful different topics, cached rerender, approval, private YouTube test, documented recoverability.
- **Creator release / P2:** repeated quality across ten topics, analytics import, reliable publishing workflow, rights records.

## Explicit unresolved questions

- Whether source-code reuse from `phi-video-gen` is authorized.
- Final channel name/brand/logo and language priority.
- Which Kokoro runtime/voice gives acceptable pronunciation for technical words.
- Whether native captions or burned-in captions should be primary for each platform.
- Whether studio UI is worth building after CLI success.
