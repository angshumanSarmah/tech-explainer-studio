# 13 — Development roadmap, backlog, and milestones

## Strategy

Build **one honest vertical slice** before building a creator platform. The first video is **HTTP server request flow**, not the quick-commerce/dark-store or Uber heatmap visual references. Validate that animated causal explanations can be generated and rendered from a contract with minimal human editing.

## Phase 0 — Legal and tool readiness (P0)

**Deliverables:** verify code ownership boundaries, initialize independent repo, obtain explicit provider key choice, FFmpeg/remotion/kokoro environment health, commit docs and test fixture.

**Exit:** `studio doctor` reports capabilities and missing dependencies; no proprietary files or secrets in new repo.

## Phase 1 — Contract and offline render (P0)

**Tasks:**

- P0-01: `VideoScriptV1` + Zod validator + clean error codes.
- P0-02: `BrowserRequestFlow` with browser, HTTP request, server parse, response, UI focus cues.
- P0-03: 9:16 Remotion composition and safe-zone grid preview.
- P0-04: Kokoro adapter using a local model with version/config pinning.
- P0-05: Frame-accurate timeline + FFmpeg assembly + ffprobe assertions.
- P0-06: Golden frames and MP4 smoke test from static example JSON.

**Exit:** `studio render --script examples/http-server.videoscript.json` generates a locally playable video **without external LLM**.

## Phase 2 — Content Director with evidence (P0)

- P0-07: HTTP(S) source fetcher with allowlist, limits, SSRF prevention and source metadata.
- P0-08: DeepSeek API adapter plus optional Ollama provider interface.
- P0-09: Prompt fragments and output schema; citation/claim ledger.
- P0-10: User-reviewed fact gate and draft script editing.
- P0-11: Provider cost tracking and bounded retry/repair strategy.

**Exit:** topic → sourced draft → review → video using the same registry.

## Phase 3 — Recoverability, repairs and releases (P1)

- P1-01: SQLite jobs/step state, migrations and file manifest storage.
- P1-02: Content hashes, scene-only rerender and cache invalidation.
- P1-03: Exact-hash human media/video approval.
- P1-04: Caption alignment verification, subtitles and cover extraction.
- P1-05: CLI progress, structured error codes and `jobs resume`.

**Exit:** interrupted rendering resumes; changing one scene doesn't regenerate all audio/video.

## Phase 4 — Publisher (P1)

- P1-06: YouTube OAuth credential vault and API adapter.
- P1-07: Private upload with post-upload status verification.
- P1-08: Publication outbox/idempotency and explicit approval checks.
- P1-09: Instagram media/caption export bundle (manual publishing).

**Exit:** one explicitly approved, private YouTube test upload with returned video ID. No automated public schedule in MVP.

## Phase 5 — Channel-scale refinement (P2)

- P2-01: Add `EventQueue`, `BTreeLookup`, `HashObjectGraph`, `CodeTrace`.
- P2-02: Local dashboard for topic queue, scene preview and review.
- P2-03: Analytics collector (official APIs), editorial feedback loop.
- P2-04: Topic discovery, duplicate detection, ranking.
- P2-05: Optional long-form/16:9 output and companion tutorial tooling.

**Exit:** three technically different videos reuse animation components; operator can manage queue and revisions without editing JSON manually.

## Suggested first 14-day timebox (planning only)

| Day | Focus | Tangible result |
|---|---|---|
| 1 | Repo rights + initialize | Clean repo, no workplace files |
| 2 | Validate existing project patterns, tool health | Architecture interfaces frozen |
| 3 | Write schemas/tests | Validated fixture script |
| 4 | Brand tokens, vertical composition | Blank composition and safe zones |
| 5 | Browser/server visual | Reusable component |
| 6 | Request/response animation | Motion trace working |
| 7 | Kokoro audio adapter | Voice file and pronunciation lexicon |
| 8 | Timeline and caption integration | Synchronized scene |
| 9 | FFmpeg/Remotion pipeline | First complete local MP4 |
| 10 | Quality review and corrections | Approved visual baseline |
| 11 | DeepSeek provider | Generated draft from prompt |
| 12 | Source ledger and validation | Claim-to-source mapping |
| 13 | Full end-to-end director → render | Script+video from real topic |
| 14 | Freeze demo and backlog decisions | P0 exit report |

This is a **target sequence**, not a promise that each step fits a particular calendar day; actual runtime setup, model behavior and rendering quality may require iteration.

## Blockers and risks

| Risk | Impact | Mitigation |
|---|---|---|
| Rights to existing company code unclear | Legal/reputational | Use clean-room implementation of general design |
| Video looks like another channel | Brand differentiation | Own palette, type, components and motion signature |
| AI uses wrong technical claims | High | Source evidence + domain reviewer |
| Kokoro voice mispronounces jargon | Medium | Pronunciation lexicon and manual approval |
| Rendering time unexpectedly high | Medium | Static assets, frame caching, measured worker limits |
| Upload performed before review | High | Hash-bound gates, private explicit |
| LLM bills exceed expectations | Medium | Max cost/request thresholds and offline fallback |

## Change policy

Before adding a new orchestrator, cloud infra or dashboard, record an ADR showing measured pain in the current implementation, alternatives considered, estimated maintenance burden and a rollback plan.
