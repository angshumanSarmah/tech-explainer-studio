# Phase 00 — Repository orientation, rights and execution baseline

**Goal:** Establish a clean, independently owned repository and turn existing project documentation into a verified implementation baseline. Identify conflicts and unblockers before coding.    
**Stage:** Foundation / no application code    
**Roadmap mapping:** Phase 0 — Legal and tool readiness    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex first. It inventories the repository and does not implement application code.

```text
You are implementing Phase 00 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - README.md
  - AGENTS.md
  - docs/00-vision.md
  - docs/01-prd.md
  - docs/02-architecture.md
  - docs/13-roadmap.md
  - docs/24-migration-notes.md

GOAL
Establish a clean, independently owned repository and turn existing project documentation into a verified implementation baseline. Identify conflicts and unblockers before coding.  

IMPLEMENTATION WORK
  - Inventory the actual repository, branch and documentation; distinguish specified features from implemented features.
  - Confirm which code/assets from phi-video-gen may legally be reused; default to clean-room independent implementation if unresolved.
  - Record supported local tool versions and availability of Node, FFmpeg/ffprobe, Python, Kokoro model files (without fetching model weights or paid assets).
  - Confirm the HTTP server explainer fixture is the MVP, not dark-store or Uber heatmap topics.
  - Define future CLI commands as proposed, never claim they already run.

OUT OF SCOPE
  - No copying proprietary source, tokens, Figma screens or company content.
  - No new application code or external service connections.
  - Do not install packages, change global Codex configuration, initialize a remote Git repository, or push.

ACCEPTANCE CRITERIA
  - AC-01: The baseline review identifies all existing architecture documents and confirms consistent project scope.
  - AC-02: All rights/ownership uncertainties are surfaced as blockers or clean-room decisions.
  - AC-03: Local dependencies are identified as available/missing; no fake test claims.
  - AC-04: Phase 01 can start without unstated or unresolved critical requirements.

VERIFICATION
  - Check links and existing example JSON syntax (not schema validity yet).
  - Report `git status` and current directory without changing git state.

LIKELY AREAS (inspect current repository before creating them)
  - docs/implementation-decision-log.md (only if necessary)

EXECUTION RULES
This phase is an orientation and baseline audit; do NOT implement application code. Inspect the local environment and document gaps. Do not install dependencies, fetch model weights, make external API calls, create Git remotes, or change unrelated project files. Update PROJECT_STATUS.md with factual findings, blockers, actual checked tools and recommended readiness for Phase 01. Only change README.md, ARCHITECTURE.md, AGENTS.md or CLAUDE.md to correct demonstrated documentation inconsistencies. If code ownership is not cleared, use the independent implementation approach.
- Maintain strict TypeScript, Zod validation of LLM-generated data, and deterministic render-only execution where applicable.
- Do not run a paid DeepSeek call, live OAuth flow, upload, commit/push, global installation or download large assets unless I explicitly authorize the specific action. Mock outside services for ordinary tests.
- Protect credentials, API keys, copyrighted references, and employer intellectual property. No automatic public publishing.
- Preserve previously working phases. If a safety or correctness invariant conflicts with these instructions, stop and explain the conflict rather than silently weakening it.

AFTER THE PHASE
1. Update PROJECT_STATUS.md: observed phase status, work completed, commands executed and their actual outcomes, artifacts, blockers, and recommended next phase.
2. Update the MAIN ARCHITECTURE.md only if implemented components, interfaces, boundaries or decisions truly changed. Clearly distinguish planned from implemented. Keep docs/02-architecture.md consistent when technical detail changes.
3. Update contract/component/reference docs only when their real behavior changed. Record significant architecture decisions in docs/15-adrs.md.
4. Update AGENTS.md or CLAUDE.md ONLY when a new durable project-wide coding rule is necessary. Avoid accumulating phase logs in agent instructions.
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 00.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
