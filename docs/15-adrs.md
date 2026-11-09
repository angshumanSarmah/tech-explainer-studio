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
