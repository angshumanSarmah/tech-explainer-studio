import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMPOSED_EXAMPLE } from '../../src/domain/composed.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import {
  boundaryHeadings,
  compileVisualPlan,
  composedState,
  UnsupportedCapability,
} from '../../src/renderers/remotion/compile.ts';
import { nodeRect } from '../../src/renderers/remotion/composed-layout.ts';
import { planSilentRender } from '../../src/renderers/remotion/plan.ts';
import { fixture } from '../helpers/fixture.ts';

function script() {
  const f = fixture();
  return parseVideoScript({
    ...f,
    schema_version: '1.2.0',
    scenes: [0, 1].map((i) => ({
      ...f.scenes[1],
      scene_id: `layout-${i}`,
      visual: {
        type: 'composed',
        component: 'ComposedScene',
        props: structuredClone(COMPOSED_EXAMPLE),
        cues: [],
      },
      timing: { min_seconds: 4, preferred_seconds: 4, max_seconds: 4 },
      ...(i ? { transition: { kind: 'crossfade', preset: 'short' } } : {}),
    })),
  });
}
const compile = (s: ReturnType<typeof script>) =>
  compileVisualPlan(s, planSilentRender(s).scenes);

test('all twelve crossfade frames display at most one scene heading with continuous endpoints', () => {
  for (let k = 0; k < 12; k++) {
    const u = k / 11,
      h = boundaryHeadings(u);
    const a = h.outgoing * (1 - u),
      b = h.incoming * u;
    assert.equal(a > 0 && b > 0, false);
    assert.ok(a >= 0 && a <= 1 && b >= 0 && b <= 1);
  }
  assert.deepEqual(boundaryHeadings(0), { outgoing: 1, incoming: 0 });
  assert.deepEqual(boundaryHeadings(1), { outgoing: 0, incoming: 1 });
  assert.throws(() => boundaryHeadings(Number.NaN), RangeError);
});

test('long status and labels reserve stable readable node geometry and keep motion clear', () => {
  const s = script(),
    v = s.scenes[0]?.visual;
  assert.ok(v?.type === 'composed');
  const n = v.props.entities[1];
  assert.ok(n?.kind === 'node');
  n.label = 'Incoming message storage';
  required(v.props.entities[2]).label = 'Complete stored payload';
  v.cues = [
    {
      cue_id: 'state',
      trigger: { kind: 'progress', from: 0.4, to: 0.7 },
      action: {
        kind: 'update_field',
        target: n.id,
        value: 'Waiting for next message',
      },
    },
  ];
  const p = required(compile(s).scenes[0]);
  const node = required(p.entities.find((e) => e.entity.id === n.id));
  assert.ok(node.box && node.box.height > 170);
  const start = required(
    composedState(p, 0).entities.find((e) => e.entity.id === n.id),
  );
  const end = required(
    composedState(p, 119).entities.find((e) => e.entity.id === n.id),
  );
  assert.deepEqual(start.box, end.box);
  assert.equal(end.status, 'Waiting for next message');
  assert.ok(
    node.box.statusY + 2 * 42 + 8 <= node.box.top + node.box.height - 24,
  );
  const bounds = nodeRect(node.x, node.y, node.box);
  assert.ok(bounds.bottom < 1280);
});

test('unsafe crowded layouts and unmatched reserved geometry fail with scene/path diagnostics', () => {
  const s = script(),
    v = s.scenes[0]?.visual;
  assert.ok(v?.type === 'composed');
  v.props.layout = 'grid';
  v.cues = [
    {
      cue_id: 'move',
      trigger: { kind: 'progress', from: 0.2, to: 0.8 },
      action: { kind: 'move', target: 'message', value: 'delivery' },
    },
  ];
  assert.throws(
    () => compile(s),
    (e: unknown) =>
      e instanceof UnsupportedCapability &&
      e.scene_id === 'layout-0' &&
      e.path.includes('visual.props.layout'),
  );
  const t = script();
  assert.ok(t.schema_version === '1.2.0');
  const incoming = required(t.scenes[1]);
  incoming.transition = {
    kind: 'match',
    preset: 'short',
    entityIds: ['receiver'],
  };
  assert.ok(incoming.visual.type === 'composed');
  incoming.visual.cues = [
    {
      cue_id: 'state',
      trigger: { kind: 'progress', from: 0.5, to: 0.7 },
      action: {
        kind: 'update_field',
        target: 'receiver',
        value: 'Waiting for next message',
      },
    },
  ];
  assert.throws(
    () => compile(t),
    /incompatible reserved text\/status geometry/,
  );
});

function required<T>(value: T | null | undefined): T {
  assert.ok(value !== null && value !== undefined);
  return value;
}
