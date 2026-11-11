import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { directorContract } from '../../src/director/contracts.ts';
import { generateDraft, importDraft } from '../../src/director/core.ts';
import {
  BTreeLookupSchema,
  CodeTraceSchema,
  EventQueueSchema,
  HashObjectGraphSchema,
  LayeredAssetSceneSchema,
  treeSearch,
} from '../../src/domain/library.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import {
  libraryRegistry,
  RegisteredVisualSchema,
} from '../../src/domain/visual-library-registry.ts';
import { componentRegistry } from '../../src/domain/visuals.ts';
import { MockLLMProvider } from '../../src/llm/provider.ts';
import { planSilentRender } from '../../src/renderers/remotion/plan.ts';
import {
  mechanismProgress,
  queueSchedule,
  queueState,
  transferState,
} from '../../src/visuals/library-state.ts';
import { sceneKey } from '../../src/workflow/dependencies.ts';
import { researchFixture } from '../director/helpers.ts';
import { fixture } from '../helpers/fixture.ts';

function visual(id: keyof typeof libraryRegistry) {
  return RegisteredVisualSchema.parse({
    type: 'registered-animation',
    component: id,
    taxonomy_version: '1.0.0',
    props: libraryRegistry[id].example,
    cues: [],
  });
}
function script(id: keyof typeof libraryRegistry) {
  const s = fixture();
  return parseVideoScript({
    ...s,
    schema_version: '1.1.0',
    scenes: [
      {
        ...s.scenes[1],
        ...(id === 'CityDemandHeatmap'
          ? {
              timing: {
                min_seconds: 16,
                preferred_seconds: 16,
                max_seconds: 20,
              },
            }
          : {}),
        visual: visual(id),
      },
    ],
  });
}
test('authoritative catalog, schema and static render bindings cover the same actual components', async () => {
  const exported = directorContract(fixture());
  assert.deepEqual(
    Object.keys(exported.catalog.components).sort(),
    Object.keys(componentRegistry).sort(),
  );
  const binding = await readFile('src/renderers/remotion/registry.tsx', 'utf8');
  assert.match(binding, /Object.entries\(libraryRegistry\)/);
  for (const id of Object.keys(
    libraryRegistry,
  ) as (keyof typeof libraryRegistry)[]) {
    const s = script(id);
    assert.equal(planSilentRender(s).scenes.length, 1);
    const entry = exported.catalog.components[id];
    assert.ok(entry && 'description' in entry);
    if ('example' in entry) assert.ok(parseVideoScript(entry.example));
    assert.deepEqual(
      entry.props,
      (await import('zod')).z.toJSONSchema(libraryRegistry[id].schema),
    );
  }
  for (const id of ['scene_3d', 'map_heatmap', 'MadeUp'])
    assert.throws(() =>
      parseVideoScript({
        ...fixture(),
        schema_version: '1.1.0',
        scenes: [
          {
            ...fixture().scenes[1],
            visual: { ...visual('EventQueue'), component: id },
          },
        ],
      }),
    );
});
test('queue capacity excludes in-service work; tied arrivals are stable; completion admits blocked work first', () => {
  const p = EventQueueSchema.parse({
    queueCapacity: 1,
    consumptionTime: 0.2,
    overflowPolicy: 'block',
    events: ['A', 'B', 'C', 'D'].map((id) => ({ id, label: id, arrival: 0.1 })),
    illustrative: true,
  });
  const schedule = queueSchedule(p);
  assert.deepEqual(
    schedule.map((i) => i.start),
    [0.1, 0.30000000000000004, 0.5, 0.7],
  );
  assert.equal(queueState(p, 0.15).waiting.length, 1);
  assert.equal(queueState(p, 0.15).blocked.length, 2);
  for (let f = 0; f <= 100; f++)
    assert.ok(queueState(p, f / 100).waiting.length <= 1);
  assert.equal(queueState(p, 1).completed.length, 4);
  const drop = { ...p, overflowPolicy: 'drop' as const };
  assert.equal(queueState(drop, 1).dropped.length, 2);
  assert.equal(queueState(drop, 1).completed.length, 2);
  assert.equal(queueState({ ...p, events: [] }, 0.5).processing, undefined);
  assert.equal(
    EventQueueSchema.safeParse({ ...p, queueCapacity: 0 }).success,
    false,
  );
  assert.equal(
    EventQueueSchema.safeParse({ ...p, events: [p.events[0], p.events[0]] })
      .success,
    false,
  );
});
test('B-tree search follows sorted ranges and rejects cycles, multiple parents, imbalance, bad keys and invalid fanout', () => {
  const p = BTreeLookupSchema.parse(libraryRegistry.BTreeLookup.example);
  assert.deepEqual(treeSearch(p), { path: ['root', 'right'], found: true });
  assert.deepEqual(treeSearch({ ...p, searchKey: 99 }), {
    path: ['root', 'right'],
    found: false,
  });
  for (const mutate of [
    (v: typeof p) => {
      v.nodes[1]?.children.push('root');
    },
    (v: typeof p) => {
      if (v.nodes[2]) v.nodes[2].keys = [1, 2];
    },
    (v: typeof p) => {
      if (v.nodes[0]) v.nodes[0].children = ['left', 'left'];
    },
    (v: typeof p) => {
      if (v.nodes[1]) v.nodes[1].keys = [10, 5];
    },
    (v: typeof p) => {
      v.nodes.push({ id: 'orphan', keys: [1], children: [] });
    },
  ]) {
    const v = structuredClone(p);
    mutate(v);
    assert.equal(BTreeLookupSchema.safeParse(v).success, false);
  }
  const empty = BTreeLookupSchema.parse({
    ...p,
    nodes: [{ id: 'root', keys: [], children: [] }],
  });
  assert.equal(treeSearch(empty).found, false);
});
test('Git edge semantics enforce directed object relationships and no fake calculated hashes', () => {
  const p = HashObjectGraphSchema.parse(
    libraryRegistry.HashObjectGraph.example,
  );
  assert.equal(p.illustrative, true);
  for (const edge of [
    { from: 'blob', to: 'tree', meaning: 'entry' },
    { from: 'commit', to: 'blob', meaning: 'root' },
    { from: 'tree', to: 'missing', meaning: 'entry' },
    { from: 'tree', to: 'tree', meaning: 'entry' },
  ])
    assert.equal(
      HashObjectGraphSchema.safeParse({ ...p, edges: [...p.edges, edge] })
        .success,
      false,
    );
  assert.equal(
    HashObjectGraphSchema.safeParse({ ...p, edges: [] }).success,
    false,
  );
  assert.ok(
    HashObjectGraphSchema.parse({ objects: [], edges: [], illustrative: true }),
  );
});
test('reviewed code is bounded inert text and line references never execute', () => {
  const p = CodeTraceSchema.parse(libraryRegistry.CodeTrace.example);
  assert.equal(
    CodeTraceSchema.safeParse({
      ...p,
      steps: [{ line: 6, state: 'out of range' }],
    }).success,
    false,
  );
  assert.equal(
    CodeTraceSchema.safeParse({
      ...p,
      review: { ...p.review, reviewed: false },
    }).success,
    false,
  );
  assert.equal(
    CodeTraceSchema.safeParse({ ...p, lines: Array(7).fill('x') }).success,
    false,
  );
  assert.equal(
    CodeTraceSchema.parse({
      ...p,
      lines: ['process.exit(99)'],
      steps: [{ line: 1, state: 'literal display only' }],
    }).lines[0],
    'process.exit(99)',
  );
});
test('mechanism cue supports measured timing, rejects ambiguous actions and is out-of-order deterministic', () => {
  const v = visual('FileTransfer');
  v.cues = [
    {
      cue_id: 'transfer',
      trigger: { kind: 'progress', from: 0.2, to: 0.8 },
      action: { kind: 'move', target: 'mechanism' },
    },
  ];
  assert.equal(mechanismProgress(v, 0, 301), 0);
  assert.equal(mechanismProgress(v, 300, 301), 1);
  const middle = mechanismProgress(v, 150, 301);
  mechanismProgress(v, 5, 301);
  assert.equal(mechanismProgress(v, 150, 301), middle);
  for (const target of ['window', 'http-request'])
    assert.equal(
      RegisteredVisualSchema.safeParse({
        ...v,
        cues: [{ ...v.cues[0], action: { kind: 'move', target } }],
      }).success,
      false,
    );
  assert.equal(transferState(1, 'failed').store, 0);
  assert.equal(transferState(1, 'failed').status, 'Transfer failed');
  assert.equal(transferState(1, 'complete').store, 1);
  assert.notEqual(
    transferState(0.14, 'complete').upload,
    transferState(0.25, 'complete').upload,
  );
});
test('layer geometry and asset identities are bounded; asset or review edits invalidate only visual cache keys', () => {
  const p = LayeredAssetSceneSchema.parse(
    libraryRegistry.LayeredAssetScene.example,
  );
  assert.equal(
    LayeredAssetSceneSchema.safeParse({
      ...p,
      layers: [{ ...p.layers[0], x: 700 }],
    }).success,
    false,
  );
  assert.equal(
    LayeredAssetSceneSchema.safeParse({
      ...p,
      layers: [{ ...p.layers[0], asset: { url: 'https://bad.invalid/a.png' } }],
    }).success,
    false,
  );
  const s = script('LayeredAssetScene').scenes[0];
  assert.ok(s);
  const key = sceneKey(s, {}, {}, {});
  const changed = structuredClone(s);
  if (
    changed.visual.type === 'registered-animation' &&
    changed.visual.component === 'LayeredAssetScene'
  ) {
    const l = changed.visual.props.layers[0];
    assert.ok(l);
    l.asset.recordSha256 = 'a'.repeat(64);
  }
  assert.notEqual(sceneKey(changed, {}, {}, {}), key);
});
test('Director flags slideshow-only mechanisms and imports caching mechanisms through the same contract', async () => {
  const old = fixture();
  old.scenes = Array.from({ length: 3 }, (_, i) => ({
    ...old.scenes[0],
    scene_id: `card-${i}`,
  })) as typeof old.scenes;
  assert.throws(() => importDraft(JSON.stringify(old)), /mechanism storyboard/);
  const caching = JSON.parse(
    await readFile('examples/phase11/caching.videoscript.json', 'utf8'),
  );
  const draft = importDraft(JSON.stringify(caching));
  assert.ok(
    draft.script.scenes.every(
      (s) =>
        s.visual.type === 'registered-animation' &&
        s.visual.component === 'CacheAsideScene',
    ),
  );
  assert.equal(draft.approvedForRelease, false);
  const { bundle, ledger, script: s } = await researchFixture();
  const output = await generateDraft(
    new MockLLMProvider([JSON.stringify(s)]),
    bundle,
    ledger,
    undefined,
    fixture(),
  );
  assert.equal(output.approvedForRelease, false);
});
