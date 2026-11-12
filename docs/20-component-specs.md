# 20 — Registered animation components and explicit props

## Purpose

This document makes the first reusable visual vocabulary concrete enough for a coding agent to build **without inventing scene contracts**. Phase 01 implements strict Zod validation for `BrowserRequestFlow`, `title-card` and cues in `src/domain/visuals.ts`. Phase 02 supplies original SVG/React title cards and all six BrowserRequestFlow states. P2 components remain planned. Animation runs on a deterministic frame timeline.

## Canonical cue model

```ts
type VisualCue = {
  cue_id: string; // stable unique per scene
  trigger: { kind: 'progress'; from: number; to: number } |
           { kind: 'phrase'; text: string };
  action: {
    kind: 'focus' | 'move' | 'appear' | 'disappear' | 'highlight' | 'update_field';
    target: string;
    value?: string | number | boolean;
  };
};
```

`progress.from/to` are inclusive normalized values in `[0,1]`, monotonic and satisfy `to >= from`. `phrase.text` must exist in narration and must be uniquely resolvable. The Director is not allowed to inject CSS, scripts, image URLs, eval strings, XPath or subprocess commands into cues.

## `BrowserRequestFlow` — first component to implement

```ts
interface BrowserRequestFlowProps {
  visualPhase: 'idle' | 'request' | 'parse' | 'route' | 'response' | 'overview';
  request: { method: 'GET' | 'POST'; path: string; protocolLabel: string };
  response?: { status: number; statusText: string; bodyPreview?: string };
  show: { browser: boolean; network: boolean; server: boolean; handler: boolean };
  focus?: 'browser' | 'packet' | 'server' | 'handler' | 'overview';
  illustrative: boolean;
}
```

**Validation:**

- `path` must be safe display text (e.g., `/`) with max characters; never use directly as a URL to fetch.
- `protocolLabel` must be a vetted display enum or escaped/length-limited label (for first fixture use `HTTP/1.1`).
- A response phase requires `response`; a response with `204` must not depict a body. Use HTTP standard reviewer rules.
- All properties are strictly validated; unknown ones rejected.
- Runtime has no network activity and never executes `bodyPreview` or content inside labels.
- Route path display not a representation of every possible HTTP server.

**Implemented validation limits:** `request.path` is 1–200 characters, begins with a single slash, and contains ASCII alphanumerics or `/._~%!&'()*+,;=:@?-`; it is a display label, not a URL or shell argument. `protocolLabel` is one of `HTTP/1.0`, `HTTP/1.1`, `HTTP/2`, `HTTP/3`. Response status is an integer 100–599, status text is 1–80 characters, and optional body preview is 1–500 characters. A provided body preview is rejected for status 204. All nested objects are strict. These bounds preserve the HTTP fixture unchanged; protocol labels do not imply complete protocol simulations. Text, including the fixture's literal `<html>...</html>`, remains inert data; future renderers must escape it.

**Required visual states:**

The silent renderer requires `illustrative: true`; it cannot validate a real system trace. This is a renderer limitation, not a change to the shared v1 schema.

**Phase 02 renderer bounds (schema unchanged):** request path and response status text are limited to 18 display characters; body preview to 50. Longer schema-valid values fail render preflight rather than being truncated. Non-idle flow states need visible browser/server/network endpoints; route needs a visible handler. `show` flags and node/packet focus affect authored visuals. Request and response progress/move cues are applied to their named lanes; other cue actions/phrase triggers are rejected by the silent renderer. Overview has a fixed causal schedule (request 10–40%, parser 40–50%, handler 50–60%, response 60–90%); custom overview cues are unsupported. No runtime data string is executed or inserted as HTML. Normal title-card limits and safe-area/collision checks apply as well.

| Phase | Visible | Animation invariant |
|---|---|---|
| `idle` | Browser/server nodes | No packet in flight |
| `request` | Outgoing request envelope | Clear `GET /` target and direction |
| `parse` | Server parser / request fields | Request already arrived |
| `route` | Route selector and chosen handler | Parser phase clearly precedes handler |
| `response` | Status/header/body response back to browser | No response before earlier processing |
| `overview` | Full path and stage labels | One coherent end-to-end trace |

## `EventQueue` (P2)

```ts
interface EventQueueProps {
  producerCount: number; // 1..10
  consumerCount: number; // 1..5
  events: { id: string; label: string; arrivedAtFrame: number }[]; // bounded <= 100
  queueCapacity: number; // 1..100
  consumptionFramesPerEvent: number; // >= 1
  overflowPolicy: 'drop' | 'block' | 'highlight_overflow';
  showBackpressure: boolean;
  illustrative: boolean;
}
```

Renderer must not silently violate capacity. Show backlog and processing explicitly, and mark semantics as illustrative when not sourced from a specific queue implementation.

## `BTreeLookup` (P2)

```ts
interface BTreeLookupProps {
  nodes: { id: string; keys: number[]; children: string[] }[];
  rootNodeId: string;
  searchKey: number;
  highlightPath: string[];
  illustrative: boolean;
}
```

Validate sorted keys, unique IDs, child relationships, graph acyclicity, and search path against deterministic lookup code. Simplification must not imply all DB indexes use the same structure.

## `HashObjectGraph` (P2)

```ts
interface HashObjectGraphProps {
  objects: { id: string; kind: 'blob' | 'tree' | 'commit'; label: string }[];
  edges: { from: string; to: string; meaning: string }[];
  illustrative: boolean;
}
```

Validate referential integrity and limit graph size for short-form legibility. Only show calculated hashes if actual input data and algorithm are verified; otherwise label example IDs as illustrative.

## `CodeTrace` (P2)

Code snippets must be authored/reviewed and optionally tested in a constrained runtime. AI is allowed to choose *existing verified code snippets and trace steps*, not to trigger arbitrary shell commands. Build a separate sandbox and explicit execution policy before supporting live code evaluation.

## `title-card`

```ts
interface TitleCardProps {
  heading: string; // max 90 chars
  subheading?: string; // max 160 chars
  variant: 'hook' | 'summary';
  // VideoScript 1.1.0 only; omit to preserve exact legacy HTTP decoration.
  content?: {
    label: string; // 1–36 characters
    rows: [string, string, string]; // each 1–38 characters
    footnote: string; // 1–64 characters
  };
}
```

Text is escaped and line-wrapped with mobile-safe bounds. No external images by default.

## Component lifecycle

1. Create typed props + Zod schema.
2. Add example fixture and static golden frames.
3. Implement deterministic animation phases, with zero unapproved external dependencies.
4. Add fact/visual acceptance examples and unit tests.
5. Record component semantic version; cache key includes version.
6. Expose component ID in Director's *read-only* registry summary.

Never ask the LLM to fabricate React source code dynamically during video production; component creation remains an explicit developer task.


## Phase 06 Director export and brand consumption

`director export` emits the registered props/cue schemas directly from Zod plus explicit current renderer restrictions and a valid example. Application preflight still enforces runtime-only bounds/action-phase rules; the broader cue schema is not a claim that every enum action is executable. Phrase cues need unique literal narration plus later reviewed word alignment. Legacy title cards retain exact authored HTTP decoration. The caching production request adds optional bounded `content` to existing title cards in VideoScript 1.1.0: literal label, exactly three text rows, and footnote. This replaces all HTTP-specific copy for that card and reuses the same branded layout/entrance animation. The Director catalog distinguishes generic animated text cards from the HTTP-only BrowserRequestFlow mechanism; new simulations still require an explicit supported component. VideoScript 1.0.0 rejects this new field.

Existing SVG components consume the approved BrandProfile palette, font size/weight scale and captions; geometry, node routing and component causality remain local renderer concerns. See document 26 for the audit. No new component, arbitrary theme override, generated React execution or aesthetic redesign is introduced.


## Prerequisite proof: `CacheAsideProof@0.1.0` (preview only)

This user-requested proof does **not** start or complete the Phase 11 library. It is registered explicitly with `previewOnly:true`, not a new general asset/scene taxonomy. VideoScript 1.1.0 uses:

```json
{"type":"cache-aside-proof","component":"CacheAsideProof","props":{"visualPhase":"lookup","keyLabel":"product:42","valueLabel":"Product data","illustrative":true}}
```

`visualPhase` is exactly `lookup | miss | fill | hit`; key/value are literal strings of 1–14 characters; `illustrative` must be true. Unknown fields, asset URLs, custom paths/code and legacy 1.0.0 use are rejected. Each beat requires at least 30 measured/rendered frames. The four-beat story is manually authored for visual review; no paid Director integration or new review API is introduced.

Reusable parts: `DepthPanel` (layered SVG surfaces), `MotionPath` (base path and animated stroke), `MovingPacket` (frame-based position, directional request glyph or stacked data card), and `cacheAsideState` (pure out-of-order-safe frame evaluation/eased cubic positions). Fixed ports keep scene boundaries continuous. The miss returns to the app **before** the app queries the database; returned data reaches the app **before** a copy populates the cache. The hit starts with that populated cache, returns its result and keeps the database-read counter at one. Narration/subtitles use measured existing Producer timing; the fixed artistic path windows do not claim word alignment. Existing mobile label/caption checks remain active on every frame. Human visual approval and release approval remain separate; neither is granted by rendering this proof.

Phase 08 now enforces the prototype's existing `previewOnly` restriction at the release video gate. Independent media QC can pass while playback/release approval remains blocked on `PREVIEW_ONLY_COMPONENT:<scene-id>`. This does not promote or implement Phase 11.

## Phase 11 current library (supersedes the P2 planning sketches above)

The live authoritative schemas and public semantic descriptions are in `src/domain/visual-library-registry.ts` and `src/domain/library.ts`. `studio director export` emits complete 1.1.0 example VideoScripts, exact JSON prop schemas, supported cues, asset requirements, empty/failure behavior and safe-zone rules for every entry. JSON Schema cannot express all Zod refinements: the common parser and Producer preflight remain mandatory. Static render bindings attach fixed local implementations. No unknown component is replaced by a title card. Multi-scene all-title-card Director drafts return `NEEDS_REVIEW`.

All seven library entries use:

```json
{"type":"registered-animation","taxonomy_version":"1.0.0","component":"FileTransfer","props":{"direction":"upload","fileLabel":"notes.pdf","outcome":"complete","illustrative":true},"cues":[]}
```

An optional single cue uses the existing VisualCue schema with action `{"kind":"move","target":"mechanism"}` and a nonzero progress window. It drives the component's deterministic complete mechanism. Unsupported actions/targets/values fail. A unique phrase trigger requires the existing reviewed WAV-bound word alignment; the silent path rejects unresolved phrases. The taxonomy category comes from the registry rather than LLM styling: EventQueue=flow_animation; BTreeLookup/HashObjectGraph/CodeTrace=diagram_2d; FileTransfer/CacheAsideScene=hybrid_2_5d; LayeredAssetScene=illustration_layered. `scene_3d` remains reserved; Phase 11B below implements the `map_heatmap` category through the bounded CityDemandHeatmap component.

| Component | Actual bounded props and semantics | Empty/failure behavior |
|---|---|---|
| EventQueue | `queueCapacity` 1–4 waiting slots; one consumer; `consumptionTime` 0.05–0.5 in normalized mechanism time; ≤8 events `{id,label≤8,arrival:0..1}`, ordered by arrival; `overflowPolicy:block|drop`. Completions precede arrivals at a tie, equal arrivals use input order. In-service work is outside waiting capacity. Blocked work stays at producer in FIFO order, before later arrivals. | `events:[]` renders idle/empty; burst plus drop visibly counts rejected arrivals; block retains producer backlog. Never claims JavaScript microtask or distributed broker semantics. |
| BTreeLookup | `minDegree:2`; 1–7 `{id,keys,children}` nodes; ≤3 integer keys per node, within −999..999; existing root/search key; connected acyclic single-parent tree, strict global search ranges, keys+1 children, balanced leaves, ≤3 levels and ≤3 nodes/level. Search path is computed, never trusted from model output. | Empty root leaf is valid; `searchKey:99` in the example produces not found. Malformed/cyclic/unsorted/unbalanced trees fail validation. Illustrative B-tree, not B+ tree or every database index. |
| HashObjectGraph | ≤6 objects `{id,kind:blob|tree|commit,label≤16}` and ≤8 edges `{from,to,meaning:root|entry|parent}`. Each commit has one root tree; commit→parent commit; tree→tree/blob entries; acyclic and referentially valid, no duplicates. | `objects:[],edges:[]` renders empty store; missing roots/dangling/wrong-kind/cyclic edges fail. IDs are always illustrative; no calculated hash claim. Tree entry labels depict filenames; blobs hold contents. |
| CodeTrace | `snippetId`, `review:{reviewer,rationale,reviewed:true}`, 1–6 literal source lines ≤38 characters, 1–8 `{line,state≤28}` steps, line within snippet. Reviewed identity is an operator assertion. | Empty/unreviewed/out-of-range input fails; errors may be authored literal state values. Render process never evaluates, imports or executes supplied code. No sandbox/live executor exists. |
| FileTransfer | `direction:upload|download`, `fileLabel≤16`, `outcome:complete|failed`; causal device/cloud/storage paths, transfer→processing→store→complete. | Failed transfer stops at cloud and never reports stored completion. Completion is for this illustrative transfer, not global sync/replica consistency. |
| CacheAsideScene | Four `visualPhase:lookup|miss|fill|hit` beats; `keyLabel/valueLabel≤14`. Reuses pure causal cache proof state, eased paths and depth primitives with larger packets and less counter/debug copy. | Lookup/miss start empty; hit assumes the preceding fill. Miss returns to app before DB request; fill returns data to app before writing a cache copy; hit keeps DB idle. Old CacheAsideProof remains independently preview-only. |
| LayeredAssetScene | 1–4 ordered layers `{id,asset:{assetId,sha256,recordSha256},x,y,width,height,fit:contain|cover,depth,panX,panY,zoom,enter,exit}`; semantic `intent:reveal|compare|focus`. Positions/sizes and pan≤24/zoom≤1.08 are bounded; geometry checks retain caption clearance. Array order is composition order. Brand palette/font, overlays and depth shadows resolve locally. | Missing/unreviewed/changed assets fail preflight by ID. No placeholder, URL, arbitrary CSS/JS, raw path or code-as-animation. Catalog zero-hash example requires real reviewed asset refs before rendering. |

`illustrative` must be true for all library entries. Every mechanism requires at least 30 frames. The fixed content rectangle is above captions (`x=96..912`, graphics through `y≤1290`, footnote at1324; caption band starts1372). Text stays within BrandProfile safe bounds and actual browser label-collision checks. Asset layers have a stricter bounded box through1280, with entrance/exit and shadow clearance. All movement is deterministic from frame number; 2.5D refers to layered illustrations and depth cues, not GPU/full 3D. The current brand has null logo/watermark assets; scenes do not invent new branding.

Original complete fixtures and import instructions are in `examples/phase11/README.md`; the unchanged HTTP fixture remains the compatibility case. Generated MP4s, golden frames, exact cue windows and manifests are ignored local review artifacts listed in PROJECT_STATUS.md. Phone playback, subjective visual polish and word-level alignment remain human checks; rendering never grants release approval.

## Phase 11B — CityDemandHeatmap@1.0.0

The `map_heatmap` category is now implemented by `registered-animation/CityDemandHeatmap` (taxonomy 1.0.0); it is not a new visual type. `scene_3d`, arbitrary map types and unknown component names remain rejected. Runtime/Zod/Director schemas and static renderer dispatch share one registry.

| Field | Bounds and meaning |
|---|---|
| sceneType / dataKind / illustrative | Literal synthetic-city-demand / synthetic / true |
| renderMode | isometric-svg shaded extrusions, or explicit flat-svg roof footprints; both GPU-independent |
| cameraPreset | follow-demand (bounded 1→1.16→1 zoom, pan ≤24px/18px), or wide |
| storyBeat | establish, demand, respond, pattern adjoining quarters; full covers the complete story |
| focusCell | Integer x/y 0–4; fixed pulse and focus-intensity readout |
| density | Exactly four equally spaced snapshots, exactly 25 finite values 0–1 each; row-major y×5+x |
| vehicles | 1–6 unique IDs, each exactly five waypoints x/y 0–5; axis-aligned integer-grid roads; routes are authored, not computed dispatch |
| palette | Fixed brand roles low:flow, high:highlight, vehicle:success; no custom colors/styles |
| assetIds | Empty array; no imported images, models, textures or footage accepted in this proof |

All nested objects are strict. Fixed original geometry contains 25 cells, 19 low-poly building prisms and at most six vehicle glyphs plus one pulse. No shader, free geometry, live location, raw path/URL or executable code is accepted. All-zero density displays no demand; malformed/off-road routes and unknown assets fail before rendering. Full stories require 10–20s, partial beats 2–6s; measured presentation durations also respect saved budgets. Existing optional single nonzero move/mechanism cue or reviewed phrase anchor drives the story; no word timings are guessed. Shared topology/data/routes across partial beats give continuous positions.

The established content/caption safe regions and BrandProfile remain in force. City art stays above the focus readout/legend; captions retain their separate band. The legend maps teal to gold for synthetic demand, with changing numeric focus intensity. Labels explicitly say fictional/synthetic and disavow real dispatch/pricing. Vehicles move independently of camera; demand changes independently of vehicles. No model/API/tiles/rights bypass is introduced. Unit tests, encoded mobile poses, offline/no-WebGL renders and current costs are recorded in PROJECT_STATUS.md. Subjective cinematic quality and phone playback still require human review.


## Phase 11C — ComposedScene@1.0.1 (VideoScript 1.2.0)

| Capability | Implemented bounds |
|---|---|
| Semantic objects | ≤8 node/token entities, literal labels ≤24, fixed flow/success/highlight/muted brand roles; nodes flat/raised; tokens reference a starting node |
| Layout and relationships | row/column ≤3 nodes, grid ≤6 unique slots; ≤12 directed links between existing distinct nodes; ≤2 flat disjoint node groups; no arbitrary coordinates or nested state machine |
| Actions | ≤16 finite cue windows; appear/disappear/highlight, token move-to-node or along a declared cubic link, literal node status, gentle node focus; ≤2 concurrent moving tokens; overlapping moves for one token/focus windows rejected |
| Appearance/assets | existing BrandProfile and DepthPanel/MotionPath/SvgText; ≤2 existing reviewed local AssetRefs staged through the Phase 11 collector; namespaced SVG clip IDs; no arbitrary style/URL/code |
| Camera | wide or gentle-focus (maximum 1.04× push and bounded local pan, then return); reused SVG depth/layer cues are 2D/2.5D, never GPU 3D |
| Shared boundary | cut by default; registered SVG components support short crossfade; compatible composed stable-ID match only; 12-frame incoming window and held predecessor terminal pose |
| Unsupported | title-card crossfade, cross-template object match, incompatible matched appearance/assets/layout/camera/status/visibility, acting on a matched entity during handoff, unknown IDs/actions, arbitrary graphs/physics/HTML/3D |

Typed compiler diagnostics identify scene, prior scene, JSON path and reason, requesting an explicit supported storyboard revision. There is no silent cut, title-card substitution or runtime topic dispatch. Browser safe-zone/text checks apply after compilation. Fixed limits bound paths, labels, per-frame work and nesting; existing script limits cap scenes/duration and existing asset limits cap dimensions/bytes/passive content. See document 03 for the exact persisted/derived/output boundary and document 05 for timeline arithmetic.

Fixtures under `examples/phase11c` demonstrate caching, file movement with meaningful original document/cloud assets, a queue, registered specialized/mixed boundaries and stable token handoff. The frozen user-selected Kafka example is deliberately simplified; it is not a broker simulator. Asset import approval records used by the pre-existing demonstration store are automated-test assertions, not human production rights clearance. Human phone framing, animation clarity, hierarchy, complete listening, captions, factual and rights review remain pending. The initial grammar is not final product breadth.


**Engineering closure 1.0.1:** Node/status/token type is 36px, with deterministic wrapping and reserved maximum status/image height. Row width 240, other node widths 320; group captions use their own footer. Finite port/path and viewport checks reject incompatible crowded geometry. In particular, arbitrary vertical/diagonal grid routing around occupied nodes is not implemented; an explicit row/column alternative may work. Glyph containment is checked in the browser. Same-layout matching also requires compatible reserved node geometry. These are generic corrections, not a Kafka feature or a larger grammar. Subjective scale/hierarchy, copy, progressive scene selection and storytelling remain storyboard/human review work.
