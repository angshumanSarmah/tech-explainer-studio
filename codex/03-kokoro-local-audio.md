# Phase 03 — Local Kokoro narration adapter and pronunciation

**Goal:** Generate reliable per-scene narration WAV files locally and measure actual durations without requiring any AI API subscription.    
**Stage:** Deterministic audio    
**Roadmap mapping:** Phase 1 — Contract and offline render / local narration    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 03 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/05-video-engine.md
  - docs/12-quality-and-tests.md
  - docs/14-operations.md
  - docs/16-example-http-server.md

GOAL
Generate reliable per-scene narration WAV files locally and measure actual durations without requiring any AI API subscription.  

IMPLEMENTATION WORK
  - Create a `NarrationProvider` interface and offline Kokoro implementation, invoked through a narrowly scoped process runner.
  - Expose model path, voice ID, synthesis rate and resource limits in non-secret config; handle missing model sensibly.
  - Build a technical pronunciation lexicon for HTTP, URL, server, request, response; version voice settings.
  - Return WAV artifacts, checksums, measured duration and actionable errors; preserve per-scene files.
  - Enable a mock narration adapter to allow CI without large model downloads.
  - Provide a health check and explicit local voice smoke command.

OUT OF SCOPE
  - No paid ElevenLabs or OpenAI voice dependency.
  - No model downloads during tests; no hardcoded private model path; no publisher.

ACCEPTANCE CRITERIA
  - AC-01: Offline Kokoro voice can synthesize one HTTP narration scene on a machine where models are installed.
  - AC-02: Audio is valid and nonempty, duration measured by ffprobe; missing model produces actionable failure.
  - AC-03: Tests work without model files using mocks; model and voice config are identifiable.

VERIFICATION
  - Tests for missing model, subprocess failure, empty WAV, invalid duration and source text escaping.
  - One opt-in local manual voice test, with actual outcome recorded.

LIKELY AREAS (inspect current repository before creating them)
  - src/audio/
  - src/config/
  - tests/audio/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 03.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
