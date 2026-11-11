import { z } from 'zod';
import { displayText, ShaSchema, StableIdSchema } from './visual-common.ts';

const unit = z.number().min(0).max(1);
const illustrative = z.literal(true);
export const VisualTaxonomy = Object.freeze({
  version: '1.0.0',
  renderable: [
    'diagram_2d',
    'flow_animation',
    'illustration_layered',
    'hybrid_2_5d',
    'map_heatmap',
  ],
  reserved: ['scene_3d'],
});
export const AssetRefSchema = z.strictObject({
  assetId: StableIdSchema,
  sha256: ShaSchema,
  recordSha256: ShaSchema,
});
export const EventQueueSchema = z
  .strictObject({
    queueCapacity: z.int().min(1).max(4),
    consumptionTime: z.number().min(0.05).max(0.5),
    overflowPolicy: z.enum(['drop', 'block']),
    events: z
      .array(
        z.strictObject({
          id: StableIdSchema,
          label: displayText(8),
          arrival: unit,
        }),
      )
      .max(8),
    illustrative,
  })
  .superRefine((p, c) => {
    if (new Set(p.events.map((e) => e.id)).size !== p.events.length)
      c.addIssue({ code: 'custom', message: 'Event IDs must be unique' });
    if (
      p.events.some(
        (e, i) => i > 0 && e.arrival < (p.events[i - 1]?.arrival ?? 0),
      )
    )
      c.addIssue({
        code: 'custom',
        message: 'Arrivals must be ordered; ties use input order',
      });
  });
export type QueueProps = z.infer<typeof EventQueueSchema>;
export const BTreeLookupSchema = z
  .strictObject({
    minDegree: z.literal(2),
    nodes: z
      .array(
        z.strictObject({
          id: StableIdSchema,
          keys: z.array(z.int().min(-999).max(999)).max(3),
          children: z.array(StableIdSchema).max(4),
        }),
      )
      .min(1)
      .max(7),
    rootNodeId: StableIdSchema,
    searchKey: z.int().min(-999).max(999),
    illustrative,
  })
  .superRefine((p, c) => {
    const bad = (message: string) => c.addIssue({ code: 'custom', message });
    const map = new Map(p.nodes.map((n) => [n.id, n]));
    if (map.size !== p.nodes.length || !map.has(p.rootNodeId)) {
      bad('Unique nodes and existing root required');
      return;
    }
    const seen = new Set<string>();
    const depths = new Set<number>();
    const walk = (id: string, low: number, high: number, depth: number) => {
      const n = map.get(id);
      if (!n || seen.has(id)) {
        bad('Tree must be connected, acyclic, with one parent per node');
        return;
      }
      seen.add(id);
      if (depth > 2) bad('Mobile tree supports at most three levels');
      if (
        n.keys.some(
          (k, i) =>
            k <= low ||
            k >= high ||
            (i > 0 && k <= (n.keys[i - 1] ?? -Infinity)),
        )
      )
        bad('Keys must be strictly sorted within ancestor search bounds');
      if (!n.keys.length && (id !== p.rootNodeId || n.children.length))
        bad('Only an empty root leaf may have no keys');
      if (n.children.length && n.children.length !== n.keys.length + 1)
        bad('Internal nodes need keys + 1 children');
      if (!n.children.length) depths.add(depth);
      n.children.forEach((child, i) => {
        walk(
          child,
          i === 0 ? low : (n.keys[i - 1] ?? low),
          i === n.keys.length ? high : (n.keys[i] ?? high),
          depth + 1,
        );
      });
    };
    walk(p.rootNodeId, -Infinity, Infinity, 0);
    if (seen.size !== p.nodes.length || depths.size !== 1)
      bad('All nodes must be reachable and leaves at equal depth');
    const levels = new Map<number, number>();
    const count = (id: string, d: number, visited = new Set<string>()) => {
      if (visited.has(id)) return;
      visited.add(id);
      levels.set(d, (levels.get(d) ?? 0) + 1);
      map.get(id)?.children.forEach((ch) => {
        count(ch, d + 1, visited);
      });
    };
    count(p.rootNodeId, 0);
    if ([...levels.values()].some((n) => n > 3))
      bad('At most three nodes per level for mobile readability');
  });
export type TreeProps = z.infer<typeof BTreeLookupSchema>;
export function treeSearch(p: TreeProps) {
  const path: string[] = [];
  let id: string | undefined = p.rootNodeId;
  while (id && path.length <= p.nodes.length) {
    const n = p.nodes.find((n) => n.id === id);
    if (!n || path.includes(id))
      throw new Error('Invalid tree; validate before traversal');
    path.push(id);
    let i = 0;
    while (i < n.keys.length && p.searchKey > (n.keys[i] ?? Infinity)) i++;
    if (n.keys[i] === p.searchKey) return { path, found: true };
    id = n.children[i];
  }
  return { path, found: false };
}
export const HashObjectGraphSchema = z
  .strictObject({
    objects: z
      .array(
        z.strictObject({
          id: StableIdSchema,
          kind: z.enum(['blob', 'tree', 'commit']),
          label: displayText(16),
        }),
      )
      .max(6),
    edges: z
      .array(
        z.strictObject({
          from: StableIdSchema,
          to: StableIdSchema,
          meaning: z.enum(['root', 'entry', 'parent']),
        }),
      )
      .max(8),
    illustrative,
  })
  .superRefine((p, c) => {
    const bad = (message: string) => c.addIssue({ code: 'custom', message });
    const map = new Map(p.objects.map((o) => [o.id, o]));
    if (map.size !== p.objects.length) bad('Object IDs must be unique');
    const edges = new Set<string>();
    for (const e of p.edges) {
      const a = map.get(e.from),
        b = map.get(e.to),
        key = `${e.from}/${e.to}/${e.meaning}`;
      if (edges.has(key)) bad('Duplicate edge');
      edges.add(key);
      if (
        !a ||
        !b ||
        e.from === e.to ||
        !(e.meaning === 'root'
          ? a.kind === 'commit' && b.kind === 'tree'
          : e.meaning === 'parent'
            ? a.kind === 'commit' && b.kind === 'commit'
            : a.kind === 'tree' && (b.kind === 'tree' || b.kind === 'blob'))
      )
        bad(
          'Git edges must be commit→root tree, commit→parent commit, or tree→tree/blob entry',
        );
    }
    for (const o of p.objects)
      if (
        o.kind === 'commit' &&
        p.edges.filter((e) => e.from === o.id && e.meaning === 'root')
          .length !== 1
      )
        bad('Each illustrated commit needs exactly one root tree');
    const visiting = new Set<string>(),
      done = new Set<string>();
    const visit = (id: string) => {
      if (visiting.has(id)) {
        bad('Object references must be acyclic');
        return;
      }
      if (done.has(id)) return;
      visiting.add(id);
      p.edges
        .filter((e) => e.from === id)
        .forEach((e) => {
          visit(e.to);
        });
      visiting.delete(id);
      done.add(id);
    };
    p.objects.forEach((o) => {
      visit(o.id);
    });
  });
export const CodeTraceSchema = z
  .strictObject({
    snippetId: StableIdSchema,
    review: z.strictObject({
      reviewer: displayText(80),
      rationale: displayText(300),
      reviewed: trueSchema(),
    }),
    lines: z.array(displayText(38)).min(1).max(6),
    steps: z
      .array(
        z.strictObject({ line: z.int().min(1).max(6), state: displayText(28) }),
      )
      .min(1)
      .max(8),
    illustrative,
  })
  .superRefine((p, c) => {
    if (p.steps.some((s) => s.line > p.lines.length))
      c.addIssue({
        code: 'custom',
        message: 'Trace line is outside reviewed snippet',
      });
  });
function trueSchema() {
  return z.literal(true);
}
export const FileTransferSchema = z.strictObject({
  direction: z.enum(['upload', 'download']),
  fileLabel: displayText(16),
  outcome: z.enum(['complete', 'failed']),
  illustrative,
});
export const CacheAsideSceneSchema = z.strictObject({
  visualPhase: z.enum(['lookup', 'miss', 'fill', 'hit']),
  keyLabel: displayText(14),
  valueLabel: displayText(14),
  illustrative,
});
export const LayeredAssetSceneSchema = z
  .strictObject({
    layers: z
      .array(
        z.strictObject({
          id: StableIdSchema,
          asset: AssetRefSchema,
          x: z.number().min(140).max(700),
          y: z.number().min(520).max(1060),
          width: z.number().min(100).max(600),
          height: z.number().min(100).max(600),
          fit: z.enum(['contain', 'cover']),
          depth: z.number().min(0).max(1),
          panX: z.number().min(-24).max(24),
          panY: z.number().min(-24).max(24),
          zoom: z.number().min(1).max(1.08),
          enter: unit,
          exit: unit,
        }),
      )
      .min(1)
      .max(4),
    intent: z.enum(['reveal', 'compare', 'focus']),
    illustrative,
  })
  .superRefine((p, c) => {
    if (new Set(p.layers.map((l) => l.id)).size !== p.layers.length)
      c.addIssue({ code: 'custom', message: 'Layer IDs must be unique' });
    for (const l of p.layers)
      if (
        l.enter + 0.1 >= l.exit ||
        l.x + l.width * l.zoom + Math.abs(l.panX) + 16 > 900 ||
        l.y + l.height * l.zoom + Math.abs(l.panY) + 16 > 1280
      )
        c.addIssue({
          code: 'custom',
          message:
            'Layers need entrance/exit clearance and must fit the caption-safe content rectangle',
        });
  });
