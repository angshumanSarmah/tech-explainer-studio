# 00 — Vision, goals, and boundaries

## Product thesis

Tech Explainer Studio is a **local-first, approval-first creator tool** for producing high-quality educational animations from computer-science source material. Its differentiator is **visible causality**: an identifiable object (request, packet, tree node, queue item, memory block) persists through a system's transformation rather than being replaced by unconnected slides.

### Audience

- **Creator/operator:** one engineer comfortable with TypeScript, Node.js and tool automation; starting on a Mac with Apple Silicon.
- **Viewer:** aspiring developers, CS students, curious engineers and system-design learners. Beginner-friendly voice with precise follow-up links.
- **Future contributors:** collaborators who build and review animation components, possibly without access to LLM keys.

### Channel editorial promise

1. Explain **WHAT**, **HOW**, **WHY**, and **HOW TO** for technical concepts.
2. Use GitHub repositories **as discoverable sources and inspiration**, not as auto-licensed script/animation copy.
3. Show one central mechanism per short; move detailed implementation to separate videos, an article, or original companion GitHub code.
4. Identify simplifications, version assumptions, nonstandard examples, and uncertain claims.
5. Make every final clip understandable **with sound off**, through concise labels/captions.

### Proposed initial series (not fixed quotas)

| Series | Example | Main animated primitive | Source class |
|---|---|---|---|
| How it actually works | How does HTTP handle a request? | browser → packets → server | RFC / MDN |
| Build your own X | Build a tiny HTTP server | accept → parse → route → respond | own code + referenced tutorials |
| System design explained | How does a URL shortener scale? | lookup, cache, DB | engineering papers/diagrams |
| Under the hood | How does Git store a commit? | blobs, trees, hashes | Git docs |
| Why this design | Why use a message queue? | arrival burst → queue → worker | official docs |
| Data structures visualized | How does a B-tree index search? | pointer traversal | database docs |

### Goals (MVP)

- Generate a source-backed, mechanically accurate first explainer.
- Render a complete **vertical** clip and editable `VideoScript` with reproducible assets.
- Support script edits and *scene-only* rerender without repeating unaffected AI/TTS work.
- Provide an explicit **human approval** step and private YouTube upload option.
- Keep compute and LLM token spend observable and bounded.

### Non-goals (MVP)

- General-purpose text-to-video / unlimited prompt-to-3D generation.
- Clone or restyle DevMonk's existing videos, brand, or copyrighted assets.
- Scrape copyrighted tutorials wholesale or claim a company's private architecture is verified.
- Autonomous public publishing; automatic Instagram API workflows; paid engagement.
- Enterprise multi-tenancy, collaboration roles, cloud Kubernetes, affiliate tracking.

### Success signals

1. A validated clip explains a real mechanism correctly, with all substantive claims sourced.
2. Rerunning from a locked VideoScript produces a functional MP4 **without LLM calls**.
3. Fixing one scene does not invalidate narration/caches of unrelated scenes.
4. Publishing cannot occur without explicit approval tied to the exact output hash.
5. Creator can produce three different topics using one or more **reused visual primitives** rather than hand-writing every scene.

### Constraints and assumptions

- Individual or small-team local development; no cloud architecture presumed.
- Public content primarily English at launch; voice/language configurable later.
- Vertical 1080×1920, 30 fps default; keep export profiles configurable.
- DeepSeek is paid usage, optional; fully offline operation uses Ollama with greater review burden.
- Existing PHI/Jira/Confluence/Figma code/screenshots may be employer property. Never place them in this repo without written authorization.
