import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMockWav } from '../../src/audio/wav.ts';
import { MediaError } from '../../src/media/error.ts';
import { pcmData, signalReport } from '../../src/media/pcm.ts';
import {
  assertNarratedProbe,
  checkTiming,
  muxNarration,
  probeNarratedVideo,
} from '../../src/media/qc.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import {
  type Alignment,
  planNarratedRender,
  srt,
  validateCaptions,
} from '../../src/timing/timeline.ts';
import { animation, fixture, scene } from '../helpers/fixture.ts';

function audio(script = fixture()) {
  return script.scenes.map((s, i) => ({
    sceneId: s.scene_id,
    samples: 24000 * (i + 1) + i,
    sha256: 'a'.repeat(64),
    textSha256: hash(s.narration),
    speechStartSample: 0,
    speechEndSample: 24000 * (i + 1) + i,
  }));
}
const mediaCode = (code: string, sceneId?: string) => (error: unknown) =>
  error instanceof MediaError &&
  error.code === code &&
  (sceneId === undefined || error.sceneId === sceneId);

test('measured scene lengths ceil once, authored minimum holds and cumulative starts preserve every sample', () => {
  const script = fixture();
  const saved = JSON.stringify(script);
  const inputs = audio(script);
  const plan = planNarratedRender(script, inputs, { allowFallback: true });
  let start = 0;
  for (const item of plan.scenes) {
    assert.equal(item.from, start);
    assert.ok(item.endPaddingSamples >= 0);
    assert.equal(
      item.audioSamples + item.endPaddingSamples,
      item.durationFrames * 800,
    );
    start += item.durationFrames;
  }
  assert.equal(plan.durationFrames, start);
  assert.equal(plan.requiresTimingReview, true);
  assert.notEqual(plan.durationFrames, 1650);
  assert.equal(JSON.stringify(script), saved);
  validateCaptions(plan.captions, plan.scenes, plan.durationFrames);
  assert.match(srt(plan.captions), /00:00:00,000 --> 00:00:01,000/);
  assert.throws(
    () => checkTiming(plan, plan.captions, true, false),
    mediaCode('REVIEW_REQUIRED'),
  );
});

test('bad/missing captions, too-long narration and absent audio cannot pass media checks', () => {
  const script = fixture();
  const data = audio(script);
  const plan = planNarratedRender(script, data, { allowFallback: true });
  const captions = structuredClone(plan.captions);
  const first = captions[0];
  assert.ok(first);
  first.endFrame = plan.durationFrames + 1;
  assert.throws(
    () => checkTiming(plan, captions, false, false),
    mediaCode('CAPTION_RANGE', first.sceneId),
  );
  assert.throws(
    () => validateCaptions([], plan.scenes, plan.durationFrames),
    mediaCode('CAPTION_MISSING'),
  );
  assert.throws(
    () => planNarratedRender(script, data.slice(1), { allowFallback: true }),
    mediaCode('AUDIO_COUNT'),
  );
  const long = data[0];
  assert.ok(long);
  long.samples = 24000 * 20;
  long.speechEndSample = long.samples;
  assert.throws(
    () => planNarratedRender(script, data, { allowFallback: true }),
    mediaCode('SCENE_DURATION', long.sceneId),
  );
  const override = fixture();
  scene(override).caption_overrides = [
    { text: 'Bad timing', start_ms: 0, end_ms: 13000 },
  ];
  assert.throws(
    () =>
      planNarratedRender(override, audio(override), { allowFallback: true }),
    mediaCode('CAPTION_RANGE', scene(override).scene_id),
  );
});

test('phrase cues require exact unambiguous anchors and reviewed WAV-bound word alignment', () => {
  const script = fixture();
  const visual = animation(script);
  const cue = visual.cues[0];
  assert.ok(cue);
  cue.trigger = { kind: 'phrase', text: 'HTTP request' };
  const data = audio(script);
  assert.throws(
    () => planNarratedRender(script, data, { allowFallback: true }),
    mediaCode('CUE_ALIGNMENT_REQUIRED', scene(script).scene_id),
  );
  const alignment: Alignment = {
    schemaVersion: '1.0.0',
    method: 'human-word-alignment',
    reviewed: true,
    reviewer: 'synthetic test timings only',
    scenes: script.scenes.map((s, i) => {
      const a = data[i];
      assert.ok(a);
      const words = s.narration.split(/\s+/);
      // Synthetic test data only; no production timing inference uses this construction.
      return {
        sceneId: s.scene_id,
        wavSha256: a.sha256,
        textSha256: a.textSha256,
        words: words.map((word, j) => ({
          word,
          startSample: j * 800,
          endSample: (j + 1) * 800,
        })),
      };
    }),
  };
  const plan = planNarratedRender(script, data, {
    allowFallback: false,
    alignment,
  });
  assert.equal(plan.requiresTimingReview, false);
  const resolved = plan.scenes[1]?.scene.visual;
  assert.ok(resolved?.type === 'tech-animation');
  assert.equal(resolved.cues[0]?.trigger.kind, 'progress');
  checkTiming(plan, plan.captions, true, false);
  const bad = structuredClone(alignment);
  const entry = bad.scenes[1];
  assert.ok(entry);
  entry.wavSha256 = '0'.repeat(64);
  assert.throws(
    () =>
      planNarratedRender(script, data, {
        allowFallback: false,
        alignment: bad,
      }),
    mediaCode('ALIGNMENT_IDENTITY'),
  );
  cue.trigger = { kind: 'phrase', text: 'not present' };
  assert.throws(
    () => planNarratedRender(script, data, { allowFallback: true }),
    mediaCode('CUE_ANCHOR_MISSING'),
  );
  cue.trigger = { kind: 'phrase', text: 'request' };
  scene(script).narration += ' request';
  assert.throws(
    () => planNarratedRender(script, audio(script), { allowFallback: true }),
    mediaCode('CUE_ANCHOR_AMBIGUOUS'),
  );
});

test('silent, DC-only and clipped audio fail before rendering', () => {
  const tone = pcmData(createMockWav());
  assert.ok(signalReport(tone, 'tone').speechEndSample > 0);
  assert.throws(
    () => signalReport(Buffer.alloc(48000), 'silent'),
    mediaCode('SILENT_AUDIO', 'silent'),
  );
  const dc = Buffer.alloc(48000);
  for (let i = 0; i < 24000; i++) dc.writeInt16LE(800, i * 2);
  assert.throws(() => signalReport(dc, 'dc'), mediaCode('SILENT_AUDIO', 'dc'));
  const clipped = Buffer.from(tone);
  clipped.writeInt16LE(32767, 1000);
  assert.throws(
    () => signalReport(clipped, 'clipped'),
    mediaCode('CLIPPED_AUDIO', 'clipped'),
  );
});

test('FFmpeg and ffprobe failures have typed stage diagnostics', async () => {
  const runner = async () => {
    throw new Error('Synthetic subprocess failure');
  };
  await assert.rejects(
    () => muxNarration('video.mp4', 'audio.wav', 'out.mp4', runner),
    mediaCode('FFMPEG_FAILED'),
  );
  await assert.rejects(
    () => probeNarratedVideo('out.mp4', 30, runner),
    mediaCode('FFPROBE_FAILED'),
  );
});

test('final ffprobe QC rejects wrong geometry, missing streams, frame counts and invalid durations', () => {
  const good = {
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264',
        width: 1080,
        height: 1920,
        pix_fmt: 'yuv420p',
        avg_frame_rate: '30/1',
        r_frame_rate: '30/1',
        nb_read_frames: '60',
        duration: '2',
      },
      {
        codec_type: 'audio',
        codec_name: 'aac',
        sample_rate: '24000',
        channels: 1,
        duration: '2',
      },
    ],
    format: { duration: '2' },
  };
  assert.equal(assertNarratedProbe(good, 60).streams, 2);
  for (const change of [
    (value: typeof good) => {
      value.streams.pop();
    },
    (value: typeof good) => {
      const v = value.streams[0];
      if (v) v.width = 1920;
    },
    (value: typeof good) => {
      value.format.duration = 'NaN';
    },
    (value: typeof good) => {
      const v = value.streams[0];
      if (v) v.nb_read_frames = '59';
    },
  ]) {
    const bad = structuredClone(good);
    change(bad);
    assert.throws(() => assertNarratedProbe(bad, 60), MediaError);
  }
});

test('adjacent reviewed caption groups share frame boundaries without overlap', () => {
  const script = fixture();
  script.scenes = script.scenes.slice(0, 1);
  const first = scene(script, 0);
  first.narration = 'First sentence. Next sentence.';
  const input = audio(script);
  const a = input[0];
  assert.ok(a);
  const words = first.narration.split(' ');
  const alignment: Alignment = {
    schemaVersion: '1.0.0',
    method: 'human-word-alignment',
    reviewed: true,
    reviewer: 'synthetic test',
    scenes: [
      {
        sceneId: first.scene_id,
        wavSha256: a.sha256,
        textSha256: a.textSha256,
        words: words.map((word, i) => ({
          word,
          startSample: i * 1001,
          endSample: (i + 1) * 1001,
        })),
      },
    ],
  };
  const plan = planNarratedRender(script, input, {
    allowFallback: false,
    alignment,
  });
  assert.equal(plan.captions.length, 2);
  assert.equal(plan.captions[0]?.endFrame, plan.captions[1]?.startFrame);
});
