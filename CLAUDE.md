# CLAUDE.md — Claude Code project entry point

Claude Code should follow **[AGENTS.md](AGENTS.md)** as the same core project rulebook used by Codex; do not maintain a second, conflicting architecture or workflow here.

Read in this order at session start:
1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `PROJECT_STATUS.md`
4. `EXECUTION_FLOW.md`
5. The current `codex/NN-*.md` phase and its referenced technical docs

One phase per request. Inspect code first, implement only scoped work, run checks, report limitations, update status, change architecture only if warranted, and stop. No extra SDD files, unapproved external calls, secrets, proprietary code reuse, or automatic publication.
