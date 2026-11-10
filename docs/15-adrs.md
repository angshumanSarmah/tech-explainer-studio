# 15 — Architecture decision records

Each ADR records a **proposed settled decision** as of 2026-11-06. Revise by adding a new ADR, not silently changing history.

## ADR-001 — New independent repository, not a fork

**Status:** Accepted for implementation planning.  
**Context:** `darkzOGx/youtube-automation-agent` has scheduling, approval, analytics, and publishing, but its default video path is a slideshow/provider workflow; user's `phi-video-gen` screenshots show a more relevant typed script + render workflow.  
**Decision:** New `tech-explainer-studio` repo. Extract only concepts, and authorized code if licensed.  
**Consequences:** More P0 setup; avoids dragging in general channel-operation features and keeps ownership/compliance clear.  
**Revisit when:** audited upstream modules offer clear net benefit and rights are confirmed.

## ADR-002 — Three stages, not twelve independent agents

**Status:** Accepted.  
**Decision:** Content Director (LLM-assisted), Video Producer (deterministic services), Publisher (explicit APIs).  
**Consequences:** Fewer failure boundaries, simpler observability; research/technical review can still be independent checks without separate autonomous processes.

## ADR-003 — Versioned VideoScript as system boundary

**Status:** Accepted.  
**Decision:** Strict Zod-validated v1 JSON; no arbitrary code from LLM.  
**Consequences:** Visual breadth limited to registered components; improves repeatability, security and cacheability.

## ADR-004 — Remotion-first animations

**Status:** Accepted for P0.  
**Alternatives:** Manim, Blender, GSAP/Canvas, generic AI video.  
**Decision:** TypeScript/React/Remotion + SVG for moving mechanism diagrams; Canvas/Three.js optional.  
**Reason:** Matches developer's stack, declarative frames, testable props, reusable components.  
**Trade-off:** Premium custom graphics take engineering time. Check Remotion current organization/business license before commercialization.

## ADR-005 — DeepSeek primary; local provider optional

**Status:** Accepted.  
**Decision:** Provider abstraction; DeepSeek for content drafting, Ollama for offline/fallback after human opt-in.  
**Trade-off:** DeepSeek API is not free; provider differences require output/eval tests. Never send private/proprietary content without authorization.

## ADR-006 — Kokoro local narration

**Status:** Accepted for prototyping.  
**Decision:** Local Kokoro with reproducible voice/runtime and pronunciation overrides.  
**Trade-off:** Technical acronym quality and multilingual support may require review or future provider changes; inspect runtime/dependency licenses.

## ADR-007 — SQLite + local files for MVP

**Status:** Accepted.  
**Reason:** One-machine workflow, crash recovery, easy backup, minimal operating costs.  
**Revisit when:** several render machines or simultaneous users require distributed coordination.

## ADR-008 — Approval-bound and private-first publishing

**Status:** Accepted.  
**Decision:** Multi-axis human review bound to video hash; upload explicit `private`; no autonomous public posts.  
**Reason:** Technical accuracy, rights, and platform safety. YouTube's November 2026 API behavior no longer guarantees private for omitted privacy field.

## ADR-009 — Learn from style, not content replication

**Status:** Accepted.  
**Decision:** Visual approach inspired by moving systems/diagram storytelling from screenshots; no copying videos, scripts, colors, logos, sound or content ideas.  
**Content:** Build Your Own X, system design, technical documentation and original prototypes.

## ADR-010 — No dashboard until a working end-to-end CLI

**Status:** Accepted.  
**Decision:** First prove schema → local TTS + animation → playable MP4 → approval. UI is P2.  
**Consequence:** Less early demo polish but faster validation of core value.

## ADR-011 — Local Kokoro ONNX worker and seeded narration

**Status:** Implemented in Phase 03, 2026-11-10; refines ADR-006 within the approved local-audio boundary.

**Decision:** Keep one TypeScript package and use `kokoro-onnx==0.6.1` in a local Python 3.12 environment, with a hash-pinned dependency lock and explicit local model/voice hashes. A fixed packaged Python worker takes bounded JSON stdin; no source text enters a shell or command arguments. CPU-only inference has explicit wall/CPU/thread/file/output bounds. TypeScript validates PCM and ffprobe duration before accepting per-scene WAV/metadata. The explicit mock emits labeled tones, never replacement speech.

**Reproducibility:** An unseeded rerun changed duration despite identical recorded settings. Record a seed in versioned voice settings and seed ONNX Runtime/NumPy before constructing the inference session. Fresh source and compiled runs are compared locally; no cross-platform byte identity is promised.

**Trade-offs:** Python plus local weights are optional setup requirements for real speech; POSIX resource limits and pinned macOS arm64/Python 3.12 dependencies need verification elsewhere. The selected int8 graph rejects fractional rates instead of silently rounding. Health verifies files/imports/voice, while a real smoke validates graph compatibility. Hard RAM/network isolation, persistent recovery, word alignment and narrated assembly are outside this slice. No remote/paid provider or model download is added to runtime/tests.

## ADR-012 — Measured scene timelines and review-only caption fallback

**Status:** Implemented in Phase 04, 2026-11-10, within the requested producer boundary.

**Decision:** Keep 24 kHz PCM narration as the saved input to render-only execution. Revalidate its WAV/text identity and ffprobe duration. At 30 fps, scene frames are `ceil(max(samples / 800, authored_min_seconds * 30))`; starts are cumulative integers, and exact sample padding contains only fractional-frame slack and authored minimum holds. Reject speech exceeding the authored maximum rather than truncating or retiming it. Preserve the original script and silent renderer.

**Alignment:** Consume explicit reviewed word/sample timings bound to the exact WAV and original text hashes. Phrase cues require these timings and unique anchors. No new aligner/model is installed. A CLI opt-in scene speech-span fallback can produce an unapproved preview by displaying the complete scene narration across measured activity; it invents no word positions and blocks strict timing checks. Caption overrides also require review. Both SRT and the browser-safe overlay use the same global frame intervals; source narration/visual text remains literal data.

**QC and evidence:** Use the existing local Remotion/bundled FFmpeg tools, a reserved caption band with collision/bounds checks, and independent final stream/frame/duration inspection plus AAC decoding and per-scene signal checks. Tests deliberately mute the assembled AAC and reject it by scene. Output is finalized only after checks, and manifests record artifact/model/tool/source-code hashes, starts, holds, cue frames, missing source provenance and human review limitations. Constant DC and clipping are checked/reported separately from audible activity; no automatic cleanup conceals the user's outstanding voice-quality feedback.

**Trade-offs:** Full-scene fallback captions are coarse and need listening/phone review; progress cues retain their authored scene-relative meaning even during holds. No claim of forced alignment, perfect intelligibility, automatic approval or cross-platform byte identity is made. `--strict` is a media check, not a release/publication gate. Source collection, durable jobs/cache, approvals and publishing remain later phases. No new paid/remote service, model download or major architecture change is introduced.
