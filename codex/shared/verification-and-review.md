# Optional independent review after any phase

```text
Review the most recently completed phase as a skeptical reviewer. Read AGENTS.md, ARCHITECTURE.md, PROJECT_STATUS.md, the corresponding codex/NN-*.md phase prompt, and the relevant detailed docs. Start with git diff/status; do not implement unrelated features.

Compare actual implementation with the phase's acceptance criteria. Check contract mismatches, schema/prop validation, source and copyright boundaries, silent fallbacks, hidden paid calls, credentials, incorrect media timing, and publication safety. Run targeted tests and applicable lint/typecheck. If media changed, inspect real output frames and ffprobe metadata (or mark UNVERIFIED if unavailable).

Report PASS / CONDITIONAL / FAIL with precise issues, affected paths and reproduction steps. Update PROJECT_STATUS.md only with OBSERVED evidence, outstanding issues, and the next-phase readiness. If substantive architecture details changed but were not documented, propose the needed diff or ADR. Do not push, upload, publish or automatically begin another phase.
```
