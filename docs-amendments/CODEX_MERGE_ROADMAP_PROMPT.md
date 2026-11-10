# Documentation-only Codex prompt: merge v4 roadmap updates

Run this **separately** from a coding phase if you want Codex to incorporate the changed execution order into your live roadmap. This prompt does NOT implement any phase.

```text
I have a v4 update package with:
- docs-amendments/13-roadmap-v4-addendum.md
- docs-amendments/25-build-phase-map-v4-addendum.md

Inspect the current project versions of docs/13-roadmap.md, docs/25-build-phase-map.md, CODEX_PROMPTS.md and CODEX_START_HERE.md, plus PROJECT_STATUS.md and git diff.

Merge the v4 planned execution order and changed phase descriptions into only the planning/index documents, respecting any factual implementation updates already made by Codex. Retain existing phase numbers. Order after Phase 05: 06, 07, 08, 11, 12, 09, 10, 13, optional 14. Ensure both markdown links and next-phase dependencies are consistent.

Do NOT overwrite or reset PROJECT_STATUS.md, ARCHITECTURE.md, AGENTS.md, CLAUDE.md, src/, tests/ or the implementation. Do not mark a phase complete without observed verification. Avoid overwriting docs/13-roadmap.md or docs/25-build-phase-map.md with old starter copies. Do not implement phases or call paid/remote APIs.

Report actual documentation changes and any conflicts needing human review, and STOP.
```
