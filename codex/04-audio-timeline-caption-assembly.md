# Phase 04 — Measured timeline, subtitles, assembly and media QC

**Goal:** Render the HTTP fixture as a narrated H.264/AAC vertical MP4 with synchronized captions, manifest and independent QC.    
**Stage:** First end-to-end offline video    
**Roadmap mapping:** Phase 1 — Contract and offline render / complete video    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 04 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/03-contracts.md
  - docs/05-video-engine.md
  - docs/07-workflow.md
  - docs/12-quality-and-tests.md
  - docs/16-example-http-server.md

GOAL
Render the HTTP fixture as a narrated H.264/AAC vertical MP4 with synchronized captions, manifest and independent QC.  

IMPLEMENTATION WORK
  - Compose scenes according to measured per-scene WAV duration plus approved holds; convert to integer frames with one clear rounding policy.
  - Implement frame timeline, phrase-cue alignment with explicit ambiguity/missing-anchor errors, no equal-per-scene chapter guesses.
  - Generate SRT and caption overlay with safe area, using actual timing/aligner or explicitly reviewed deterministic fallback flagged for review.
  - Mux narration and video using FFmpeg and generate final manifest with artifact hashes, exact source versions and scene starts.
  - Validate 1080x1920, 30fps, H.264/AAC, stream count, nonzero duration and tolerances via ffprobe.
  - Add render-only CLI documentation and deliver an HTTP explainer preview.

OUT OF SCOPE
  - No AI research or publishing.
  - Do not hide caption inaccuracies, clipping or incomplete scenes with silent placeholders in release mode.

ACCEPTANCE CRITERIA
  - AC-01: The HTTP fixture outputs playable narrated MP4, captions.srt and a manifest with exact measured timelines.
  - AC-02: No clip is silently missing; captions are inside video duration and legible on mobile.
  - AC-03: Re-running from saved fixture does not call DeepSeek.
  - AC-04: Failures of ffprobe/FFmpeg or cue alignment produce scene-specific diagnostics.

VERIFICATION
  - Integration test with mock narration WAV and FFmpeg installed.
  - Media QC report and manual playback checklist.
  - Deliberate bad caption timing and silent-audio cases block release.

LIKELY AREAS (inspect current repository before creating them)
  - src/timing/
  - src/media/
  - src/render-manifest/
  - tests/integration/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 04.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
