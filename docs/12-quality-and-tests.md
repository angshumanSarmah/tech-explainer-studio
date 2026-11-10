# 12 — Quality assurance, test matrix, and acceptance checklist

## Quality philosophy

The system can produce a technically valid MP4 and still teach the wrong concept. Treat **technical truth**, **visible causality**, **audibility**, **editorial originality**, **rights**, and **render quality** as independent quality dimensions.

## Test pyramid

### Unit tests (P0)

- `VideoScript` v1 and per-component props validation: valid, invalid, unknown visual types.
- Scene duration constraints; frame rounding; cue anchors and alignment bounds.
- Stable hashing and cache invalidation for narration vs scene change.
- Content profile rules: technical diagrams accepted in explainer, UI-only restrictions isolated to legacy walkthrough profile.
- Caption string escapes, brand typography line wrapping, unsupported font handling.
- Approvals invalidated if title, description, narration, source, video or rights hash changes.
- Publisher denies upload when any gate fails; `privacy=private` always supplied.
- Source link canonicalization and SSRF rejection.

### Integration tests (P0)

- Fixture VideoScript → local Kokoro → scene render → MP4 → ffprobe shows H.264/AAC, correct dimensions and nonzero duration.
- Retry failed scene while preserving good scene caches.
- Resume from `narration_ready` without another DeepSeek call.
- Simulate `429`, timeout and truncated JSON from provider; assert bounded retries.
- Test subtitle timestamps from measured audio, not fixed guesses.
- Fake YouTube adapter verifies no call before signed approval; retries do not duplicate upload.

### End-to-end tests (P1)

- Topic → source evidence → complete reviewed video.
- Two different videos share `BrowserRequestFlow` but differ in factual labels and narration.
- Operator changes one scene and re-renders; unaffected clip hashes remain unchanged.
- A deliberately invalid animation configuration fails fast with actionable error.
- One **manual private** YouTube upload with explicit confirmation and recorded remote ID.

## Implemented Phase 03 audio checks

`node --test tests/audio/*.test.ts` runs without model files, Python or downloads. Injected worker responses and a deterministic mock tone cover missing assets, hash/voice mismatch, subprocess start/nonzero/timeout/output failures, JSON stdin escaping, invalid worker protocol, text/path limits, empty/silent/truncated/malformed WAVs, invalid ffprobe duration/sample counts, changed assets and preservation of earlier scenes. Audio CLI tests exercise health, all-scene mock artifacts, strict flags/config, output protection and real-synthesis opt-in. Tests use the pinned npm ffprobe binary to measure real PCM files.

An opt-in real `audio smoke` uses installed assets and records the actual outcome separately in PROJECT_STATUS. The seed is versioned with voice settings and sent to the worker; compare fresh source/compiled runs for local repeatability. Human listening for HTTP/URL and ordinary technical terms remains a separate review. Phase 03 does not assert caption, video timing, phone playback or release approval checks.

## Implemented Phase 04 media checks

`node --test tests/integration/*.test.ts` includes real FFmpeg H.264/AAC assembly from mock WAVs, independent ffprobe/decoded-audio checks, saved text/WAV identity, frame rounding/holds, caption bounds, exact phrase anchors and reviewed alignment identity. The integration renderer is explicitly synthetic and test-only; the actual HTTP Remotion movie is separately rendered and inspected. Run these tests with `node --import ./tests/helpers/no-network.ts --test tests/integration/*.test.ts` to block Node network access; no weights/Python/browser are needed for the automated integration tests.

Negative cases reject silent/DC-only/clipped source signals, deliberately muted final AAC, invalid/overlapping captions, missing audio/streams, wrong dimensions/frame counts/duration, stale word alignment, missing/ambiguous phrase anchors and failed FFmpeg/ffprobe. Strict mode rejects mock/fallback timing before rendering, and failed runs never finalize `video.mp4`. A manual playback checklist is included in `qc-report.json`; human voice clarity, exact caption alignment, phone overlays, facts/rights and approval remain independent of automated media validity.

## Golden visual tests

Generate fixed frames at `0%`, `25%`, `50%`, `75%`, `100%` per component; compare to reviewed golden images at known frame size/fps. Use perceptual thresholds (minor anti-aliasing differences are acceptable), plus deterministic seed fixture. Inspect label overlap and screenshot-safe zones at representative phone dimensions.

## Factual evaluation set

At minimum 10 manually reviewed prompts spanning HTTP, DNS, queues, Redis cache, Git internals, B-tree indexing, compiler lexing/parsing, rate limiting, TCP flow control, URL shortener and an intentionally underspecified company-internal design question. The last must **decline to assert undocumented internals**. See [prompt evals](17-prompts-and-evals.md).

## MVP acceptance criteria

| Gate | Criterion |
|---|---|
| Sources | Every substantive claim has a traceable citation or is flagged for correction |
| Script | One central idea; correct scope and version; no unsupported internal company assertions |
| Visual | Component props validated; obvious cause-and-effect; no element overlap in safe areas |
| Audio | Speech intelligible; zero missing scenes; technical pronunciation reviewed |
| Timings | Captions start/end within measured audio/video; no scene cut mid-sentence |
| Output | Encoded playable 1080×1920 H.264 + AAC MP4; frame rate and duration verified |
| Reuse | Same component can render two distinct topic fixtures via props |
| Recovery | A failed render resumes without spending extra LLM tokens |
| Safety | No secret in logs/artifacts; no public upload without explicit approval |
| Rights | Rights checklist completed; no copied competitor assets |

## Definition of done (per episode)

- [ ] Source snapshots and claims reviewed
- [ ] Script and simplifications approved
- [ ] Narration pronunciation checked
- [ ] Animations reflect each claim accurately
- [ ] Scene IDs and cue timing correct
- [ ] Playback checked full-screen on phone
- [ ] Captions readable with platform UI overlays
- [ ] License/rights ledger completed
- [ ] Export probed; output hash recorded
- [ ] Title/description reviewed
- [ ] Any publication is explicitly authorized

## Quality metrics over time

Track reviewer edits per video, average scene render failures, time spent on manual corrections, factual error rate (severity-weighted), reuse rate of animation components, total human hours, LLM USD spend, scene cache hit rate, and audience retention signals when available. Targets are empirical baselines after first five to ten videos; do not fabricate benchmarks.


## Implemented Phase 07 persistence/recovery checks

`node --import ./tests/helpers/no-network.ts --import ./tests/workflow/no-director.ts --test tests/workflow/*.test.ts` runs 14 tests without model files, paid/research modules or networking. Coverage includes first-schema/repeat/future migration behavior, transaction rollback, legacy default brand, idempotency and imported spend, optimistic conflicts, two-connection/global leases and stale-worker fencing, pause/evidence gates, content hash/atomic export checks, corrupt-cache repair and revision-integrity checks. A real subprocess is killed with SIGKILL during scene two, then restarted after a simulated lease deadline; scene one is not rerendered. Synthetic narration and explicit test-only frames use real FFmpeg, independent ffprobe and decoded-audio QC. Further cases cover one-scene edits, scene-only output, bounded failed retries, narrator settings without paid/Director construction, bound source/claim/draft provenance, and credential-like metadata rejection.

The dependency matrix separately tests colors, fonts, captions, narrator/lexicon, timing/global progress, renderer implementation, dimensions and evidence. Same measured pixels can survive a voice change; timing changes conservatively invalidate displayed progress. Production remains limited to the current approved brand/vertical format; the matrix is not a claim of an alternate-brand or alternate-resolution render. Human voice naturalness, word-level caption accuracy, mobile playback and factual/rights review remain manual. Phase 07's actual HTTP preview/reuse evidence and limitations are recorded in PROJECT_STATUS.md and ignored `output/phase07/checks/`.

## Implemented Phase 08 release checks

`node --import ./tests/helpers/no-network.ts --test tests/release/*.test.ts` covers independent identities, all four gates for manual/DeepSeek origins, a lazy fake Publisher with zero construction/outbound calls on denial, exact-byte/private handoff, one-character metadata edits, unrelated-review retention, attribution removal, imported/AI image replacement, unknown rights, changed brand/narrator/model/source decisions, missing evidence, immutable/append-only SQL records, schema-1 upgrade and active-job revision binding. Positive authorization unit tests explicitly inject a test-only media inspector and synthetic review identities; they do not certify synthetic tones as speech or approve any real episode.

A separate real FFmpeg integration creates local synthetic frames/WAVs without weights/downloads and checks remote-playlist protocol denial, mock denial, deliberately misleading provider metadata, silent final AAC, absent audio, alternate resolution, stale captions and narrator/brand inconsistencies. Signal checks cannot identify speech or assess naturalness; real voice quality is a human playback gate. Phase 08 also independently inspects the existing real Kokoro cache-motion MP4 and an encoded frame, recorded under `output/phase08/`; its actual claims/rights/video/publish reviews remain pending. No live publication or human approval was simulated for that artifact.
