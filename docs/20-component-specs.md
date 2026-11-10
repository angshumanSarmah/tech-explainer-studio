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
