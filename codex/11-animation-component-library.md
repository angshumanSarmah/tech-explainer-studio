# Phase 11 — Brand-consistent reusable animation library

**Goal:** Prove the engine generalizes beyond HTTP with visually distinct, technically correct reusable animations.    
**Stage:** Visual reuse and topical breadth    
**Roadmap mapping:** Phase 5 — Channel-scale refinement / animation components    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt only after **Phase 08** has been verified in `PROJECT_STATUS.md` (and required prior phases remain complete). Revised next phase: **Phase 12**.

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

ADDITIONAL V4 REQUIREMENTS — INTEGRATE PHASE 05/06 CONTRACTS
  - Preserve original EventQueue, BTreeLookup, HashObjectGraph and CodeTrace scope, but prioritize visual storytelling quality, mobile readability and technically meaningful motion, not component count for its own sake.
  - Every component must use the Phase 06 BrandProfile and the same validated scene/cue contracts used by manual ChatGPT and optional DeepSeek Director outputs; no arbitrary inline styling or executable LLM code.
  - Maintain one live authoritative component registry; update Phase 06 animation catalog exports and current external-AI prompt package automatically when components or allowed props are added. Test export/runtime registry parity to avoid schema drift.
  - Provide clear public component descriptions, prop schemas, supported cue anchors and an example VideoScript for each reusable component. Include failure/empty-state examples and visual-safe-zone rules.
  - Build at least three visibly distinct complete 30–60-second demos (HTTP/server, queue/event loop, B-tree or Git graph where relevant), with Kokoro narration, captions and real mobile frame review. Use source-backed accurate behavior and illustrative labeling.
  - Do not implement open-ended AI code generation, arbitrary JS execution, unrestricted 3D or a proprietary competitor's signature layouts.

OUT OF SCOPE
  - No indiscriminate 3D, arbitrary dynamic JSX, unrestricted code execution or clone of competitor layouts.
  - No daily autonomous content production.

ACCEPTANCE CRITERIA
  - AC-01: At least three additional concepts render through same producer without custom per-topic code paths.
  - AC-02: All props validated and golden visuals reviewed at mobile size.
  - AC-03: Technical invariants tested: queue capacity, B-tree path, Git graph edge validity and code trace bounds.

  - AC-04: Director contract export auto-reflects all registered components/props/cues; unknown names remain rejected.
  - AC-05: Three different explainer demos demonstrate consistent brand identity, readable captions and measurable narration timing, with any timing warnings retained.

VERIFICATION
  - Component schema negative tests, frame snapshot tests and visual sign-off.

  - Add component-contract parity tests, branded golden frames and actual varied topic MP4 reviews where environment permits.

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 11. The next planned phase is Phase 12; do not implement it now.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
