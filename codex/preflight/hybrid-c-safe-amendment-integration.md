# Hybrid C — SAFE DOCUMENTATION INTEGRATION GATE (run once, prior to 11D)

**Task type:** read-only repository audit, followed by narrowly scoped documentation/prompt integration only. STOP for human review. This task DOES NOT implement product code or run any paid API.

## First inspect the actual checkout

1. Read `AGENTS.md`, `ARCHITECTURE.md`, `PROJECT_STATUS.md`, the actual ADR register and accepted ADR-019, `docs/architecture-next/ARCHITECTURE_VERIFICATION_2026-11-11.md` if present, the actual Phase 11C engineering closure report and worktree status. Verify report/test results are present rather than treating the user's quoted report as current repository execution evidence.
2. Check the exact existing `codex/11d-source-guided-ai-visual-director.md`, `codex/12-local-creator-dashboard.md`, `codex/addenda/12-source-guided-creator-workflow-v61.md`, matching 09/10/13 original prompts/addenda, Phase 05/06/07/08 contracts, 11/11C VisualAsset/VideoScript/registry and available CLI. If any are missing or materially different, report and STOP rather than guessing names.
3. Inventory relevant existing provider configuration and asset/media services before proposing a *new* interface or type. Identify which capability is implemented, scaffolded, or missing. Read this pack's `docs/architecture-next/ADR-HYBRID-C-PROPOSED.md`, `HYBRID_C_PHASE_MAP.md` and `HYBRID_C_CONTRACT_AND_SECURITY_RULES.md`.
4. Check current ADR IDs and decisions. **Do not assign ADR-020 automatically**; an ADR number may already be taken. Do not mark this proposal accepted without operator confirmation. If a prior accepted ADR conflicts, STOP and cite the exact conflict.

## Documentation-only integration procedure

- Prefer the installed additive prompt files as explicit companions. Do not overwrite, replace, concatenate, or silently truncate original phase prompts. If original README/phase-index docs need an update, add a **small pointer** to the new addenda and implementation order, preserving old content and references.
- Where original 11D says paid image generation is OUT OF SCOPE, preserve it. 11D can **describe asset needs**, and H1/H2 later **produce media**.
- Ensure the 11D and 12 execution instructions explicitly require reading both original prompt and correct new addenda. H1 and H2 are new independent gates, not renamed historical phases.
- Keep approved ADR-019 authoritative for VideoScript 1.2.0, one compiler, controlled 11C vocabulary, measured audio timing, provenance and regression. Hybrid C changes must be **additive and forward-only**, not retroactive 11C edits.
- An external Director Kit must export the real current schema and executable catalog; do not fabricate a standalone schema or a second editor format.
- Future generated media must be frozen, hashed, rights-reviewed and safe to load, and cannot be treated as source-grounding evidence merely because the AI generated it.
- Reuse Phase 07/08 cost, artifact and approval systems where they exist; do not invent parallel job/rights stores or duplicate provider adapters.

## Expected report

Produce one compact **change-impact matrix**: real file + existing behavior + proposed additive reference + changed/not changed + test needs + conflict risk. Include acceptance/NO-GO conditions, H1/H2 ownership, UI compatibility, and actual diff. Identify missing implementation functions without implementing them.

Only after reporting a clean audit may you add documentation-only pointers and a proposed ADR entry **with proposal status**. Do not rewrite accepted ADR contents; do not auto-commit. If acceptance requires updates to ADR index, perform only proposal registration allowed by local ADR conventions and flag pending human decision.

**STOP.** No TS/JS, tests, dependency, schema, job DB, media, provider or source modifications. No Phase 11D implementation. No claims of source, rights, visual or release approval.
