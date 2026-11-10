# Phase 14 — Autonomous topic research: discovery to approved evidence

**Goal:** Add a bounded, auditable research workflow that begins with a technology topic and discovers candidate public sources before asking for human approval.  
**Stage:** Optional later automation, after content quality and production are demonstrated.  
**Roadmap mapping:** New optional Phase 14 — research discovery.  
**Prerequisite:** Phases 05–08 and 13 have been verified; run after Phase 13 if worthwhile.  
**Next:** None automatically planned. Make a new phase proposal based on measured results.  
**Execution:** One prompt; no separate SDD/spec/plan/tasks files.

## Run this phase in Codex

```text
You are implementing optional Phase 14 of Tech Explainer Studio, a clean independently owned project. Do not copy employer-owned phi-video-gen code or private employer materials.

READ FIRST
AGENTS.md; CLAUDE.md if present; ARCHITECTURE.md; PROJECT_STATUS.md; docs/13-roadmap.md; docs/25-build-phase-map.md; docs/04-content-director.md; docs/06-content-strategy.md; docs/11-security-and-legal.md; docs/17-prompts-and-evals.md; docs/19-references.md. Inspect actual Phase 05 ResearchBundle, source/claim ledger, Phase 06 manual/LLM Director, Phase 07 job persistence, Phase 08 approvals and Phase 13 quality metrics. Inspect git status/diff before changes.

GOAL
Allow the operator to enter a technology topic without first supplying URLs, and obtain a bounded, reviewable *candidate-source research proposal*: queries used, ranked candidate URLs, provenance, quality reasons, uncertainties, likely claims/topics to investigate and budget/limits. The operator explicitly approves selected sources before existing Phase 05 ingestion, claim review and Phase 06 script generation. Never conflate retrieval with correctness or source discovery with source approval.

IMPLEMENTATION WORK
A. RESEARCH DISCOVERY
- Add a ResearchDiscoveryProvider abstraction that can use an explicitly configured authorized public search/discovery interface. Use mocked fixtures for normal tests. If no such service is configured, clearly report discovery-unavailable and allow manual candidate URLs instead; do not pretend topic-only discovery succeeded.
- Topic -> bounded query plan (keyword variants and authoritative references) -> candidate results -> normalized/deduplicated public URLs and metadata -> ranked proposal -> user-selected approved source set.
- Prefer trustworthy primary materials (official docs, language/runtime specifications, high-quality project docs, well-established educational references) while preserving disagreement/secondary context. Report rationale, not unsupported objective truth scores.
- Record query, result title/snippet, original/provider URLs where permitted, discovery timestamp, domain, observed provenance, and why candidate was selected. Do not fabricate citation or page contents from snippets.
- Respect site access rules, licensing, quotas, rights and official APIs. No broad scraping, private repo crawls, paywall bypasses or indiscriminate GitHub cloning.
B. SECURITY / BUDGET
- Extend existing Phase 05 SSRF, redirect, DNS/IP, size, timeout and content safety controls; all retrieved text is untrusted. Use explicit redirect final-target checks, strict public HTTP(S), total request/page/token/time limits and cancellation.
- If an LLM helps query planning or synthesis, route through Phase 06 LLMProvider and the same explicit cost limits. Make fully offline mock runs possible without keys. Bound loops, retries and source fan-out; no unbounded agents or external autonomous actions.
- Do not put credentials in logs, snapshots or prompts. Do not assume a ChatGPT plan authorizes programmatic OpenAI API calls.
C. CLAIM/EVIDENCE WORKFLOW
- Use the *existing* ResearchBundle/claim review schemas. Discovery output is a proposal; selected URLs must flow through normal Phase 05 ingestion and technical review.
- Summaries must link to actual retrieved evidence. Unsupported or contradictory claims remain review-needed. No LLM-only fact approval; no automatic publishing.
- Preserve manual URL supplementation, user notes, exclusions, preferred sources and source rejection reasons.
D. OPERATOR WORKFLOW
- Provide CLI operations to preview search query plan, discover candidates, inspect origin/quality/reasons, approve selected sources and hand them into Phase 05. Extend local dashboard via existing typed APIs only if small and justified; no SaaS rebuild.
- Store reproducible discovery run manifests including provider, query, timestamps, request limits and candidate decisions. Avoid unnecessarily retaining full third-party material.

OUT OF SCOPE
No guaranteed arbitrary-web coverage, unrestricted crawler, recursive search, hidden paid calls, scraping banned sources, social-media engagement automation, cloning arbitrary code, auto-verified facts, auto-accepted source decisions, autonomous publishing, or new heavy agent framework unless measured need is recorded in ADR.

ACCEPTANCE CRITERIA
AC-01: With mocked public search results, a topic-only request yields a bounded candidate-source proposal with queries, provenance, source quality reasons and explicit human selection.
AC-02: Approved candidates integrate with actual Phase 05 ResearchBundle, claims and existing Phase 06 Director; no need for a new parallel research system.
AC-03: SSRF/private redirects, malicious document instructions, dead links, duplicates, content-size/timeout limits, excessive fan-out and provider/rate-limit failures are covered by fixture tests.
AC-04: Without a configured discovery provider, report that topic-only discovery is unavailable and support manual source candidate input; no fabricated results.
AC-05: Budget thresholds and evidence review gates block further requests or factual/public approval as appropriate.
AC-06: Mock end-to-end topic -> candidate proposal -> approved sources -> reviewed sourced draft is reproducible; live online calls remain strictly opt-in.

VERIFICATION
Run real typecheck, lint, unit and integration tests. Use mocked source discovery/provider tests first; an authorized optional live smoke test is separate and budget-scoped. Review retrieved-source license signals, source URLs, claim mappings and human approval actions. Record observed results; do not claim externally verified facts from generated text alone.

EXECUTION RULES
Strict TypeScript/Zod; no paid DeepSeek or other API call, OAuth, upload, commit/push, global install or large asset download without explicit authorization. Preserve Phases 01–13. No new agent loop/framework unless a small bounded staged workflow demonstrably cannot meet requirements and a user approves the architecture change. Stop for material security or rights conflicts. Do not implement future phases.

AFTER THE PHASE
1. Update PROJECT_STATUS.md with actual work, commands/results, artifacts and known limits.
2. Update ARCHITECTURE.md and docs/02-architecture.md only for actual architecture changes; update relevant docs and docs/15-adrs.md as needed.
3. Avoid modifying AGENTS.md/CLAUDE.md except a new durable global coding rule.
4. Demonstrate mock CLI candidate discovery, approval and sourced draft; state next manual decision.
STOP after Phase 14.
```

## Human completion check

Verify that every candidate source can be inspected/rejected, that none are silently trusted, and that the app can operate in guided/manual mode if no authorized discovery provider is configured. Review actual tests and changes before marking complete.
