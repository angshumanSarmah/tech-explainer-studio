# Preflight A — Preserve the existing uncommitted Phase 11B work

**Purpose:** Preserve actual 11B code before any contract refactor. Code success is NOT human release approval. Run this BEFORE architecture verification or installing v6 prompts if working-tree state is uncertain. This inspection can be done using Codex without performing a commit.

```text
You are working in the existing Tech Explainer Studio repo. Phase 11B was implemented locally and may be uncommitted. Do not delete it, revert it, or rerun the phase. Do not run any Git cleanup/reset/checkout/rebase/commit/push.

1. Inspect current working directory, branch, `git status --short`, `git diff --stat`, `git diff --cached --stat`, untracked files and `.gitignore`. Note that `git diff` does NOT include untracked files. Explicitly list all 11B code, prompt, fixture, tests and reporting assets that would be lost if overwritten.
2. Inspect the 11B REVIEW.md and actual implementation and report factually: isometric 2.5D versus true WebGL 3D, tested fallback, source registry, Director contract, render frame/voice proof, tests and human review left undone. Never claim pending visual/rights approval was completed.
3. Offer the LOWEST RISK non-destructive checkpoint method for THIS repo: a reviewed local backup of changed+untracked source files or an explicitly user-authorized local WIP commit on the correct branch, excluding secrets, generated media, model weights and large artifacts. Do not create either without authorization.
4. Check that the 11B implementation can still be found from old scripts and the current component registry; list current problems, but don't fix code.
5. Summarize exactly what to preserve and whether repo is ready for read-only architecture audit. STOP.
```

**Operator note:** The recommended preservation action is a local Git commit or a backup only after inspecting the exact file list. The prompt intentionally does not auto-commit or discard anything.
