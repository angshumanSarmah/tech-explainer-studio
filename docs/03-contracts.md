# 03 — Domain model, schemas, and versioning

## Contract philosophy

`VideoScript` is the boundary between probabilistic content planning and deterministic video production. It is **data**, never executable TS/JS. Version all persisted contracts, validate at every boundary, and allow only registered visual components. Separate mutable draft from immutable **approved release**.

## Entities

| Entity | Meaning | Identifier / key |
|---|---|---|
| `Topic` | Original idea + audience + source constraints | `topic_id` |
| `SourceSnapshot` | URI, repository commit/version, retrieval date, excerpt/hash, license review | `source_id` |
| `Claim` | Factual assertion and source IDs, review status | `claim_id` |
| `VideoScript` | Narrative, scenes, visual configs, version and timing | `script_id`, `revision` |
| `Scene` | Narration and typed visual configuration | `scene_id` |
| `Asset` | Voice/clip/caption/thumbnail + SHA256 + origin | `asset_id` |
| `RenderManifest` | Exact ordered scene assets and measured timeline | `render_id` |
| `Approval` | Reviewer decision bound to exact render hash | `approval_id` |
| `Publication` | Platform status + external video ID | `publication_id` |

## v1 TypeScript shape and implementation

Phase 01 implements the executable schemas in `src/domain/videoscript.ts` and `src/domain/visuals.ts`, with inferred TypeScript types. The reference shape below includes future variants: the current strict visual union accepts only `title-card` (including required `variant`, as specified in document 20 and the fixture) and `tech-animation` with registered `BrowserRequestFlow` props. `code-trace`, `screen-recording` and other components are rejected as unsupported, rather than accepting undefined placeholder props/actions. The example registry below remains illustrative; only `BrowserRequestFlow` is registered in code.

```ts
interface VideoScriptV1 {
  schema_version: '1.0.0';
  script_id: string;
  revision: number;
  profile: 'technology-explainer' | 'product-walkthrough';
  topic: string;
  audience: 'beginner' | 'intermediate' | 'advanced';
  language: string; // e.g. 'en'
  target: { aspect_ratio: '9:16' | '16:9'; width: number; height: number; fps: number };
  sources: SourceSnapshot[];
  claims: Claim[];
  scenes: SceneV1[];
  editorial: { title_options: string[]; summary: string; simplifications: string[] };
  provenance: { prompt_version: string; model_id: string; created_at: string };
}

type SceneV1 = {
  scene_id: string;
  educational_goal: string;
  narration: string;
  claim_ids: string[];
  visual: VisualSpec;
  timing: { min_seconds: number; preferred_seconds: number; max_seconds: number };
  caption_overrides?: { text: string; start_ms: number; end_ms: number }[];
};

type VisualSpec =
  | { type: 'tech-animation'; component: RegisteredComponent; props: unknown; cues: VisualCue[] }
  | { type: 'code-trace'; language: string; steps: CodeTraceStep[] }
  | { type: 'title-card'; heading: string; subheading?: string; variant: 'hook' | 'summary' }
  | { type: 'screen-recording'; fixture_id: string; actions: VerifiedAction[] };
```

`unknown` is intentionally *not* directly passed to React. It must be parsed with the **component-specific Zod schema**, yielding typed props.

### Example registries / validations

```ts
const registry = {
  BrowserRequestFlow: { schema: BrowserRequestFlowPropsSchema, render: BrowserRequestFlow },
  EventQueue: { schema: EventQueuePropsSchema, render: EventQueue },
  BTreeLookup: { schema: BTreeLookupPropsSchema, render: BTreeLookup },
  HashObjectGraph: { schema: HashObjectGraphPropsSchema, render: HashObjectGraph },
} as const;

function parseVisual(input: unknown): ParsedVisual {
  const base = BaseVisualSchema.parse(input);
  if (base.type !== 'tech-animation') return parseOtherVisual(base);
  const entry = registry[base.component as keyof typeof registry];
  if (!entry) throw new ValidationError('UNKNOWN_VISUAL_COMPONENT');
  return { ...base, props: entry.schema.parse(base.props) };
}
```

`parseOtherVisual()` and `ParsedVisual` are design placeholders, not claimed executable snippets. Each component schema should disallow unexpected properties (`strict`).

## Source/claim fields

```json
{
  "source_id": "src-mdn-http",
  "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
  "title": "Overview of HTTP",
  "retrieved_at": "2026-11-06T00:00:00Z",
  "source_kind": "official_documentation",
  "license_review": "link_only_no_republication",
  "revision": null,
  "content_sha256": "<computed-at-ingestion>"
}
```

```json
{
  "claim_id": "claim-request-response",
  "text": "HTTP follows a request-response model.",
  "source_ids": ["src-mdn-http"],
  "status": "needs_human_review",
  "scope": "introductory overview"
}
```

`content_sha256` is a computed provenance field; the placeholder above is **not** a valid hash for production.

## Timing contract

- AI produces only **estimated** preferred durations. Rendering uses audio's measured duration (via ffprobe) and any approved holds.
- All timings use integer **frames** in the render manifest. Convert seconds to frames with explicit rounding at a single boundary.
- Scene start frame `N = sum(previous scene durations)`; do not independently round each timestamp into an incompatible timeline.
- Audio/caption alignment must use actual speech rather than naive equal-length scene chapters.
- Every animation `cue` has a stable ID and frame or normalized progress window; the producer refuses out-of-range cues.
- Distinguish *spatial causal sequence* from true protocol timing; use labels when compressed for pedagogy.

### Phase 01 runtime validation

- Every object is strict, including nested props, source/claim records, triggers and actions; unexpected fields are errors. Numbers are finite, not coerced from strings or expressions. The version is exactly `1.0.0`; revision is a positive integer. Both documented profiles and aspect ratios are accepted; geometry must match the declared ratio. Width/height are positive integers up to 8192; fps is a positive integer up to 120. No render support is implied.
- IDs use 1–128 ASCII alphanumeric/hyphen/underscore characters, starting with an alphanumeric character. Scene/source/claim IDs are unique within their collections; cue IDs are unique per scene. Claim→source and scene→claim references must resolve. Arrays allow up to 100 scenes/sources/cues per scene and 500 claims; scenes must be nonempty.
- Source URLs must be syntactically HTTP(S); no fetching or SSRF policy is implemented here. Retrieval dates and content hashes may be `null` for unreviewed fixtures; provided hashes must be 64 lowercase hexadecimal characters. Dates are ISO datetimes with UTC or a numeric offset. `source_kind`, `license_review` and claim `status` remain bounded descriptive strings; this phase does not implement review state transitions or infer approval from them.
- `0 < min_seconds <= preferred_seconds <= max_seconds`; these remain estimates. Optional caption overrides use integer milliseconds, ordered nonoverlapping positive intervals within `max_seconds`. Real alignment still requires the later measured-audio timeline.
- Cue progress lies in `[0,1]` with `to >= from`; phrase triggers must match exactly once in the scene narration (case-sensitive literal matching). Targets are stable identifiers, never URLs, XPath or expressions; matching them to renderer element IDs is a later renderer responsibility. Cue values are bounded literal strings, finite numbers or booleans. Expression-shaped cue payloads and additional code/command/expression properties are rejected. No data is evaluated, rendered as HTML or passed to a shell. This is a data contract, not a universal code/HTML sanitizer.

### Parser and diagnostic API (implemented)

`parseVideoScript(input: unknown)` and `parseVideoScriptJson(text: string)` return `VideoScriptV1`, inferred from `VideoScriptV1Schema`. A failure throws `ScriptValidationError` with `code`, `exitCode` and `issues: { code, scene_id, path, reason }[]`. Paths use JSON bracket notation, such as `$["scenes"][1]["visual"]["props"]["request"]["method"]`. `scene_id` is `null` when not identifiable. Unknown keys point to the individual unexpected property.

Malformed JSON uses `MALFORMED_JSON`, path `$`, exit `2`, and a generic reason without reflecting input text. Invalid schemas use `SCRIPT_VALIDATION_FAILED` with issue codes `INVALID_INPUT` (exit `2`), `UNKNOWN_VISUAL_COMPONENT` or `UNSUPPORTED_VISUAL_TYPE` (exit `3`). If a script contains both kinds of issue, exit `3` takes precedence. Validation does not approve claims, licenses or publication.

## Phase 04 measured presentation and alignment contracts

The saved VideoScript v1 contract/fixture is unchanged. `render --narration <directory>` reads each `<scene_id>/<scene_id>.wav` and `narration.json`, validates its strict Phase 03 metadata, verifies the original narration and WAV hashes, then measures the copied WAV again with ffprobe. The producer never trusts saved duration alone and never executes source URLs or provider code.

At 24 kHz and 30 fps, one frame is **800 audio samples**. The only scene-duration rounding boundary is:

```text
durationFrames = max(2, ceil(max(audioSamples / 800, scene.timing.min_seconds * 30)))
from = sum(previous durationFrames)
audioFrames = ceil(audioSamples / 800)
holdFrames = durationFrames - audioFrames
endPaddingSamples = durationFrames * 800 - audioSamples
```

The authored `min_seconds` is the permitted minimum hold policy, not a new guessed chapter duration. `preferred_seconds` is ignored for narrated rendering; exceeding `floor(max_seconds * 30)` fails with a scene ID. There is no speech trimming/speedup. Original estimates remain saved unchanged; an internal render copy carries resolved timing/cues. Manifests distinguish full hold frames from fractional-frame sample padding. A one-hour total bound remains enforced.

Reviewed alignment input has the following strict shape (a type reference, not fabricated sample timings):

```ts
type ReviewedAlignment = {
  schemaVersion: '1.0.0';
  method: 'human-word-alignment' | 'local-forced-alignment';
  reviewed: true;
  reviewer: string;
  scenes: {
    sceneId: string;
    wavSha256: string;  // 64 lowercase hex characters
    textSha256: string; // exact original narration, before lexicon substitution
    words: { word: string; startSample: number; endSample: number }[];
  }[];
};
```

Each scene appears exactly once. Tokens are the original narration's non-whitespace words, with exact punctuation/case/order; every token needs an ordered nonoverlapping positive interval within its measured WAV. A token such as `HTTP` spans the spoken letters after pronunciation expansion. The producer does not invent these sample positions. Operators/aligners must listen/check alignment before recording reviewer identity. The hashes invalidate old timings after a voice, model, text or WAV change.

Phrase cues locate an exact, unique original-text occurrence and take the intersecting timed words' sample bounds. Missing/ambiguous anchors or absent reviewed word timings fail by scene/cue. Movement windows use integer local frames: floor the start, ceil the end, clamp at the final scene frame, then express those exact frames as normalized progress for the existing renderer. Authored progress cues retain their scene-relative meaning, snapped to integer frames; holds can therefore leave a visual movement after the speech, which needs editorial review. `cueWindows` records the resolved frame intervals.

Without reviewed word timings, `--allow-caption-fallback` explicitly opts into `scene-speech-span-v1` for preview. DC-insensitive RMS activity detection in 20 ms windows determines the scene speech interval; the full original narration is shown across it. No word/phrase location or equal-duration chapter inference is claimed. The output always requires timing review. Captions use global `[startFrame, endFrame)` intervals, floor/ceil display boundaries and shared boundaries between adjacent reviewed groups to avoid rounding overlap. SRT milliseconds are rounded from these same frames; this cannot create cumulative scene drift. Overrides remain scene-local integer milliseconds and are checked against actual WAV duration, not only the estimated maximum; overrides always require review.

Caption lines are limited to three lines of 34 characters, rendered at 42 px bold in the portrait composition's caption band. Browser text bounds/collision checks include them. Missing, overlapping, out-of-scene or out-of-video intervals fail. Human phone/overlay and speech sync review remain necessary. The caption band replaces the old bottom detail panel with a compact detail line only in narrated mode; silent rendering retains its layout.

Final manifests include ordered starts/durations/samples/holds/cue frames, original script/source records (unknown revisions/hashes remain null), per-scene narration/runtime identity, hashes for the output artifacts and source/compiled implementation inventory. Exact code hashes record uncommitted changes; a Git revision alone would not. `--strict` rejects mocks and unreviewed timing before rendering. This is a media validation option, not Phase 08 human release approval; `approvedForRelease` is always false.

## Immutability and versioning

- Editing a script creates revision `n+1`. Existing approvals invalidate whenever claims, narration, visual config, rights, output bytes or metadata requiring reapproval change.
- Preserve original source URL and exact source version when possible; never overwrite the original source snapshot.
- Render cache key = hash(`scene JSON + narration hash + component version + voice settings + render settings + tool versions + referenced assets`).
- Once approved, save a `ReleaseManifest` with `script_revision`, `render_sha256`, `metadata_sha256`, `rights_check_ids`, `approved_at`, `reviewer`.
- Publisher checks exact manifest hashes before upload, not just `status = approved`.

## Compatibility plan

If authorized `phi-video-gen` code is reused, write an **import adapter** mapping legacy `title`, `feature_id`, `visual_type`, and `visual_spec` to the new v1 **only when semantically valid**. Unknown legacy visual types fail with an actionable import error; never silently convert old `diagram` or Figma selectors into Remotion code.

## Valid sample

See [`../examples/http-server.videoscript.json`](../examples/http-server.videoscript.json). Use this fixture to test the JSON parser and scene registry before wiring an LLM.
