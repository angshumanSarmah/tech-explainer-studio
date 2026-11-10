import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  directorContract,
  validateStoryboard,
} from '../../src/director/contracts.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { componentRegistry } from '../../src/domain/visuals.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import { planNarratedRender } from '../../src/timing/timeline.ts';
import {
  CACHE_PATHS,
  cacheAsideState,
  curvePoint,
  easeInOut,
} from '../../src/visuals/cache-aside-state.ts';
import { fixture } from '../helpers/fixture.ts';

const phases = ['lookup', 'miss', 'fill', 'hit'] as const;
function proofScript() {
  const script = fixture();
  const base = script.scenes[0];
  assert.ok(base);
  return parseVideoScript({
    ...script,
    schema_version: '1.1.0',
    scenes: phases.map((visualPhase) => ({
      ...base,
      scene_id: `proof-${visualPhase}`,
      narration: `The ${visualPhase} follows the cache-aside read path.`,
      visual: {
        type: 'cache-aside-proof',
        component: 'CacheAsideProof',
        props: {
          visualPhase,
          keyLabel: 'product:42',
          valueLabel: 'Product data',
          illustrative: true,
        },
      },
      timing: { min_seconds: 1, preferred_seconds: 3, max_seconds: 5 },
    })),
  });
}
test('proof is explicitly registered, preview-only, strict and unavailable to legacy 1.0 scripts', () => {
  const script = proofScript();
  validateStoryboard(script);
  assert.equal(componentRegistry.CacheAsideProof.previewOnly, true);
  assert.equal(
    directorContract(script).catalog.components.CacheAsideProof?.previewOnly,
    true,
  );
  assert.throws(() => parseVideoScript({ ...script, schema_version: '1.0.0' }));
  const first = script.scenes[0];
  assert.ok(first?.visual.type === 'cache-aside-proof');
  for (const props of [
    { ...first.visual.props, url: 'https://example.org/image.png' },
    { ...first.visual.props, illustrative: false },
    { ...first.visual.props, keyLabel: 'x'.repeat(15) },
    { ...first.visual.props, visualPhase: 'stampede' },
  ])
    assert.throws(() =>
      parseVideoScript({
        ...script,
        scenes: [{ ...first, visual: { ...first.visual, props } }],
      }),
    );
});
test('packets physically traverse eased curves, with exact endpoints and deterministic out-of-order frames', () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.ok(easeInOut(0.1) < 0.1);
  for (const curve of Object.values(CACHE_PATHS)) {
    assert.deepEqual(curvePoint(curve, 0), curve[0]);
    assert.deepEqual(curvePoint(curve, 1), curve[3]);
  }
  for (const phase of phases) {
    const states = Array.from({ length: 121 }, (_, frame) =>
      cacheAsideState(phase, frame, 121),
    );
    for (const frame of [120, 10, 77, 0, 44])
      assert.deepEqual(cacheAsideState(phase, frame, 121), states[frame]);
    assert.ok(
      states.some(
        (s) =>
          s.requestVisible || s.queryVisible || s.dataVisible || s.hitVisible,
      ),
    );
  }
  const start = cacheAsideState('lookup', 12, 121),
    middle = cacheAsideState('lookup', 48, 121),
    end = cacheAsideState('lookup', 90, 121);
  assert.ok(
    start.points.lookup.x < middle.points.lookup.x &&
      middle.points.lookup.x < end.points.lookup.x,
  );
  assert.ok(Math.abs(start.points.lookup.x - middle.points.lookup.x) > 50);
  assert.throws(() => cacheAsideState('hit', 1.5, 121));
  assert.throws(() => cacheAsideState('hit', 121, 121));
  assert.throws(() => cacheAsideState('hit', 0, 20));
});
test('miss notification precedes database request, and population follows the returned data', () => {
  for (let frame = 0; frame < 121; frame++) {
    const miss = cacheAsideState('miss', frame, 121);
    if (miss.queryVisible) assert.equal(miss.missReply, 1);
    const fill = cacheAsideState('fill', frame, 121);
    if (fill.fillVisible) assert.equal(fill.data, 1);
    if (fill.entry > 0) assert.equal(fill.fill, 1);
  }
  assert.equal(cacheAsideState('lookup', 120, 121).badge, 'MISS');
  assert.equal(cacheAsideState('lookup', 120, 121).queryCount, 0);
  assert.equal(cacheAsideState('miss', 120, 121).queryCount, 1);
  assert.equal(cacheAsideState('fill', 120, 121).entry, 1);
  assert.equal(cacheAsideState('hit', 0, 121).entry, 1);
});
test('second request uses the populated cache and never reactivates a database path', () => {
  const states = Array.from({ length: 121 }, (_, frame) =>
    cacheAsideState('hit', frame, 121),
  );
  assert.ok(states.some((s) => s.requestVisible));
  assert.ok(states.some((s) => s.hitVisible));
  for (const state of states) {
    assert.equal(state.dbBusy, false);
    assert.equal(state.queryVisible, false);
    assert.equal(state.dataVisible, false);
    assert.equal(state.queryCount, 1);
    assert.equal(state.entry, 1);
  }
  assert.equal(states.at(-1)?.badge, 'HIT');
  assert.equal(states.at(-1)?.appStatus, 'result ready');
});
test('all beats use actual audio frames and keep measured subtitle windows inside their scenes', () => {
  const script = proofScript();
  const audio = script.scenes.map((s, index) => ({
    sceneId: s.scene_id,
    samples: Math.round(24000 * (2 + index * 0.2)) + 137,
    sha256: hash(s.scene_id),
    textSha256: hash(s.narration),
    speechStartSample: 960,
    speechEndSample: Math.round(24000 * (2 + index * 0.2)) - 960,
  }));
  const timeline = planNarratedRender(script, audio, { allowFallback: true });
  let frame = 0;
  timeline.scenes.forEach((scene, index) => {
    assert.equal(scene.from, frame);
    assert.equal(
      scene.durationFrames,
      Math.ceil((audio[index]?.samples ?? 0) / 800),
    );
    frame += scene.durationFrames;
  });
  assert.equal(timeline.durationFrames, frame);
  assert.equal(timeline.captions.length, 4);
  assert.equal(timeline.requiresTimingReview, true);
});
