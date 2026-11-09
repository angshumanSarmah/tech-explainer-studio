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
