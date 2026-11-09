# Phase 11 — EventQueue, B-tree, Git object graph and code traces

**Goal:** Prove the engine generalizes beyond HTTP with visually distinct, technically correct reusable animations.    
**Stage:** Visual reuse and topical breadth    
**Roadmap mapping:** Phase 5 — Channel-scale refinement / animation components    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 11 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/20-component-specs.md
  - docs/05-video-engine.md
  - docs/23-90-day-topics.md
  - docs/16-example-http-server.md

GOAL
Prove the engine generalizes beyond HTTP with visually distinct, technically correct reusable animations.  

IMPLEMENTATION WORK
  - Implement EventQueue with explicit capacity, arrival and processing semantics.
  - Implement BTreeLookup with validated acyclic tree and deterministic search traversal.
  - Implement HashObjectGraph for Git blob/tree/commit relationships with illustrative labeling.
  - Implement CodeTrace with bounded reviewed inputs and zero execution of supplied code in render process.
  - Add one fixture/test per component, updated component registry, mobile golden frames and a small set of complete 30–60-second examples.

OUT OF SCOPE
  - No indiscriminate 3D, arbitrary dynamic JSX, unrestricted code execution or clone of competitor layouts.
  - No daily autonomous content production.

ACCEPTANCE CRITERIA
  - AC-01: At least three additional concepts render through same producer without custom per-topic code paths.
  - AC-02: All props validated and golden visuals reviewed at mobile size.
  - AC-03: Technical invariants tested: queue capacity, B-tree path, Git graph edge validity and code trace bounds.

VERIFICATION
  - Component schema negative tests, frame snapshot tests and visual sign-off.

LIKELY AREAS (inspect current repository before creating them)
  - src/visuals/
  - src/domain/visual-registry*
  - examples/
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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 11.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
