import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertSilentProbe } from '../../src/renderers/remotion/media-tools.ts';

const valid = () => ({
  streams: [
    {
      codec_type: 'video',
      codec_name: 'h264',
      width: 1080,
      height: 1920,
      pix_fmt: 'yuv420p',
      r_frame_rate: '30/1',
      avg_frame_rate: '30/1',
      nb_read_frames: '1650',
    },
  ],
  format: { duration: '55.000000' },
});

test('media QC accepts the planned silent stream and rejects audio, wrong geometry and truncated frames', () => {
  assert.equal(assertSilentProbe(valid(), 1650).duration, 55);
  const audio = valid();
  Object.assign(audio.streams, { 1: { codec_type: 'audio' } });
  assert.throws(() => assertSilentProbe(audio, 1650));
  const geometry = valid();
  Object.assign(geometry.streams[0] ?? {}, { width: 1920, height: 1080 });
  assert.throws(() => assertSilentProbe(geometry, 1650));
  assert.throws(() => assertSilentProbe(valid(), 1649));
});

test('unknown/nonfinite probe duration cannot bypass media QC', () => {
  for (const duration of ['N/A', 'NaN', 'Infinity', '0', '54']) {
    const input = valid();
    input.format.duration = duration;
    assert.throws(() => assertSilentProbe(input, 1650));
  }
});
