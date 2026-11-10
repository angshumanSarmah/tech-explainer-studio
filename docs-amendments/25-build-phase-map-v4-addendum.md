# v4 Addendum for docs/25-build-phase-map.md (MERGE, DO NOT OVERWRITE)

Retain phase numbers and prompt filenames. The execution order has changed to prioritize output quality and a usable local creator interface ahead of publishing.

| Execution step | Phase | Prompt filename | Gate / dependencies |
|---|---|---|---|
| 1–5 | 00–04 | Original prompts, unchanged | Verified offline narrated MP4 and audio check |
| 6 | 05 | Original Phase 05 already run | Multi-source ResearchBundle + claims |
| 7 | 06 | `codex/06-deepseek-content-director.md` | Manual import, optional DeepSeek, BrandProfile |
| 8 | 07 | `codex/07-sqlite-jobs-and-recovery.md` | Source/brand/narrator-aware persistence |
| 9 | 08 | `codex/08-review-and-release-gates.md` | Factual/rights/artifact approvals |
| 10 | 11 | `codex/11-animation-component-library.md` | Three visually distinct brand-consistent demos |
| 11 | 12 | `codex/12-local-creator-dashboard.md` | Vue 3 local creator workflow |
| 12 | 09 | `codex/09-youtube-private-publishing.md` | Explicitly approved private upload |
| 13 | 10 | `codex/10-instagram-export.md` | Manual Reels bundle and derivative approval |
| 14 | 13 | `codex/13-analytics-and-launch-readiness.md` | Quality metrics/controlled launch |
| 15 (optional) | 14 | `codex/14-autonomous-research-agent.md` | Topic -> candidates -> user-approved sources |

Revised order: **05 → 06 → 07 → 08 → 11 → 12 → 09 → 10 → 13 → 14 (optional)**.

The revised order means Phase 11 depends on 08, Phase 12 on 11, Phase 09 on 12, Phase 10 on 09, Phase 13 on 10 and Phase 14 on 13.

Do not change implementation truth in `PROJECT_STATUS.md`. The addendum is proposed documentation, not code completion.
