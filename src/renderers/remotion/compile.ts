import {
  COMPOSITION_VERSION,
  type ComposedCue,
  type ComposedEntity,
} from '../../domain/composed.ts';
import type { Scene, VideoScript } from '../../domain/videoscript.ts';
import { componentRegistry } from '../../domain/visuals.ts';
import {
  type Curve,
  curvePoint,
  easeInOut,
} from '../../visuals/cache-aside-state.ts';
import {
  groupBox,
  type NodeBox,
  nodeBox,
  nodeRect,
  overlaps,
  type Rect,
  tokenEnvelope,
  tokenLane,
} from './composed-layout.ts';
import { RenderInputError } from './input-error.ts';

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export class UnsupportedCapability extends RenderInputError {
  readonly diagnostic = 'unsupportedCapability';
  readonly previousSceneId: string | null;
  constructor(
    sceneId: string,
    path: string,
    reason: string,
    previous: string | null = null,
  ) {
    super(
      `${reason}; choose a supported explicit storyboard revision`,
      sceneId,
      path,
    );
    this.previousSceneId = previous;
  }
}
export type PlacedEntity = {
  entity: ComposedEntity;
  x: number;
  y: number;
  opacity: number;
  highlight: number;
  status: string;
  box?: NodeBox;
};
export type Track = {
  cue: ComposedCue;
  from: number;
  to: number;
  curve?: Curve;
};
export type CompiledScene = {
  sceneId: string;
  from: number;
  durationFrames: number;
  visual: Scene['visual'];
  entities: PlacedEntity[];
  tracks: Track[];
  links: { id: string; curve: Curve }[];
  boundary: {
    kind: 'cut' | 'crossfade' | 'match';
    frames: number;
    entityIds: string[];
  };
  dependency: string;
};
export interface CompiledVisualPlan {
  compilerVersion: string;
  catalogVersion: string;
  durationFrames: number;
  scenes: CompiledScene[];
}
const point = (layout: string, slot: number) =>
  layout === 'row'
    ? { x: 242 + slot * 260, y: 858 }
    : layout === 'column'
      ? { x: 504, y: 620 + slot * 240 }
      : { x: 284 + (slot % 2) * 440, y: 600 + Math.floor(slot / 2) * 240 };
const wire = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): Curve => {
  const bend =
    a.y === b.y
      ? (b.x > a.x ? -1 : -0.6) * Math.min(90, Math.abs(b.x - a.x) * 0.18)
      : 0;
  return [
    a,
    { x: a.x + (b.x - a.x) / 3, y: (a.y + b.y) / 2 + bend },
    { x: a.x + (2 * (b.x - a.x)) / 3, y: (a.y + b.y) / 2 + bend },
    b,
  ];
};

/** Pure compilation from an existing (silent or measured) frame partition. Never chooses time. */
export function compileVisualPlan(
  script: VideoScript,
  partition: { scene: Scene; from: number; durationFrames: number }[],
): CompiledVisualPlan {
  if (
    script.target.width !== 1080 ||
    script.target.height !== 1920 ||
    script.target.fps !== 30
  )
    throw new UnsupportedCapability(
      script.scenes[0]?.scene_id ?? 'unknown',
      '$.target',
      'Compiler requires the existing vertical 30fps target',
    );
  const scenes: CompiledScene[] = [];
  for (const [index, item] of partition.entries()) {
    const v = item.scene.visual,
      id = item.scene.scene_id;
    const fail: (path: string, reason: string) => never = (path, reason) => {
      throw new UnsupportedCapability(
        id,
        `$.scenes[${index}].${path}`,
        reason,
        scenes.at(-1)?.sceneId ?? null,
      );
    };
    const entities: PlacedEntity[] = [],
      tracks: Track[] = [];
    const paths: { id: string; curve: Curve }[] = [];
    if (v.type === 'composed') {
      const lane = tokenLane(v.props.entities);
      const port = (node: PlacedEntity) =>
        v.props.layout === 'column'
          ? { x: 798, y: node.y }
          : { x: node.x, y: node.y - lane };
      for (const entity of v.props.entities.filter((e) => e.kind === 'node')) {
        if (entity.kind !== 'node') continue;
        entities.push({
          entity,
          ...point(v.props.layout, entity.slot),
          opacity: 1,
          highlight: 0,
          status: '',
          box: nodeBox(entity, v.props.layout, v.cues),
        });
      }
      for (const entity of v.props.entities.filter((e) => e.kind === 'token')) {
        if (entity.kind !== 'token') continue;
        const origin = entities.find((e) => e.entity.id === entity.at);
        if (!origin) fail('visual.props.entities', 'Token origin missing');
        entities.push({
          entity,
          ...port(origin),
          opacity: 1,
          highlight: 0,
          status: '',
        });
      }
      for (const l of v.props.links) {
        const a = entities.find((e) => e.entity.id === l.from),
          b = entities.find((e) => e.entity.id === l.to);
        if (!a || !b) fail('visual.props.links', 'Missing link endpoint');
        paths.push({
          id: l.id,
          curve: wire(port(a), port(b)),
        });
      }
      const ordered = [...v.cues].sort(
        (a, b) =>
          (a.trigger.kind === 'progress' ? a.trigger.from : 0) -
          (b.trigger.kind === 'progress' ? b.trigger.from : 0),
      );
      const locations = new Map(
        v.props.entities
          .filter((e) => e.kind === 'token')
          .map((e) => [e.id, e.kind === 'token' ? e.at : '']),
      );
      for (const c of ordered) {
        if (c.trigger.kind !== 'progress')
          fail(
            'visual.cues',
            'Phrase action requires reviewed measured alignment',
          );
        const trigger = c.trigger as {
          kind: 'progress';
          from: number;
          to: number;
        };
        const from = Math.round(trigger.from * (item.durationFrames - 1)),
          to = Math.round(trigger.to * (item.durationFrames - 1));
        if (to <= from)
          fail('visual.cues', 'Cue collapses at the measured frame resolution');
        const target = entities.find((e) => e.entity.id === c.action.target);
        if (!target)
          fail(
            'visual.cues',
            `Unknown action target ${c.action.target} in cue ${c.cue_id}`,
          );
        const t: Track = { cue: c, from, to };
        if (c.action.kind === 'move') {
          if (
            target.entity.kind !== 'token' ||
            typeof c.action.value !== 'string'
          )
            fail(
              'visual.cues',
              'Move requires a token and link or destination node ID',
            );
          const link = v.props.links.find((l) => l.id === c.action.value),
            origin = locations.get(c.action.target);
          const dest = link?.to ?? c.action.value;
          if (link && link.from !== origin)
            fail(
              'visual.cues',
              'Movement link does not start at token location',
            );
          const a = entities.find((e) => e.entity.id === origin),
            b = entities.find(
              (e) => e.entity.id === dest && e.entity.kind === 'node',
            );
          if (!a || !b) fail('visual.cues', 'Movement references unknown node');
          t.curve = wire(port(a), port(b));
          locations.set(c.action.target, b.entity.id);
          if (
            tracks.some(
              (old) =>
                old.cue.action.kind === 'move' &&
                old.cue.action.target === c.action.target &&
                from < old.to,
            )
          )
            fail('visual.cues', 'Token movement windows overlap');
        } else if (c.action.kind === 'update_field') {
          if (
            target.entity.kind !== 'node' ||
            typeof c.action.value !== 'string' ||
            c.action.value.length > 24
          )
            fail(
              'visual.cues',
              'Status must be literal text of at most 24 characters',
            );
        } else if (c.action.kind === 'focus') {
          if (
            tracks.some(
              (old) => old.cue.action.kind === 'focus' && from < old.to,
            )
          )
            fail('visual.cues', 'Camera focus windows overlap');
          if (
            v.props.camera !== 'gentle-focus' ||
            target.entity.kind !== 'node'
          )
            fail(
              'visual.cues',
              'Focus requires gentle-focus camera and a node',
            );
        } else if (c.action.value !== undefined)
          fail('visual.cues', 'This action accepts no value');
        tracks.push(t);
      }
      for (const frame of tracks.flatMap((t) => [t.from, t.to]))
        if (
          tracks.filter((t) => t.curve && frame >= t.from && frame < t.to)
            .length > 2
        )
          fail('visual.cues', 'At most two concurrent moving tokens');
      const nodes = entities.filter((e): e is PlacedEntity & { box: NodeBox } =>
        Boolean(e.box),
      );
      const within = (r: Rect) =>
        r.left >= 96 && r.right <= 912 && r.top >= 420 && r.bottom <= 1280;
      for (const [i, n] of nodes.entries()) {
        const rect = nodeRect(n.x, n.y, n.box);
        if (
          !within({ ...rect, right: rect.right + 8, bottom: rect.bottom + 14 })
        )
          fail(
            `visual.props.entities[${v.props.entities.findIndex((e) => e.id === n.entity.id)}]`,
            `Node ${n.entity.id} text/status/asset exceeds the content area; shorten copy or choose a roomier layout`,
          );
        for (const other of nodes.slice(i + 1))
          if (overlaps(rect, nodeRect(other.x, other.y, other.box), 8))
            fail(
              'visual.props.layout',
              `Nodes ${n.entity.id}/${other.entity.id} need more text/status clearance; use row layout or shorter copy`,
            );
      }
      for (const e of entities.filter((e) => e.entity.kind === 'token')) {
        const envelope = tokenEnvelope(e.entity.label);
        const curves = tracks
          .filter((t) => t.cue.action.target === e.entity.id && t.curve)
          .map((t) => t.curve as Curve);
        const points = [{ x: e.x, y: e.y }, ...curves.flat()];
        const bounds = {
          left: Math.min(...points.map((p) => p.x)) - envelope.half,
          right: Math.max(...points.map((p) => p.x)) + envelope.half,
          top: Math.min(...points.map((p) => p.y)) + envelope.top,
          bottom: Math.max(...points.map((p) => p.y)) + envelope.bottom,
        };
        if (!within(bounds))
          fail(
            'visual.cues',
            `Token ${e.entity.id} label/path exceeds the content area; shorten its label or choose row/column layout`,
          );
        for (const n of nodes)
          if (overlaps(bounds, nodeRect(n.x, n.y, n.box), 8))
            fail(
              'visual.props.layout',
              `Token ${e.entity.id} path/label crosses node ${n.entity.id}; grid routing is bounded, choose row/column or revise endpoints`,
            );
      }
      for (const g of v.props.groups) {
        const bounds = groupBox(
          nodes.filter((n) => g.members.includes(n.entity.id)),
          g.label,
        );
        if (!within(bounds))
          fail(
            'visual.props.groups',
            `Group ${g.id} label/enclosure exceeds the content area; shorten copy or reduce members`,
          );
        for (const n of nodes.filter((n) => !g.members.includes(n.entity.id)))
          if (overlaps(bounds, nodeRect(n.x, n.y, n.box)))
            fail(
              'visual.props.groups',
              `Group ${g.id} encloses unrelated node ${n.entity.id}; use contiguous members`,
            );
      }
    }
    const policy =
      'transition' in item.scene ? item.scene.transition : undefined;
    const previous = scenes.at(-1),
      kind = policy?.kind ?? 'cut';
    const boundary: CompiledScene['boundary'] = {
      kind,
      frames: kind === 'cut' ? 0 : 12,
      entityIds: policy?.kind === 'match' ? policy.entityIds : [],
    };
    if (kind !== 'cut') {
      if (!previous || item.durationFrames < 12 || previous.durationFrames < 12)
        fail(
          'transition',
          'Transition requires two adjacent scenes of at least twelve frames',
        );
      for (const visual of [previous.visual, v])
        if (
          visual.type === 'title-card' ||
          !componentRegistry[visual.component].crossfade
        )
          fail(
            'transition',
            'This scene pair has no registered compatible SVG content layer',
          );
      if (kind === 'match') {
        if (
          previous.visual.type !== 'composed' ||
          v.type !== 'composed' ||
          previous.visual.props.camera !== v.props.camera ||
          previous.visual.props.layout !== v.props.layout
        )
          fail(
            'transition',
            'Object handoff requires compatible composed scenes/camera',
          );
        if (new Set(boundary.entityIds).size !== boundary.entityIds.length)
          fail('transition', 'Duplicate matched ID');
        for (const shared of boundary.entityIds) {
          const a = previous.entities.find(
              (e) => e.entity.id === shared,
            )?.entity,
            b = entities.find((e) => e.entity.id === shared)?.entity;
          const identity = (e: ComposedEntity | undefined) =>
            e
              ? {
                  kind: e.kind,
                  label: e.label,
                  role: e.role,
                  ...(e.kind === 'node'
                    ? { depth: e.depth, asset: e.asset }
                    : {}),
                }
              : null;
          if (!a || !b || canonical(identity(a)) !== canonical(identity(b)))
            fail(
              'transition',
              `Matched object ${shared} is absent or has incompatible identity`,
            );
          if (
            a.kind === 'node' &&
            canonical(
              previous.entities.find((e) => e.entity.id === shared)?.box,
            ) !== canonical(entities.find((e) => e.entity.id === shared)?.box)
          )
            fail(
              'transition',
              `Matched node ${shared} has incompatible reserved text/status geometry`,
            );
          const oldState = composedState(
            previous,
            previous.durationFrames - 1,
          ).entities.find((e) => e.entity.id === shared);
          if (!oldState)
            fail('transition', 'Missing matched predecessor state');
          if (oldState.status !== '' || oldState.opacity !== 1)
            fail(
              'transition',
              'Matched terminal status/visibility requires an explicit compatible revision',
            );
          if (tracks.some((t) => t.cue.action.target === shared && t.from < 12))
            fail(
              'transition',
              'Matched objects cannot act during the handoff window',
            );
        }
      }
    }
    const dependency = canonical({
      compiler: COMPOSITION_VERSION,
      visual: v,
      boundary,
      previous:
        kind === 'cut'
          ? null
          : {
              visual: previous?.visual,
              entities: previous?.entities,
              tracks: previous?.tracks,
              durationFrames: previous?.durationFrames,
            },
    });
    scenes.push({
      sceneId: id,
      from: item.from,
      durationFrames: item.durationFrames,
      visual: v,
      entities,
      tracks,
      links: paths,
      boundary,
      dependency,
    });
  }
  return {
    compilerVersion: COMPOSITION_VERSION,
    catalogVersion: COMPOSITION_VERSION,
    durationFrames: partition.reduce((sum, s) => sum + s.durationFrames, 0),
    scenes,
  };
}

/** Stateless evaluation: safe for shuffled frames, cached ranges and terminal-pose transitions. */
export function composedState(
  scene: CompiledScene,
  frame: number,
): {
  entities: PlacedEntity[];
  camera: { x: number; y: number; zoom: number };
} {
  if (!Number.isInteger(frame) || frame < 0 || frame >= scene.durationFrames)
    throw new RangeError('Composed frame outside measured scene');
  const entities = scene.entities.map((e) => ({
    ...e,
    opacity:
      scene.tracks.find(
        (t) =>
          t.cue.action.target === e.entity.id &&
          ['appear', 'disappear'].includes(t.cue.action.kind),
      )?.cue.action.kind === 'appear'
        ? 0
        : 1,
  }));
  const camera = { x: 0, y: 0, zoom: 1 };
  for (const t of scene.tracks) {
    const e = entities.find((e) => e.entity.id === t.cue.action.target);
    if (!e) throw new Error('Compiled reference disappeared');
    if (frame < t.from) continue;
    const u = easeInOut((frame - t.from) / (t.to - t.from));
    switch (t.cue.action.kind) {
      case 'appear':
        e.opacity = u;
        break;
      case 'disappear':
        e.opacity = 1 - u;
        break;
      case 'move':
        if (frame >= t.from && t.curve)
          Object.assign(e, curvePoint(t.curve, u));
        break;
      case 'highlight':
        e.highlight = u === 0 || u === 1 ? 0 : Math.sin(Math.PI * u);
        break;
      case 'update_field':
        if (frame >= t.to) e.status = String(t.cue.action.value);
        break;
      case 'focus':
        if (frame >= t.to) break;
        camera.zoom = 1 + 0.04 * Math.sin(Math.PI * u);
        camera.x = (504 - e.x) * 0.025 * Math.sin(Math.PI * u);
        camera.y = (850 - e.y) * 0.025 * Math.sin(Math.PI * u);
        break;
    }
  }
  return { entities, camera };
}

export function boundaryState(
  plan: CompiledVisualPlan,
  index: number,
  localFrame: number,
) {
  const scene = plan.scenes[index];
  if (!scene) throw new RangeError('Unknown compiled scene');
  const active =
    scene.boundary.kind !== 'cut' && localFrame < scene.boundary.frames;
  return {
    active,
    progress: active ? localFrame / (scene.boundary.frames - 1) : 1,
    previous: active ? plan.scenes[index - 1] : undefined,
  };
}

/** Relative opacities inside the unchanged content crossfade: headings fade through. */
export function boundaryHeadings(progress: number) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1)
    throw new RangeError('Boundary progress outside [0,1]');
  return {
    outgoing: progress < 0.5 ? (1 - 2 * progress) / (1 - progress) : 0,
    incoming: progress > 0.5 ? (2 * progress - 1) / progress : 0,
  };
}
