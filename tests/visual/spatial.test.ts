import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { z } from 'zod';
import {
  directorContract,
  validateStoryboard,
} from '../../src/director/contracts.ts';
import { importDraft } from '../../src/director/core.ts';
import {
  CITY_DEMAND_EXAMPLE,
  CityDemandHeatmapSchema,
} from '../../src/domain/spatial.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import { planSilentRender } from '../../src/renderers/remotion/plan.ts';
import {
  planNarratedRender,
  resolvePresentation,
} from '../../src/timing/timeline.ts';
import { preflightVisualAssets } from '../../src/visual-assets/store.ts';
import {
  CITY_BEATS,
  cityDemandState,
  projectCity,
} from '../../src/visuals/city-demand-state.ts';
import { mechanismProgress } from '../../src/visuals/library-state.ts';
import { audioKey, sceneKey } from '../../src/workflow/dependencies.ts';

const fixture = async () =>
  parseVideoScript(
    JSON.parse(
      await readFile('examples/phase11b/city-demand.videoscript.json', 'utf8'),
    ),
  );
const props = () =>
  CityDemandHeatmapSchema.parse(structuredClone(CITY_DEMAND_EXAMPLE));
test('spatial inputs reject executable/remote content, excess geometry/data, real coordinates and malformed road routes', () => {
  const p = props();
  for (const patch of [
    { shader: 'void main(){}' },
    { model: 'https://bad.invalid/a.glb' },
    { cameraPreset: 'free-orbit' },
    { renderMode: 'three' },
    { sceneType: 'uber-live' },
    { illustrative: false },
    { dataKind: 'live' },
    { focusCell: { x: 5, y: 0 } },
    { assetIds: ['unreviewed-texture'] },
    { density: p.density.slice(0, 3) },
    { density: Array(4).fill(Array(26).fill(0)) },
    { density: Array(4).fill(Array(25).fill(1.1)) },
    { density: Array(4).fill(Array(25).fill(Number.NaN)) },
    { vehicles: Array(7).fill(p.vehicles[0]) },
    { vehicles: [] },
    { vehicles: [p.vehicles[0], p.vehicles[0]] },
    {
      vehicles: [{ id: 'diagonal', route: Array(5).fill({ x: 0.5, y: 0.5 }) }],
    },
    {
      vehicles: [
        {
          id: 'road-cross',
          route: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            { x: 1, y: 3 },
            { x: 1, y: 4 },
          ],
        },
      ],
    },
    {
      vehicles: [
        { id: 'location', route: Array(5).fill({ x: 77.5, y: 12.8 }) },
      ],
    },
  ])
    assert.equal(
      CityDemandHeatmapSchema.safeParse({ ...p, ...patch }).success,
      false,
      JSON.stringify(patch),
    );
});
test('authored synthetic provenance, runtime schema, Director catalog and renderer stay in parity', async () => {
  const s = await fixture();
  const contract = directorContract(s);
  assert.deepEqual(
    contract.catalog.components.CityDemandHeatmap?.props,
    z.toJSONSchema(CityDemandHeatmapSchema),
  );
  assert.ok(contract.catalog.taxonomy.renderable.includes('map_heatmap'));
  assert.deepEqual(contract.catalog.taxonomy.reserved, ['scene_3d']);
  const entry = contract.catalog.components.CityDemandHeatmap;
  assert.ok(entry && 'example' in entry);
  validateStoryboard(parseVideoScript(entry.example));
  const p = props();
  assert.equal(
    s.sources[0]?.content_sha256,
    hash(JSON.stringify({ density: p.density, vehicles: p.vehicles })),
  );
  assert.equal(importDraft(JSON.stringify(s)).approvedForRelease, false);
  assert.deepEqual(await preflightVisualAssets(s), []);
  assert.equal(planSilentRender(s).durationFrames, 480);
  assert.ok(
    parseVideoScript(
      JSON.parse(
        await readFile('examples/phase11b/minimal.videoscript.json', 'utf8'),
      ),
    ),
  );
});
test('duration budgets, registered cue anchors and legacy/unknown rejection fail closed', async () => {
  const s = await fixture();
  for (const seconds of [1, 7, 600]) {
    const bad = structuredClone(s);
    const first = bad.scenes[0];
    assert.ok(first);
    first.timing = {
      min_seconds: seconds,
      preferred_seconds: seconds,
      max_seconds: seconds,
    };
    assert.throws(() => parseVideoScript(bad), /validation failed/);
  }
  assert.throws(() => parseVideoScript({ ...s, schema_version: '1.0.0' }));
  const bad = JSON.parse(JSON.stringify(s));
  bad.scenes[0].visual.component = 'CloudStorage3D';
  assert.throws(() => parseVideoScript(bad), /validation failed/);
  const first = s.scenes[0];
  assert.ok(first && first.visual.type === 'registered-animation');
  first.visual.cues = [
    {
      cue_id: 'bad',
      trigger: { kind: 'progress', from: 0.1, to: 0.8 },
      action: { kind: 'highlight', target: 'shader' },
    },
  ];
  assert.throws(() => parseVideoScript(s));
});
test('vehicles and density change independent of camera; narrative beats join continuously; replay is stateless', () => {
  const p = props(),
    saved = JSON.stringify(p);
  const reference = Array.from({ length: 601 }, (_, f) =>
    cityDemandState(p, f / 600),
  );
  for (const f of [599, 25, 310, 0, 600, 310, 35])
    assert.deepEqual(cityDemandState(p, f / 600), reference[f]);
  assert.equal(JSON.stringify(p), saved);
  assert.notDeepEqual(reference[80]?.vehicles, reference[110]?.vehicles);
  assert.notDeepEqual(reference[180]?.density, reference[250]?.density);
  assert.ok((reference[360]?.camera.zoom ?? 0) > 1.1);
  assert.equal(reference[0]?.camera.zoom, 1);
  assert.equal(reference[600]?.camera.zoom, 1);
  const focus = { x: p.focusCell.x + 0.5, y: p.focusCell.y + 0.5 };
  const distance = (t: number) =>
    cityDemandState(p, t).vehicles.reduce(
      (n, v) => n + Math.hypot(v.x - focus.x, v.y - focus.y),
      0,
    );
  assert.ok(distance(0.75) < distance(0.5));
  for (let i = 0; i < 3; i++) {
    const a = CITY_BEATS[i],
      b = CITY_BEATS[i + 1];
    assert.ok(a && b);
    const left = cityDemandState({ ...p, storyBeat: a }, 1),
      right = cityDemandState({ ...p, storyBeat: b }, 0);
    assert.deepEqual(left, right);
  }
  const wide = cityDemandState({ ...p, cameraPreset: 'wide' }, 0.55);
  assert.equal(wide.camera.zoom, 1);
  assert.notDeepEqual(
    wide.vehicles,
    cityDemandState({ ...p, cameraPreset: 'wide' }, 0.6).vehicles,
  );
  const zero = cityDemandState(
    {
      ...p,
      density: Array.from({ length: 4 }, () => Array<number>(25).fill(0)),
    },
    0.6,
  );
  assert.equal(zero.focusIntensity, 0);
});
test('both camera presets and fallback keep roads/vehicles within the mobile content region', () => {
  for (const renderMode of ['isometric-svg', 'flat-svg'] as const)
    for (const cameraPreset of ['follow-demand', 'wide'] as const)
      for (const focusCell of [
        { x: 0, y: 4 },
        { x: 4, y: 0 },
        { x: 3, y: 1 },
      ]) {
        const p = { ...props(), renderMode, cameraPreset, focusCell };
        for (let frame = 0; frame <= 600; frame += 7) {
          const s = cityDemandState(p, frame / 600);
          for (const v of [
            ...s.vehicles,
            { x: 0, y: 0 },
            { x: 0, y: 5 },
            { x: 5, y: 0 },
            { x: 5, y: 5 },
          ]) {
            const a = projectCity(p, s, v.x, v.y);
            assert.ok(
              a.x >= 96 && a.x <= 912,
              JSON.stringify({ renderMode, focusCell, a }),
            );
            assert.ok(a.y >= 560 && a.y <= 1160);
          }
        }
      }
});
test('measured cues, duration preflight and cache identities preserve audio while invalidating changed spatial inputs', async () => {
  const s = await fixture(),
    first = s.scenes[0];
  assert.ok(
    first &&
      first.visual.type === 'registered-animation' &&
      first.visual.component === 'CityDemandHeatmap',
  );
  first.visual.cues = [
    {
      cue_id: 'measured',
      trigger: { kind: 'progress', from: 0.1, to: 0.9 },
      action: { kind: 'move', target: 'mechanism' },
    },
  ];
  assert.equal(mechanismProgress(first.visual, 0, 120), 0);
  assert.equal(mechanismProgress(first.visual, 119, 120), 1);
  const timeline = planNarratedRender(
    s,
    s.scenes.map((scene) => ({
      sceneId: scene.scene_id,
      samples: 72000,
      sha256: 'a'.repeat(64),
      textSha256: 'b'.repeat(64),
      speechStartSample: 800,
      speechEndSample: 70400,
    })),
    { allowFallback: true },
  );
  assert.equal(timeline.durationFrames, 480);
  assert.equal(timeline.requiresTimingReview, true);
  const changed = structuredClone(first);
  assert.ok(
    changed.visual.type === 'registered-animation' &&
      changed.visual.component === 'CityDemandHeatmap',
  );
  changed.visual.props.renderMode = 'flat-svg';
  assert.notEqual(sceneKey(first, {}, {}, {}), sceneKey(changed, {}, {}, {}));
  assert.equal(audioKey(first, {}, {}), audioKey(changed, {}, {}));
  const snapshot = changed.visual.props.density[1];
  assert.ok(snapshot);
  snapshot[0] = 0.99;
  assert.notEqual(sceneKey(first, {}, {}, {}), sceneKey(changed, {}, {}, {}));
  assert.throws(
    () =>
      resolvePresentation(s, {
        scenes: s.scenes.map((_, i) => ({
          from: i * 900,
          durationFrames: 900,
        })),
        captions: s.scenes.map((scene, i) => ({
          sceneId: scene.scene_id,
          text: 'Synthetic',
          startFrame: i * 900,
          endFrame: (i + 1) * 900,
        })),
      }),
    /spatial|Spatial/,
  );
});
