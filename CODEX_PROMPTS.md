# Codex phase prompts — single-pass implementation

Each file has **one copy-ready prompt** containing the phase's work, non-goals, acceptance criteria and verification. No additional SDD planning artifacts are generated. Start with [EXECUTION_FLOW.md](EXECUTION_FLOW.md).

| Phase | Scope | Roadmap | Prompt |
|---|---|---|---|
| 00 | Repository orientation, rights and execution baseline | Phase 0 — Legal and tool readiness   | [Open](codex/00-orientation-and-rights.md) |
| 01 | TypeScript foundation, schema, fixture and CLI validation | Phase 1 — Contract and offline render / contract slice   | [Open](codex/01-typescript-contracts-cli.md) |
| 02 | Remotion vertical silent animation renderer | Phase 1 — Contract and offline render / silent visualization   | [Open](codex/02-remotion-silent-render.md) |
| 03 | Local Kokoro narration adapter and pronunciation | Phase 1 — Contract and offline render / local narration   | [Open](codex/03-kokoro-local-audio.md) |
| 04 | Measured timeline, subtitles, assembly and media QC | Phase 1 — Contract and offline render / complete video   | [Open](codex/04-audio-timeline-caption-assembly.md) |
| 05 | Safe GitHub/docs ingestion, source snapshots and claim ledger | Phase 2 — Content Director with evidence / source provenance   | [Open](codex/05-sources-claims-review.md) |
| 06 | DeepSeek Director: sourced script and animation storyboard | Phase 2 — Content Director with evidence / DeepSeek   | [Open](codex/06-deepseek-content-director.md) |
| 07 | SQLite job state, resumability and incremental rerendering | Phase 3 — Recoverability, repairs and releases / persistent workflow   | [Open](codex/07-sqlite-jobs-and-recovery.md) |
| 08 | Human fact/media/video approval and immutable release manifest | Phase 3 — Recoverability, repairs and releases / approvals   | [Open](codex/08-review-and-release-gates.md) |
| 09 | YouTube OAuth, private upload, retries and reconciliation | Phase 4 — Publisher / YouTube   | [Open](codex/09-youtube-private-publishing.md) |
| 10 | Instagram Reels manual export bundle | Phase 4 — Publisher / Instagram manual bundle   | [Open](codex/10-instagram-export.md) |
| 11 | EventQueue, B-tree, Git object graph and code traces | Phase 5 — Channel-scale refinement / animation components   | [Open](codex/11-animation-component-library.md) |
| 11B | Optional bounded spatial city/heatmap proof | Phase 5 — Selective spatial storytelling | [Open](codex/11b-selective-3d-spatial-scenes.md) |
| 11C | Bounded generic composition, deterministic compiler and shared continuity | Phase 5 — Engineering accepted 2026-11-12; see PROJECT_STATUS | [Open](codex/11c-generic-visual-composition-and-continuity.md) |
| 11D | Source-guided Director, bounded JSON planning and manual portability | Not started; original prompt plus required companion below | [Open](codex/11d-source-guided-ai-visual-director.md) |
| 12 | Optional localhost review dashboard | Phase 5 — Channel-scale refinement / optional UI   | [Open](codex/12-local-creator-dashboard.md) |
| 13 | Optional analytics feedback, hardening and controlled launch | Phase 5 — Channel-scale refinement / optional analytics & launch readiness   | [Open](codex/13-analytics-and-launch-readiness.md) |

## Required companion reading for remaining phases

Hybrid C is [ADR-020 **ACCEPTED by the user on 2026-11-12**](docs/15-adrs.md#adr-020--hybrid-c-directed-media-production). Read the [historical integration review](docs/architecture-next/HYBRID_C_INTEGRATION_REVIEW_2026-11-12.md) and [accepted order](docs/architecture-next/HYBRID_C_PHASE_MAP.md). Architectural acceptance does not authorize phase implementation. Original prompts remain intact; companions add only future scope and cannot weaken accepted ADR-019 or security/release gates. The original Phase 09 private-only rule controls the older companion's conflicting “unlisted” wording.

When separately authorized, execute **one original prompt together with every companion in its row**. In particular, 11D requires both files and 12 requires all three; do not run a companion alone.

| Gate / original prompt | Required companion(s) |
|---|---|
| [11D](codex/11d-source-guided-ai-visual-director.md) | [Hybrid C Director/portability](codex/addenda/11d-hybrid-c-director-and-portability.md); paid image/clip production remains outside 11D |
| [H1 images](codex/hybrid/01-dynamic-images-and-imports.md) | New independent gate under accepted ADR-020, after reviewed 11D and separate start authorization |
| [H2 optional clips](codex/hybrid/02-optional-clips-and-spend-gate.md) | New independent optional gate after H1; separate start authorization and versioned clip contract review required before implementation |
| [12](codex/12-local-creator-dashboard.md) | [Source-guided workflow v6.1](codex/addenda/12-source-guided-creator-workflow-v61.md) **and** [Hybrid C controls](codex/addenda/12-hybrid-c-provider-and-media-controls.md) |
| [09](codex/09-youtube-private-publishing.md) | [Source-guided publishing](codex/addenda/09-source-guided-publish-gate.md) **and** [Hybrid C media release](codex/addenda/09-hybrid-c-media-release.md) |
| [10](codex/10-instagram-export.md) | [Source-guided export](codex/addenda/10-source-guided-instagram-export.md) **and** [Hybrid C social export](codex/addenda/10-hybrid-c-media-social-export.md) |
| [13](codex/13-analytics-and-launch-readiness.md) | [Generic quality metrics](codex/addenda/13-generic-video-quality-metrics.md) **and** [Hybrid C provider/quality metrics](codex/addenda/13-hybrid-c-provider-and-quality-metrics.md) |
| [14, optional](codex/14-autonomous-research-agent.md) | [Optional source discovery](codex/addenda/14-optional-source-discovery.md) |

Accepted incremental sequence, each phase separately authorized: **11D → H1 → H2 (optional) → 12 → 09 → 10 → 13**, with 14 separately optional. Deferred H2 remains disabled in the UI and does not block programmatic/manual-image use. Every gate stops for review; completed phases are not restarted.

## Shared actions

- [Independent review of a completed phase](codex/shared/verification-and-review.md)
- [Repair a failed phase](codex/shared/unblock-failed-phase.md)
- [Propose a material change](codex/shared/change-request.md)

**Cut lines:** 04 = offline narrated MVP; 08 = locally approved AI workflow; 10 = private publishing/manual Instagram export. 11–13 are optional extensions.
