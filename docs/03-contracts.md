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

## Implemented Phase 05 evidence contracts

The source/claim entities above describe the target domain. Their initial executable contracts are separate, camelCase Zod schemas (`src/sources/snapshot.ts`, `src/claims/ledger.ts`), with initial `schemaVersion: "1.0.0"` snapshots/ledgers preserved. The bundle extension below adds versioned 1.1.0 source/ledger contracts. VideoScript v1's existing snake_case contract is unchanged and does not yet consume approved ledgers.

- **SourceSnapshot:** `sourceId`, `requestedUrl`, `canonicalUrl`, `origin`, `retrievedAt`, exact raw-body `contentSha256`, `bytes`, `mediaType`, nullable `excerpt` (≤1200 characters), `excerptTruncated`, `revision` (`commit`, `etagSha256`, `lastModified`, all nullable), unverified `licenseSignals`, `resolvedAddress`, `redirects`, `authentication: "none"`, `publicConfirmed: true`. Immutable safety literals are `reusePermission: "not_granted"`, `trust: "untrusted_reference"`, `contextBlocked: true`; nonempty `quarantineReasons` requires a null excerpt. Source identity hashes canonical URL + body hash + selected excerpt; distinct excerpts of the same body have distinct IDs. Snapshot digests bind all schema-parsed provenance. No raw page, repository tree, secret or executable asset is stored.
- **Draft input:** `{claims: [{claimId, text, sourceIds}]}` only. Claim IDs are unique and references cannot repeat. Caller-supplied status/review/approval fields are rejected; all initialized claims are `needs_review`.
- **Ledger:** positive `revision`, strict snapshots, claims with `status` (`supported | contradicted | insufficient | illustrative | needs_review`), nullable `review`, nullable `factApproval`. Missing referenced sources are retained as `MISSING_SOURCE` issues; they never approve silently.
- **Review decision:** `{claimId, status, reviewer, rationale, evidence: [{sourceId, quote}]}`. Exact quotes (≤600 characters) must be in cited, non-quarantined excerpts. Supported claims require evidence for each source; illustrative claims can have no sources only after review. Persisted reviews add timestamp, claim hash and snapshot hashes. Reviewing creates a new revision and clears approval.
- **Fact approval:** explicit reviewer/rationale only after every claim passes review. Adds timestamp and ledger hash binding revision, all sources/claims and review/approval metadata. `checkFacts` derives `approved` only for a current valid approval; otherwise `needs_review`. Mutations block export or require re-review. Hashes provide staleness checks, not authenticated reviewer identity or tamper-proof storage.
- **Context:** only approved ledgers export `{schemaVersion, kind: "untrusted_reference_data", policy: "reference-only-no-tools-v1", commandsAllowed: false, sources, claims}`. Includes approved text/status, reviewed literal evidence and provenance; no raw documents, prompts, tool roles or executable instructions. Screening is heuristic; consumers must keep reference text at an untrusted data boundary. Phase 05 contains no LLM consumer.

The CLI persists new files with exclusive writes and owner-only file mode; old revisions are not overwritten. Limits: 50 snapshots, 100 claims, 10 cited sources/evidence items per claim, 2 MiB local input JSON. See README for the executable workflow. This local fact gate is separate from future script/release/rights approvals.

### Phase 05 ResearchBundle extension

`src/sources/bundle.ts` exports `ResearchBundleInputSchema`, `ResearchBundleSchema`, `ingestResearchBundle(unknown, dependencies?)` and `bundleDigest`. No provider is involved.

| Contract | Implemented fields / semantics |
|---|---|
| Input `1.0.0` | `instructions: {topic, targetAudience, emphasize[], exclude[]}`, `sources[]`, optional `limits`. Every entry has unique `inputId`, `title`, `publicConfirmed: true`, optional `sections`, unverified `licenseNote`, narrower `limits`. `kind: url` adds `url`, optional `allowedHosts`; `kind: pasted_text` adds `text`. No source text is promoted to editorial instructions. |
| Bundle `1.0.0` | `bundleId`, `bundleSha256`, `createdAt`, strict instructions, typed sources, `assignments: [{inputId, sourceId, originalUrl, title, licenseNote}]`, effective bundle limits, `usage: {totalBytes, requests}`, `trust: untrusted_reference`, `contextBlocked: true`. Hash binds schema-parsed content, instructions, provenance, mappings and usage; no raw pages/notes persist in the bundle. |
| Typed source `1.1.0` | Legacy snapshot fields plus `sourceType: http_document | github_readme | github_document | pasted_text`, `originalUrl`, `provenance: {method: http_fetch | manual_paste, title, licenseNote}`, `selectedSections[]`. Web sources retain existing URL/hash/safety checks; original URL has no fragment, canonical request remains in `requestedUrl`. Pasted sources have null original/requested/canonical URL, origin, IP and revision fields; hash uses raw UTF-8 pasted text and ID uses `pasted_text` + content hash + excerpt. Selected literal sections together fit the existing 1200-character excerpt bound. License notes/signals remain unverified; no reuse grant. |
| Ledger/context `1.1.0` | Legacy claim/review behavior with typed source union and optional `research: {bundleId, bundleSha256, instructions}`. `createLedgerFromBundle` validates a saved bundle and initializes every claim unreviewed. New ledgers bind this metadata in approval hashes; context separates it from reviewed evidence. Legacy 1.0.0 ledger cannot contain new typed sources/research metadata, preserving prior digest semantics. |

Claims still support up to 100 claims, 10 source IDs each; bundle assignments resolve user input IDs to the actual source IDs used by claims. Contradicted, insufficient and unsupported/missing-source findings are exposed as explicit issues. Automatic semantic contradiction detection is not implemented: reviewers record decisions against exact evidence; unresolved decisions cannot be approved.

Limits default to 20 input entries (including duplicates), 4 MiB consumed UTF-8 document/paste bytes, 30 seconds for bundle ingestion and 60 HTTP requests/redirects; configurable ceilings are 50 / 8 MiB / 120 seconds / 300 requests. Existing per-source limits remain in force. Entry overrides contain only explicitly supplied fields; omitted fields inherit the bundle values, and supplied fields cannot exceed bundle per-source caps. Dedup keys include canonical URL or pasted-byte hash, selected sections, redirect allowlist and effective limits. Distinct selections may fetch separately; convergent final snapshots deduplicate by source ID, retaining all input mappings and charging all consumed bytes. Non-200 bodies are destroyed without document extraction. Failures stop later entries and produce no completed output bundle; current JSON CLI input cap remains 2 MiB.

## v1 TypeScript shape and implementation

Phase 01 implements the executable schemas in `src/domain/videoscript.ts` and `src/domain/visuals.ts`, with inferred TypeScript types. The reference shape below includes future variants: the legacy 1.0.0 visual union accepts only `title-card` (including required `variant`, as specified in document 20 and the fixture) and `tech-animation` with registered `BrowserRequestFlow` props. `code-trace`, `screen-recording` and other components are rejected as unsupported, rather than accepting undefined placeholder props/actions. The example registry below remains illustrative. The stable mechanism is `BrowserRequestFlow`; the separately documented `CacheAsideProof` is a preview-only prerequisite, not the full animation library.

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

Caption lines are limited to three lines of 34 characters, rendered at 42 px bold in the portrait composition's caption band. Browser text bounds/collision checks include them. Missing, overlapping, out-of-scene or out-of-video intervals fail. Human phone/overlay and speech sync review remain necessary. Narrated layout `separate-caption-band-v2` reserves y=1372–1524 for vertically centered captions with padding. Scene graphics must end at least 48px above this band; the browser checks full graphics bounds as well as label collisions. The server/packet endpoints and title-card summaries reflow upward without shrinking text, with detail/disclaimer lines above captions. Silent rendering retains its original layout.

Final manifests include ordered starts/durations/samples/holds/cue frames, original script/source records (unknown revisions/hashes remain null), per-scene narration/runtime identity, hashes for the output artifacts and source/compiled implementation inventory. Exact code hashes record uncommitted changes; a Git revision alone would not. `--strict` rejects mocks and unreviewed timing before rendering. This is a media validation option, not Phase 08 human release approval; `approvedForRelease` is always false.

## Phase 06 Director and VideoScript 1.1.0 contracts

`VideoScriptV1Schema` and legacy fixtures remain unchanged. `VideoScriptV11Schema` uses the same scenes, claims, cues and metadata with two bounded additions: optional `brand: {id: "tech-explainer", version: "1.0.0"}`; and `sources[].url: null` only when `source_kind` is `pasted_text`. Remote sources retain HTTP(S) URLs. `VideoScriptSchema` accepts both; the general `VideoScript` TypeScript type is the accepted union and `VideoScriptV1` is the legacy shape. Producer parsing/rendering supports both without network/model calls.

`director export` derives the actual schema with `z.toJSONSchema`, exports the real component/prop/cue schemas, an example and explicit producer capability restrictions. Zod refinements (unique IDs, scope/reference relationships and renderer capabilities) still run at import; they are not assumed to be expressed completely by JSON Schema. Tests compare exports to runtime conversion and exercise catalog bounds against producer preflight.

`DirectorBriefSchema` extends ResearchBundle editorial inputs with audience knowledge, target seconds, depth, supported format/aspect and bounded additional instructions. `makeRequest` validates the exact approved bundle/ledger pair, uses the existing inert evidence export and caps relevant context at 96 KiB. Sources project to the VideoScript fields without losing actual IDs/hashes/timestamps/revisions or inventing a URL for notes. Source title/type/licensing status and exact reviewed claim text/status/source mappings must match. Imported scripts never update the ledger.

`DirectorDraftSchema` is strict 1.0.0: origin, parsed script and canonical script hash, resolved brand identity/hash, nullable exact bundle/ledger hash binding, explicit review issues, `requiresHumanReview: true`, `requiresTimingReview: true`, `approvedForRelease: false`, prompt version/hash, optional bounded generation/model/usage/price-policy/request-hash metadata, and nullable local preview-review identity/time/hash. Only explicit `director review` writes a reviewer assertion; stale script/brand/evidence/flags fail. This is a narration/storyboard preview decision, not Phase 08 fact/media/rights/release approval. Unbound manual imports always retain missing-provenance findings regardless of script-declared statuses.

Both manual and generated results use `importDraft`. Unsupported components/actions/phase targets, invalid props/geometry/layout, missing/ambiguous phrase anchors, unsafe content and source/claim mismatches fail with field paths. Import never repairs. Generation permits at most one bounded JSON/schema repair, without sending raw failed output; unsafe/evidence failures and explicit `needs_review`/`unsupported_visual` results stop. Actual WAV timings, phrase alignment and caption correctness remain Phase 04 responsibilities and cannot be asserted by generated estimates.

`BrandProfileSchema` and its only approved reference are defined in `src/branding/profile.ts`; producer manifests include ID/version/SHA-256 and retain actual per-scene voice/model metadata. Explicit narration config settings override default brand voice settings. See document 26 for retained style/layout boundaries.

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


## Authored title-card copy for local episode production

VideoScript 1.1.0 `title-card` optionally accepts `content: {label, rows, footnote}`: label 1–36 characters, exactly three rows of 1–38 characters, footnote 1–64 characters. All fields are escaped literal text; there is no generated SVG/HTML/code evaluation, asset URL or dynamic component selection. Existing heading/subheading bounds and actual browser safe-area/collision checks still apply. Supplying the complete object replaces the card's HTTP-only header/rows/footer; omitting it preserves legacy pixels. VideoScript 1.0.0 rejects the additional field. Exported Director schemas/catalog include these limits and explicitly describe the output as animated text cards, not a new mechanism simulator.


## Cache motion prerequisite contract (preview only)

VideoScript 1.1.0 adds a strict `cache-aside-proof` variant with literal component `CacheAsideProof` and props `visualPhase: lookup | miss | fill | hit`, `keyLabel`/`valueLabel` (1–14 literal characters) and `illustrative:true`. It accepts no arbitrary geometry, code, remote assets or custom cue actions. Version 1.0.0 rejects the variant. Static validation/render registries agree on version `0.1.0` and `previewOnly:true`; the Director catalog exposes that restriction. Existing measured timelines, safe-area/collision checks, audio validation and unapproved preview manifests apply unchanged. Phases 08, 11 and later are not implemented by this bounded prototype.

## Implemented Phase 08 release contracts

`src/release/model.ts` defines strict `ReleaseManifest`, `RightsLedger`, private upload metadata and review schemas; it does not change VideoScript versions or add arbitrary asset execution fields. A release candidate's SHA-256 is the digest of its immutable manifest JSON stored in SQLite. Its `files` records bind exact role/path/bytes/hash for the MP4, script revision, rights JSON, metadata, bundle, claim ledger, cover, complete render tree and optional referenced local assets. The rendered manifest within that inventory retains resolved BrandProfile, model/voice/settings, source/implementation versions, measured scene starts and derivative hashes. Optional active-job identity binds its immutable snapshot and database revision as well as the authored script revision.

Four dependency hashes (`facts`, `rights`, `video`, `publish`) select current append-only review decisions. Publish approval also binds the current other gate decision IDs. State is computed as missing/approved/rejected/stale from exact dependencies; rendering remains explicitly unapproved. Rights entries have stable asset ID/type/content hash, origin/provider/creator, usage, license/attribution decision/evidence and exact-hash human review. Sources require their own source IDs even if bytes match. Optional imported media references require local files; cited sources, code-native visual configurations and recorded voice-model identities permit null paths. Future asset producers must register every used asset and its derivative hashes in this inventory; this phase provides no new asset pipeline. See [workflow commands and invalidation](07-workflow.md#phase-08-implemented-release-reviews).


## Phase 11 registered visual and local asset contracts

VideoScript 1.1.0 additionally accepts `{type:"registered-animation",taxonomy_version:"1.0.0",component,props,cues}` with a strict component-discriminated props union. Legacy 1.0.0 rejects this branch and retains earlier visuals unchanged. Schemas, public semantics and examples live in the authoritative registry; the Director export derives them automatically. Library cues use the existing literal VisualCue model with one nonzero `move/mechanism` window; phrase anchors require reviewed measured alignment. Unregistered 3D/map visual types and unknown components return actionable unsupported validation errors. Phase 11B adds CityDemandHeatmap through this registered-animation branch. See document 20 for the exact current bounds and empty/failure behavior.

`VisualAsset@1.0.0` records immutable stable ID/file SHA-256, actual MIME/extension/dimensions/bytes, original source/hash, rights/license/attribution/status/review, and bounded title/description metadata. Props reference only `{assetId,sha256,recordSha256}`. Imports are pending; approval creates a new immutable hash-bound record and never overwrites original bytes or prior records. Preflight rechecks actual decoded content and dimensions as well as file/record identity, then stages portable local assets for the real bundle. Record/file changes require new references and invalidate visual cache dependencies; missing, unreviewed, active SVG or mismatched assets fail explicitly. A render output's imported files/records are in its complete Phase 08 inventory, and required images/credits must also pass separate release rights review. Local review identities remain operator assertions, with automated test assertions clearly limited to synthetic fixtures.

Taxonomy version 1.0.0 categorizes registered components as diagram_2d, flow_animation, illustration_layered, hybrid_2_5d or map_heatmap. Category is registry-derived, not arbitrary model styling. Phase 11B implements map_heatmap only through CityDemandHeatmap; scene_3d remains reserved. Its strict synthetic data, bounded road routes, finite camera/beat presets and explicit isometric-svg/flat-svg modes are documented in document 20. Full spatial scenes require 10–20 seconds and partial beats 2–6 seconds, including measured-presentation budget checks. Layered and spatial SVG scenes are 2.5D, not full GPU 3D.
