# Phase 02 — Remotion vertical silent animation renderer

**Goal:** Render the source HTTP fixture into a coherent silent 9:16 video using original SVG/React components and a registered BrowserRequestFlow animation.    
**Stage:** Deterministic visualization    
**Roadmap mapping:** Phase 1 — Contract and offline render / silent visualization    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 02 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/05-video-engine.md
  - docs/10-visual-system.md
  - docs/20-component-specs.md
  - docs/16-example-http-server.md
  - examples/http-server.videoscript.json

GOAL
Render the source HTTP fixture into a coherent silent 9:16 video using original SVG/React components and a registered BrowserRequestFlow animation.  

IMPLEMENTATION WORK
  - Add Remotion and React with compatible locked versions to the existing package, no extra workspace.
  - Implement 1080x1920 @30fps portrait composition, original palette, readable text, motion tokens and reserved UI safe areas.
  - Implement BrowserRequestFlow visual phases: idle, request, parse, route, response, overview.
  - Make all motion frame-deterministic using interpolations and registered props, no random or network fetch at render.
  - Provide a render-only CLI path that does not load or instantiate LLM clients.
  - Create golden frame PNGs for meaningful frames and a silent MP4 smoke render.

OUT OF SCOPE
  - No paid video generation, Three.js, visual code generated or executed by LLM.
  - No Kokoro integration, subtitles, publishing, job database or polished web dashboard.

ACCEPTANCE CRITERIA
  - AC-01: The fixture produces a playable vertical silent MP4 with expected scenes, dimensions, fps and frame counts.
  - AC-02: No labels overlap the central mobile safe area; browser→server request and response direction are unambiguous.
  - AC-03: The same component visualizes at least two fixture phases via validated props.
  - AC-04: Offline render succeeds without DeepSeek environment variables.

VERIFICATION
  - Unit tests for animation mapping and frame determinism.
  - Golden PNG comparisons and ffprobe media assertions.
  - Run the render twice with pinned inputs and record expected reproducibility limitations.

LIKELY AREAS (inspect current repository before creating them)
  - src/renderers/remotion/
  - src/visuals/BrowserRequestFlow*
  - src/cli/
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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 02.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
