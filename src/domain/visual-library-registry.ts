import { z } from 'zod';
import {
  BTreeLookupSchema,
  CacheAsideSceneSchema,
  CodeTraceSchema,
  EventQueueSchema,
  FileTransferSchema,
  HashObjectGraphSchema,
  LayeredAssetSceneSchema,
} from './library.ts';
import { CITY_DEMAND_EXAMPLE, CityDemandHeatmapSchema } from './spatial.ts';
import { VisualCueSchema } from './visual-common.ts';

// The registry owns schemas and public semantic metadata; renderer bindings only attach local code.
const entry = <S extends z.ZodType>(
  schema: S,
  category:
    | 'diagram_2d'
    | 'flow_animation'
    | 'illustration_layered'
    | 'hybrid_2_5d'
    | 'map_heatmap',
  description: string,
  example: z.input<S>,
  emptyState: string,
  assets = false,
) =>
  Object.freeze({
    schema,
    crossfade: true,
    version: '1.0.0',
    category,
    description,
    example,
    emptyState,
    assetRequirements: assets
      ? 'Reviewed local asset IDs with exact file and record SHA-256; no URLs or paths'
      : 'No external assets',
    supportedCues: [
      {
        action: 'move',
        target: 'mechanism',
        semantics:
          'One nonzero progress/phrase window drives the deterministic mechanism; omit for full-scene timing',
      },
    ],
    fallback:
      'Return unsupported_visual or needs_review; never substitute a title card',
    safeZone:
      'Content x=96..912, y=480..1280; captions start at 1372; no custom CSS or layout outside validated props',
  });
export const libraryRegistry = Object.freeze({
  CityDemandHeatmap: entry(
    CityDemandHeatmapSchema,
    'map_heatmap',
    'Synthetic 5×5 fictional city: moving vehicles, four authored demand snapshots, progressive heat cells, a bounded camera push toward a focus cell, then a wider changing pattern. Original SVG 2.5D geometry, not WebGL or a real dispatch/pricing algorithm. Use full for 10–20s or four ordered story beats of 2–6s each. renderMode flat-svg is the explicit 2D fallback; no GPU, models, textures or map service required.',
    CITY_DEMAND_EXAMPLE,
    'All-zero density is valid and shows no demand. Invalid/off-road routes, real-location data, assets or code fail validation. No automatic renderer substitution.',
  ),
  EventQueue: entry(
    EventQueueSchema,
    'flow_animation',
    'Bounded FIFO waiting queue with one consumer. Completion, blocked backlog, dropped arrivals and in-service work are distinct. Prefer for queue/burst explanations, not JavaScript microtask scheduling.',
    {
      queueCapacity: 3,
      consumptionTime: 0.18,
      overflowPolicy: 'block',
      events: [
        { id: 'A', label: 'A', arrival: 0.1 },
        { id: 'B', label: 'B', arrival: 0.14 },
        { id: 'C', label: 'C', arrival: 0.18 },
      ],
      illustrative: true,
    },
    'events:[] shows an idle consumer and empty queue; use drop and a burst to show rejection',
  ),
  BTreeLookup: entry(
    BTreeLookupSchema,
    'diagram_2d',
    'Small minimum-degree-two B-tree with real sorted-key branch selection. A search token traverses only the chosen path; leaves stay balanced. Not a B+ tree or a simulation of every database.',
    {
      minDegree: 2,
      nodes: [
        { id: 'root', keys: [20], children: ['left', 'right'] },
        { id: 'left', keys: [5, 10], children: [] },
        { id: 'right', keys: [30, 40], children: [] },
      ],
      rootNodeId: 'root',
      searchKey: 30,
      illustrative: true,
    },
    'A root with keys:[], children:[] is empty. Search 99 in the example yields not found',
  ),
  HashObjectGraph: entry(
    HashObjectGraphSchema,
    'diagram_2d',
    'Git commit→root tree, tree→entry, commit→parent references with visibly traversed edges. IDs are illustrative labels, never calculated hashes.',
    {
      objects: [
        { id: 'commit', kind: 'commit', label: 'snapshot' },
        { id: 'tree', kind: 'tree', label: 'hello.txt entry' },
        { id: 'blob', kind: 'blob', label: 'Hello, Git!' },
      ],
      edges: [
        { from: 'commit', to: 'tree', meaning: 'root' },
        { from: 'tree', to: 'blob', meaning: 'entry' },
      ],
      illustrative: true,
    },
    'objects:[], edges:[] shows an empty object store; dangling/cyclic/wrong-kind edges fail',
  ),
  CodeTrace: entry(
    CodeTraceSchema,
    'diagram_2d',
    'Reviewed, bounded inert source lines and authored trace states. Highlights move through supplied steps; no code executes. Review identity is an operator assertion, not a factual approval.',
    {
      snippetId: 'sum',
      review: {
        reviewer: 'author',
        rationale: 'Manually checked arithmetic',
        reviewed: true,
      },
      lines: ['let total = 0', 'total = total + 2', 'total = total + 3'],
      steps: [
        { line: 1, state: 'total = 0' },
        { line: 2, state: 'total = 2' },
        { line: 3, state: 'total = 5' },
      ],
      illustrative: true,
    },
    'Empty snippets/steps and out-of-range lines fail; supply a reviewed error state as literal text',
  ),
  FileTransfer: entry(
    FileTransferSchema,
    'hybrid_2_5d',
    'File follows device↔cloud↔storage paths, with receiving, storing and completion/failure states. Complete means this illustrated transfer was stored, not global replica consistency.',
    {
      direction: 'upload',
      fileLabel: 'notes.pdf',
      outcome: 'complete',
      illustrative: true,
    },
    'outcome:failed stops at cloud; no storage or synchronized success is shown',
  ),
  CacheAsideScene: entry(
    CacheAsideSceneSchema,
    'hybrid_2_5d',
    'Cache-aside lookup, miss return to application, database read, cache population and subsequent cache hit. Reuses the causal proof with larger packets and focused hierarchy. Prefer over title cards for caching.',
    {
      visualPhase: 'lookup',
      keyLabel: 'product:42',
      valueLabel: 'Product data',
      illustrative: true,
    },
    'lookup/miss start empty; hit assumes the preceding fill. No TTL, eviction or concurrent consistency simulation',
  ),
  LayeredAssetScene: entry(
    LayeredAssetSceneSchema,
    'illustration_layered',
    'Reviewed image layers in ordered composition, bounded parallax and zoom, aspect fit/crop, entrance/exit and branded overlays. 2.5D illustration, not full 3D.',
    {
      intent: 'reveal',
      layers: [
        {
          id: 'hero',
          asset: {
            assetId: 'approved-image',
            sha256: '0'.repeat(64),
            recordSha256: '0'.repeat(64),
          },
          x: 160,
          y: 560,
          width: 600,
          height: 500,
          fit: 'contain',
          depth: 0.5,
          panX: 8,
          panY: -8,
          zoom: 1.04,
          enter: 0,
          exit: 1,
        },
      ],
      illustrative: true,
    },
    'Missing/unreviewed/changed assets fail preflight with asset ID; no placeholder',
    true,
  ),
});
// Separate discriminant keeps all previous VideoScript 1.x visuals byte-compatible.
const visual = <K extends keyof typeof libraryRegistry, S extends z.ZodType>(
  component: K,
  schema: S,
) =>
  z.strictObject({
    type: z.literal('registered-animation'),
    component: z.literal(component),
    taxonomy_version: z.literal('1.0.0'),
    props: schema,
    cues: z
      .array(VisualCueSchema)
      .max(1)
      .superRefine((cues, ctx) => {
        for (const c of cues)
          if (
            c.action.kind !== 'move' ||
            c.action.target !== 'mechanism' ||
            c.action.value !== undefined ||
            (c.trigger.kind === 'progress' && c.trigger.to <= c.trigger.from)
          )
            ctx.addIssue({
              code: 'custom',
              message:
                'One nonzero move/mechanism cue is supported, with no value',
            });
      }),
  });
export const registeredVisualSchemas = [
  visual('CityDemandHeatmap', CityDemandHeatmapSchema),
  visual('EventQueue', EventQueueSchema),
  visual('BTreeLookup', BTreeLookupSchema),
  visual('HashObjectGraph', HashObjectGraphSchema),
  visual('CodeTrace', CodeTraceSchema),
  visual('FileTransfer', FileTransferSchema),
  visual('CacheAsideScene', CacheAsideSceneSchema),
  visual('LayeredAssetScene', LayeredAssetSceneSchema),
] as const;
export const RegisteredVisualSchema = z.discriminatedUnion(
  'component',
  registeredVisualSchemas,
);
export type RegisteredVisual = z.infer<typeof RegisteredVisualSchema>;
