# Execution README — Building Tech Explainer Studio with Codex

> **Canonical execution workflow.** Start here every time. Phases 01–04 supply the offline script validator, silent renderer, local narration and measured captioned preview assembly; follow [PROJECT_STATUS.md](PROJECT_STATUS.md) for verified progress and [README.md](README.md) for local commands. Codex builds the remaining application phase by phase.

## 1. Which files matter?

| File | Authority | Update rule |
|---|---|---|
| `ARCHITECTURE.md` | **One architectural entry point** (data flows, boundaries, decisions) | Only for real design changes; distinguish planned from implemented |
| `AGENTS.md` | Persistent coding guardrails for Codex and other agents | Rarely |
| `CLAUDE.md` | Small Claude-specific pointer to `AGENTS.md` | Rarely |
| `PROJECT_STATUS.md` | **Source of truth for progress**: actual results and blockers | Every phase |
| `CODEX_PROMPTS.md` → `codex/NN-*.md` | Existing task definitions and phase acceptance criteria | Only when a phase's scope changes |
| `docs/*.md` | Supporting product and engineering reference | When contracts or design facts change |
| `docs/15-adrs.md` | Significant technical trade-offs | After approving a material architectural choice |

**No separate SDD templates or plan/spec/tasks files.** Read the existing phase and implement it.

## 2. Starting from the documentation-only starter archive

**Before anything:** confirm this is an independent personal project and you have permission to use any imported code. `phi-video-gen` material shown previously is inspiration only unless rights are cleared.

1. Extract `Tech_Explainer_Studio_Complete_Codex_Starter_v3.zip`. It creates one `tech-explainer-studio/` directory containing all docs and prompts.
2. Open that **folder** in VS Code or your shell. This is a starter with *no application source* yet.
3. At the project root, run:

```bash
cd tech-explainer-studio
git init                     # only if this is not already a Git repo
git status
codex
```

4. Check `codex --version` and its configured API/model **outside this document** if your previous installation routed to a local Ollama endpoint. Do not let an agent silently edit your global Codex configuration.
5. Paste the **Phase 00** prompt from [`codex/00-orientation-and-rights.md`](codex/00-orientation-and-rights.md). Do not ask it to implement every phase at once.
6. Review the audit output, `git diff`, and `PROJECT_STATUS.md`. Make an initial commit when you are satisfied (with normal Git hygiene; do not include secrets).
7. Continue with Phase 01 and proceed only after each phase meets its documented acceptance criteria.

## 3. Running **one phase** (repeat 00 through 13)

1. **Select next:** Read `PROJECT_STATUS.md` for the current status and prerequisites; use [`CODEX_PROMPTS.md`](CODEX_PROMPTS.md) to open the phase document.
2. **Run Codex:** In a new Codex task/session if appropriate, paste the **single prompt** under “Run this phase in Codex”. It already includes scope, non-goals and tests; you do not need another plan-generation step.
   For remaining phases, read that original prompt **and every companion** in [CODEX_PROMPTS.md](CODEX_PROMPTS.md#required-companion-reading-for-remaining-phases): 11D requires its Hybrid C addendum; 12 requires both v6.1 and Hybrid C addenda. Originals are preserved. [Hybrid C's accepted order](docs/architecture-next/HYBRID_C_PHASE_MAP.md) adds independent H1/H2 gates under ADR-020, accepted on 2026-11-12. Every phase still requires separate authorization; acceptance does not restart completed 11C, start 11D or authorize paid calls.
3. **Implementation:** Codex inspects the real code, implements only the phase, creates tests and runs permitted verifications. Unit tests should mock remote dependencies; no unexpected paid calls.
4. **Verification:** Check the actual commands, test outputs and `git diff`; for video phases also preview real frames/audio and inspect ffprobe details. Do not accept fake screenshots or claimed artifacts.
5. **Status handoff:** Codex updates `PROJECT_STATUS.md` with exactly what was verified, unverified, skipped or blocked. If it failed, mark **Blocked/Needs review**, not Done.
6. **Architecture/doc update:** If and only if a real design, schema, interface or boundary changed, update `ARCHITECTURE.md` and affected `docs/` files, and use an ADR if the trade-off is substantive.
7. **Human review:** Review the changes and optionally use [`codex/shared/verification-and-review.md`](codex/shared/verification-and-review.md). Commit an approved increment, then manually start the next phase.

**Phase completion response format:** Summary; changed files; actual verification commands/results; artifacts/paths; risks/unverified items; docs updated; proposed next phase. Stop. Never silently start Phase N+1.

## 4. Phase-by-phase milestones

| Phase | What to implement | Verify before continuing |
|---|---|---|
| **00** | Environment, ownership and docs audit | Clear implementation baseline; no source copied |
| **01** | Strict TypeScript + Zod `VideoScript` + CLI | Example fixture validates; malformed inputs fail |
| **02** | Silent Remotion 9:16 scene from fixture | Inspect real frames and MP4; no LLM/network needed |
| **03** | Local Kokoro narration adapter | Local voice output, duration measurement and pronunciation tests |
| **04** | FFmpeg + timeline + synced captions + media QC | **First complete narrated HTTP server Short** |
| **05** | Safe GitHub/docs sources and claim ledger | Source provenance, URL safety, claim tracing |
| **06** | Optional DeepSeek Content Director | Mock tests; explicit user-approved budgeted API call only |
| **07** | SQLite job recovery and incremental rerenders | Interrupted work resumes; cache is safe |
| **08** | Human evidence/media approval & release manifest | Approved final artifact/hash only |
| **09** | Private-first YouTube integration | Explicit opt-in private upload; no public upload |
| **10** | Instagram export bundle | Manual export package verified |
| **11** | More reusable animations | Component registry, snapshots and tests |
| **12** | Optional local creator dashboard | Access controls, local-only by default |
| **13** | Optional analytics and hardening | Controlled launch checks and measured results |

**Milestone A (00–04)** is the priority. Stop there and decide if animation quality is good enough before paying for additional APIs or building a dashboard.

## 5. First Codex message (copy/paste)

```text
You are working in Tech Explainer Studio, an independent, documentation-first project.
Read AGENTS.md, ARCHITECTURE.md, EXECUTION_FLOW.md, PROJECT_STATUS.md, and CODEX_PROMPTS.md.
Start with only Phase 00 in codex/00-orientation-and-rights.md. Follow its scope and acceptance criteria; do not generate a separate SDD spec/plan/tasks set, write app code, or copy phi-video-gen code. Inspect actual files and available local tools.
Run permitted checks and distinguish planned features from implemented ones. Update PROJECT_STATUS.md with observed results, update ARCHITECTURE.md only if a real design decision changes, and STOP for my review. Do not begin Phase 01 automatically.
```

When Phase 00 is approved, paste the prompt inside `codex/01-typescript-contracts-cli.md`. Continue in order, **one phase at a time**.

## 6. If a phase fails or needs design changes

- For a failed phase: run [`codex/shared/unblock-failed-phase.md`](codex/shared/unblock-failed-phase.md). Do not skip broken acceptance criteria.
- For new features or changes: run [`codex/shared/change-request.md`](codex/shared/change-request.md). Approve any meaningful scope/architecture change before merging it.
- For a skeptical final review: run [`codex/shared/verification-and-review.md`](codex/shared/verification-and-review.md).
- If a change makes previous code incompatible, add a migration/test for the existing fixture and update the relevant contract/ADR.

## 7. Which docs to update, in practice?

- **Routine completion:** `PROJECT_STATUS.md` only, plus code/tests changed by the phase.
- **New animation component:** component schema/registry and `docs/20-component-specs.md`; main architecture only if renderer boundaries change.
- **New storage or API design:** `docs/09-data-and-api.md` and, if boundaries change, `ARCHITECTURE.md` and `docs/15-adrs.md`.
- **DeepSeek model/provider change:** `docs/04-content-director.md`, config/tests; change architecture only if the interface changes.
- **Publishing approval rule change:** stop for security review; update `docs/08-publisher.md`, `docs/11-security-and-legal.md` and main architecture after explicit approval.

## 8. Moving from an older ZIP

Follow [`MIGRATION_FROM_PREVIOUS_ZIP.md`](MIGRATION_FROM_PREVIOUS_ZIP.md). **Do not simply extract over an old directory and assume removed files disappear.** The original starter contained SDD templates and an obsolete phase-map filename that need explicit cleanup. Always preserve any source code and user edits.

## 9. Operational safety

No `phi-video-gen` code import without rights; no copying third-party video visuals; no execution of untrusted GitHub code; no secrets in logs; no unapproved paid API calls; no automatic public posting; no unreviewed publishing. A working rendered scene does not imply the technical explanation is verified.
