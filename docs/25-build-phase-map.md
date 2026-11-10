# 25 — Build phase map

This file breaks [docs/13-roadmap.md](13-roadmap.md) into smaller coding tasks. Refer to [EXECUTION_FLOW.md](../EXECUTION_FLOW.md) for the **single-prompt phase process** and [PROJECT_STATUS.md](../PROJECT_STATUS.md) for actual completion. There is no separate SDD/spec-template workflow.

| Phase | Milestone | Prompt |
|---|---|---|
| 00 | Repository orientation, rights and execution baseline | [Phase 00](../codex/00-orientation-and-rights.md) |
| 01 | TypeScript foundation, schema, fixture and CLI validation | [Phase 01](../codex/01-typescript-contracts-cli.md) |
| 02 | Remotion vertical silent animation renderer | [Phase 02](../codex/02-remotion-silent-render.md) |
| 03 | Local Kokoro narration adapter and pronunciation | [Phase 03](../codex/03-kokoro-local-audio.md) |
| 04 | Measured timeline, subtitles, assembly and media QC | [Phase 04](../codex/04-audio-timeline-caption-assembly.md) |
| 05 | Safe GitHub/docs ingestion, source snapshots and claim ledger | [Phase 05](../codex/05-sources-claims-review.md) |
| 06 | DeepSeek Director: sourced script and animation storyboard | [Phase 06](../codex/06-deepseek-content-director.md) |
| 07 | SQLite job state, resumability and incremental rerendering | [Phase 07](../codex/07-sqlite-jobs-and-recovery.md) |
| 08 | Human fact/media/video approval and immutable release manifest | [Phase 08](../codex/08-review-and-release-gates.md) |
| 09 | YouTube OAuth, private upload, retries and reconciliation | [Phase 09](../codex/09-youtube-private-publishing.md) |
| 10 | Instagram Reels manual export bundle | [Phase 10](../codex/10-instagram-export.md) |
| 11 | EventQueue, B-tree, Git object graph and code traces | [Phase 11](../codex/11-animation-component-library.md) |
| 12 | Optional localhost review dashboard | [Phase 12](../codex/12-local-creator-dashboard.md) |
| 13 | Optional analytics feedback, hardening and controlled launch | [Phase 13](../codex/13-analytics-and-launch-readiness.md) |

## Milestone gates

- **00–04:** local narrated 9:16 HTTP-server explanation verified on a real media file.
- **05–06:** sourced claims and an opt-in DeepSeek Director; ordinary tests use mocks.
- **07–08:** resumable jobs and human hash-bound approval.
- **09–10:** private YouTube upload and manual Reels export.
- **11–13:** optional expansion once validated by actual channel needs.

Each phase updates `PROJECT_STATUS.md` after verification. Architecture docs are only changed for substantive verified changes.

## Current execution-order override

The Phase 08 user request selects Phase 11 as the next planned implementation before dashboard/distribution. This changes execution order, not authorization: finish Phase 08 review and the existing focused cache-motion visual approval first. Do not automatically start Phase 11/11B, Phase 09/10, dashboard or publishing. Actual observed phase status remains in PROJECT_STATUS.md.
