# Phase 05 — Safe GitHub/docs ingestion, source snapshots and claim ledger

**Goal:** Turn user-approved public documents and Build Your Own X references into bounded, traceable source snapshots and claim-review records.    
**Stage:** Evidence-backed planning    
**Roadmap mapping:** Phase 2 — Content Director with evidence / source provenance    
**Execution:** one prompt; no separate SDD/spec/plan/tasks documents.

## Run this phase in Codex

Copy this entire prompt into Codex after the preceding phase is checked off in `PROJECT_STATUS.md`.

```text
You are implementing Phase 05 of Tech Explainer Studio, a new independently owned project. Do not copy proprietary phi-video-gen code. Read AGENTS.md, CLAUDE.md (if present), ARCHITECTURE.md, PROJECT_STATUS.md, docs/13-roadmap.md, docs/25-build-phase-map.md, and these phase-specific references:
  - docs/04-content-director.md
  - docs/06-content-strategy.md
  - docs/11-security-and-legal.md
  - docs/17-prompts-and-evals.md
  - docs/19-references.md

GOAL
Turn user-approved public documents and Build Your Own X references into bounded, traceable source snapshots and claim-review records.  

IMPLEMENTATION WORK
  - Create user-supplied source URL ingestion with HTTP(S) fetch limits, SSRF/IP filtering, redirect limits, canonical URLs and timeouts.
  - Store minimal source snapshots containing hash, retrieval date, origin, public license signals and revision/commit where available.
  - Represent substantive claims as source IDs and statuses: supported, contradicted, insufficient, illustrative or needs_review.
  - Treat retrieved source text as untrusted data; forbid commands, instruction overrides and embedded secrets in prompt context.
  - Provide local fixture-based source ingestion tests and a manual claim review path persisted in JSON initially.
  - No automated assertion that a GitHub tutorial grants reuse of its code/media; refer to source and write original narrative.

OUT OF SCOPE
  - No autonomous broad web scraping or social-media crawler.
  - No automatic public factual approval from an LLM alone.
  - No private GitHub, Jira, employer repository or token access by default.

ACCEPTANCE CRITERIA
  - AC-01: A public HTTP documentation URL can be ingested with provenance on explicit request; tests use local mock fixtures.
  - AC-02: SSRF, invalid URLs, oversized content, redirects to private hosts and prompt injection text are safely rejected/isolated.
  - AC-03: Claims with missing sources are flagged and cannot move to approved fact state without reviewer action.

VERIFICATION
  - SSRF/redirect/size/timeout cases with mocked HTTP.
  - Fake malicious document cannot alter safety or schema rules.

LIKELY AREAS (inspect current repository before creating them)
  - src/sources/
  - src/claims/
  - tests/sources/

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
5. Summarize files changed, verification results, risks and the next manual review action. STOP after Phase 05.
```

## Human completion check

Review the git diff, actual command outputs, and any generated video/audio artifacts. Mark the phase done only after verifying acceptance criteria. Use [`codex/shared/verification-and-review.md`](shared/verification-and-review.md) for an independent Codex review when useful. Move to the next phase only after review.
