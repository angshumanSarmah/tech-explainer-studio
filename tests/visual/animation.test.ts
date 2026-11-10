import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  planSilentRender,
  RenderInputError,
  sceneAtFrame,
} from '../../src/renderers/remotion/plan.ts';
import { SAFE, wrapText } from '../../src/renderers/remotion/theme.ts';
import { flowState, PHASE_LABELS } from '../../src/visuals/flow-state.ts';
import { animation, fixture, scene } from '../helpers/fixture.ts';

test('saved fixture estimates resolve to six contiguous scenes and 1650 frames', () => {
  const plan = planSilentRender(fixture());
  assert.equal(plan.durationFrames, 1650);
  assert.equal(plan.measuredAudio, false);
  assert.equal(plan.timingMode, 'silent-preview-estimates');
  assert.deepEqual(
    plan.scenes.map((item) => [item.from, item.durationFrames]),
    [
      [0, 150],
      [150, 300],
      [450, 300],
      [750, 270],
      [1020, 360],
      [1380, 270],
    ],
  );
  for (let frame = 0; frame < plan.durationFrames; frame++) {
    const item = sceneAtFrame(plan.scenes, frame);
    assert.ok(frame >= item.from && frame < item.from + item.durationFrames);
  }
  assert.throws(() => sceneAtFrame(plan.scenes, -1), RangeError);
  assert.throws(() => sceneAtFrame(plan.scenes, 1650), RangeError);
});

test('request travels down to the server in its saved cue window', () => {
  const visual = animation(fixture());
  const before = flowState(visual.props, visual.cues, 0, 301);
  const halfway = flowState(visual.props, visual.cues, 180, 301);
  const after = flowState(visual.props, visual.cues, 300, 301);
  assert.equal(before.requestY, 870);
  assert.equal(after.requestY, 1040);
  assert.ok(
    before.requestY < halfway.requestY && halfway.requestY < after.requestY,
  );
  assert.equal(
    flowState(visual.props, visual.cues, 90, 301).requestY,
    before.requestY,
  );
  assert.equal(
    flowState(visual.props, visual.cues, 255, 301).requestY,
    after.requestY,
  );
  assert.equal(before.responseVisible, false);
});

test('response travels up to the browser, never down the request lane', () => {
  const visual = animation(fixture(), 4);
  const start = flowState(visual.props, visual.cues, 0, 301);
  const middle = flowState(visual.props, visual.cues, 210, 301);
  const end = flowState(visual.props, visual.cues, 300, 301);
  assert.ok(
    start.responseY > middle.responseY && middle.responseY > end.responseY,
  );
  assert.equal(start.responseY, 1040);
  assert.equal(end.responseY, 870);
  assert.equal(start.requestVisible, false);
});

for (const phase of Object.keys(
  PHASE_LABELS,
) as (keyof typeof PHASE_LABELS)[]) {
  test(`${phase} is frame-deterministic under out-of-order evaluation and does not mutate props`, () => {
    const input = fixture();
    const visual = animation(input, 4);
    visual.props.visualPhase = phase;
    visual.cues = [];
    const original = JSON.stringify(visual);
    const frames = [0, 1, 75, 149, 210, 299];
    const expected = frames.map((frame) =>
      flowState(visual.props, visual.cues, frame, 300),
    );
    for (let i = frames.length - 1; i >= 0; i--) {
      const frame = frames[i];
      assert.ok(frame !== undefined);
      assert.deepEqual(
        flowState(visual.props, visual.cues, frame, 300),
        expected[i],
      );
    }
    assert.equal(JSON.stringify(visual), original);
  });
}

test('idle has no packet; parse/route distinguish work; overview never responds before processing', () => {
  const props = animation(fixture(), 4).props;
  for (let frame = 0; frame < 100; frame++) {
    props.visualPhase = 'idle';
    const idle = flowState(props, [], frame, 100);
    assert.ok(!idle.requestVisible && !idle.responseVisible);
    props.visualPhase = 'overview';
    const overview = flowState(props, [], frame, 100);
    if (overview.responseVisible)
      assert.ok(overview.arrived && overview.progress >= 0.6);
  }
  props.visualPhase = 'parse';
  assert.ok(flowState(props, [], 50, 100).parserActive);
  assert.equal(flowState(props, [], 50, 100).handlerActive, false);
  props.visualPhase = 'route';
  assert.ok(flowState(props, [], 50, 100).handlerActive);
  assert.equal(flowState(props, [], 50, 100).parserActive, false);
});

test('silent preflight rejects unresolved phrases and unsupported actions instead of ignoring them', () => {
  const input = fixture();
  const cue = animation(input).cues[0];
  assert.ok(cue);
  cue.trigger = { kind: 'phrase', text: 'GET slash' };
  assert.throws(
    () => planSilentRender(input),
    (error: unknown) => {
      assert.ok(error instanceof RenderInputError);
      assert.equal(error.scene_id, 'scene-02-request');
      assert.match(error.path, /cues/);
      return true;
    },
  );
  cue.trigger = { kind: 'progress', from: 0, to: 1 };
  cue.action.kind = 'update_field';
  assert.throws(() => planSilentRender(input), RenderInputError);
});

test('silent preflight rejects invisible endpoints, absent handlers, unsafe lengths and captions', () => {
  const cases = [
    (s: ReturnType<typeof fixture>) => {
      animation(s).props.illustrative = false;
    },
    (s: ReturnType<typeof fixture>) => {
      animation(s).props.show.browser = false;
    },
    (s: ReturnType<typeof fixture>) => {
      animation(s, 3).props.show.handler = false;
    },
    (s: ReturnType<typeof fixture>) => {
      animation(s).props.request.path = '/a-path-that-needs-a-different-layout';
    },
    (s: ReturnType<typeof fixture>) => {
      scene(s).caption_overrides = [
        { text: 'caption', start_ms: 0, end_ms: 100 },
      ];
    },
    (s: ReturnType<typeof fixture>) => {
      s.target = { aspect_ratio: '16:9', width: 1920, height: 1080, fps: 30 };
    },
    (s: ReturnType<typeof fixture>) => {
      scene(s).timing = {
        min_seconds: 0.01,
        preferred_seconds: 0.01,
        max_seconds: 1,
      };
    },
  ];
  for (const change of cases) {
    const input = fixture();
    change(input);
    assert.throws(() => planSilentRender(input), RenderInputError);
  }
});

test('frame and wrapping helpers reject invalid input or preserve complete text', () => {
  const visual = animation(fixture());
  assert.throws(() => flowState(visual.props, [], 300, 300), RangeError);
  assert.deepEqual(wrapText('Request Process Response', 10), [
    'Request',
    'Process',
    'Response',
  ]);
  assert.equal(wrapText('abcdefghijklmnop', 6).join(''), 'abcdefghijklmnop');
  assert.ok(
    SAFE.right - SAFE.left < 1080 && SAFE.bottom < 1920 && SAFE.top > 0,
  );
});
