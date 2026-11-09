# Migration guide — from earlier Tech Explainer Studio ZIP packages

This ZIP is the **complete replacement documentation package**. It contains the entire folder with docs, 14 `codex/` phase prompts, shared review prompts, example fixture, `ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, `PROJECT_STATUS.md`, and the new canonical [`EXECUTION_FLOW.md`](EXECUTION_FLOW.md). No original archive is required.

## A. If you have not started coding (recommended)

1. Back up any edited documentation you want to keep.
2. Extract the **new complete ZIP into a clean directory**.
3. Open `tech-explainer-studio/` and start at [`EXECUTION_FLOW.md`](EXECUTION_FLOW.md).
4. Do **not** merge the old ZIP. It could reintroduce deleted SDD files and stale instructions.

## B. If you already have a repository with code

**Preserve all source code and local changes.** The starter contains documentation and fixtures, not a runnable app. It is safest to create a temporary extraction beside your existing repository and compare before copying.

```bash
# From the PARENT directory of your existing repository:
unzip Tech_Explainer_Studio_Complete_Codex_Starter_v3.zip -d starter-v3

# Inspect changes first. Replace <existing-repo> with your folder:
diff -ru <existing-repo>/AGENTS.md starter-v3/tech-explainer-studio/AGENTS.md || true
# Inspect README, ARCHITECTURE, CODEX files, and docs before overwriting any edited file.
```

After reviewing the differences, bring the documentation you want into your repository (keeping a backup or Git commit first). **Do not use `rsync --delete` or delete `src/`, `tests/`, artifacts, model files or your changes.** The example `diff` above is an inspection command, not a migration script.

### Old files to remove **only after review**

From the original `Codex_Ready_Starter.zip` only:

```text
specs/README.md
specs/templates/spec.md
specs/templates/plan.md
specs/templates/tasks.md
specs/templates/verification.md
docs/25-codex-sdd-workflow.md
docs/26-build-phase-map.md     # superseded by docs/25-build-phase-map.md
```

In the **Simplified_Phase_Prompts.zip** these were already absent, so nothing needs removal. Do not delete a `specs/` directory if you have since added your own valuable work there: delete only the listed obsolete files after inspecting them.

### Files that replace older versions

```text
README.md                   # clearer scope and getting started
EXECUTION_FLOW.md           # NEW: single canonical execution README
ARCHITECTURE.md             # living Mermaid architecture
AGENTS.md                   # single consistent Codex instruction path
CLAUDE.md                   # thin Claude Code pointer
PROJECT_STATUS.md           # phase progress log
CODEX_START_HERE.md         # now delegates to EXECUTION_FLOW.md
CODEX_PROMPTS.md            # phase index
codex/00-*.md ... 13-*.md   # single implementation prompt per phase
```

All `docs/*.md` reference files remain included. If your repo contains modified versions, resolve differences intentionally, especially any evolved schemas.

## C. How work proceeds after migration

The only workflow is:

**Open a phase → run its one Codex prompt → implement + test → inspect → update PROJECT_STATUS.md → update ARCHITECTURE.md only if the design changed → review/commit → next phase.**

There is **no** mandatory `spec.md`, `plan.md`, `tasks.md`, Spec Kit, or additional planning approval step. Architectural changes still need a short explanation/ADR and explicit approval if they alter security, cost, publication or scope.

## D. Verification checklist

- `ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, `EXECUTION_FLOW.md`, `CODEX_PROMPTS.md`, `PROJECT_STATUS.md` and all 14 phase files exist.
- Links from the README and execution README work as relative local links.
- No obsolete SDD templates or old phase-map filenames remain.
- `PROJECT_STATUS.md` accurately reflects **your own repository**; the starter's status is all phases **Not started**, so do not overwrite verified progress without transferring it.
- Your source, Git history, `.env`, render outputs and model weights were not overwritten.
