# Phase 06 — DeepSeek Director: sourced script and animation storyboard

**Goal:** Generate a valid, sourced VideoScript from a topic and approved source set using an interchangeable, budget-aware model adapter.    
**Stage:** First live AI-assisted video    
**Roadmap mapping:** Phase 2 — Content Director with evidence / DeepSeek    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 06 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/04-content-director.md
  - docs/03-contracts.md
  - docs/17-prompts-and-evals.md
  - docs/20-component-specs.md
  - docs/16-example-http-server.md

GOAL
Generate a valid, sourced VideoScript from a topic and approved source set using an interchangeable, budget-aware model adapter.  

IMPLEMENTATION WORK
  - Implement `LLMProvider` interface and DeepSeek adapter with configurable model, endpoint, timeout, bounded retries and token/cost reporting.
  - Make prompt files small and versioned: research, claim audit, script, storyboard and repair.
  - Require only registered visuals and valid cue anchors; parse output as strict JSON and validate via Phase 01 schemas.
  - Record claim IDs and source IDs; unsupported claims or proprietary internal company assertions return a review-needed state.
  - Implement `studio plan --topic ... --provider deepseek --max-api-usd ...`, with dry-run/mock provider and explicit real-call opt-in.
  - Use docs/17-prompts-and-evals.md evaluations with mocked predictable fixtures first.

OUT OF SCOPE
  - No code-generation-and-execution of animations from LLM responses.
  - No external paid call during unit tests or without explicit user trigger.
  - No automated approval, upload or dashboard.

ACCEPTANCE CRITERIA
  - AC-01: Topic + source snapshots can yield a Version 1 VideoScript draft validated end-to-end.
  - AC-02: Missing source or unrecognized component causes repair/review path rather than hallucinated output.
  - AC-03: Mock provider tests cover malformed JSON, 429, timeout, budget exhaustion and injection resistance.
  - AC-04: A manually initiated real DeepSeek smoke test can be performed with a user-provided key kept out of logs.

VERIFICATION
  - Mock integration tests and prompt eval suite results with detailed pass/fail.
  - Optional explicitly authorized live API smoke test with capped request budget.

LIKELY AREAS (inspect current repository before creating them)
  - src/llm/
  - src/director/
  - prompts/
  - tests/director/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 06.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
