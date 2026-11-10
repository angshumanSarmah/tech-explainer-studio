import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createNarrationProvider } from '../../src/audio/provider.ts';
import { brandIdentity } from '../../src/branding/identity.ts';
import { wavFromPcm } from '../../src/media/pcm.ts';
import { renderNarratedPreview } from '../../src/media/pipeline.ts';
import { runMedia } from '../../src/media/qc.ts';
import { inspectReleaseMedia } from '../../src/release/media.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import {
  mockConfig,
  renderTestScene,
  shortScript,
} from '../workflow/helpers.ts';
import { json } from './helpers.ts';

const code = (value: string) => (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === value;
test('real FFmpeg checks final AAC independently: silence, absent audio, wrong format, captions and narrator tampering fail', async () => {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'studio-release-media-')),
  );
  try {
    const script = shortScript();
    script.scenes = script.scenes.slice(0, 1);
    const first = script.scenes[0];
    assert.ok(first);
    const audio = join(root, 'audio');
    const provider = createNarrationProvider(mockConfig);
    await provider.synthesize({
      sceneId: first.scene_id,
      text: first.narration,
      outputDir: audio,
    });
    const render = join(root, 'render');
    await renderNarratedPreview(
      script,
      {
        outputDir: render,
        narrationDir: audio,
        browserExecutable: 'test-only',
        allowFallback: true,
        strict: false,
      },
      {
        renderVisuals: async (s, o) => {
          const frames = o.presentation?.scenes.reduce(
            (n, v) => n + v.durationFrames,
            0,
          );
          assert.ok(frames);
          const result = await renderTestScene(s, {
            ...o,
            frameRange: [0, frames - 1],
          });
          return {
            ...result,
            manifest: {
              ...result.manifest,
              tools: { fontSha256: 'f'.repeat(64) },
            },
          };
        },
      },
    );
    await assert.rejects(
      () => inspectReleaseMedia(render),
      code('MOCK_NARRATION'),
    );
    // Adversarial saved metadata claims a real provider. It cannot make muted final audio pass.
    // This does not claim that synthetic tones are speech; human playback review remains mandatory.
    const metaPath = join(
      render,
      'narration',
      first.scene_id,
      'narration.json',
    );
    const meta = JSON.parse(await readFile(metaPath, 'utf8'));
    meta.provider = 'kokoro-onnx';
    meta.isMock = false;
    meta.identity = {
      modelSha256: 'a'.repeat(64),
      voicesSha256: 'b'.repeat(64),
    };
    await json(metaPath, meta);
    const manifestPath = join(render, 'render-manifest.json'),
      preview = JSON.parse(await readFile(manifestPath, 'utf8'));
    preview.isMock = false;
    preview.narration[0].metadata = meta;
    await json(manifestPath, preview);
    const good = await inspectReleaseMedia(render);
    assert.equal(good.probe.width, 1080);
    assert.equal(good.probe.audioCodec, 'aac');
    assert.equal(good.decodedAudio.length, 1);
    const videoPath = join(render, 'video.mp4'),
      original = await readFile(videoPath);
    await writeFile(
      join(root, 'silence.wav'),
      wavFromPcm(Buffer.alloc(good.timeline.durationFrames * 800 * 2)),
    );
    const muted = join(root, 'muted.mp4');
    await runMedia('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-i',
      videoPath,
      '-i',
      join(root, 'silence.wav'),
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-ar',
      '24000',
      '-ac',
      '1',
      muted,
    ]);
    await writeFile(videoPath, await readFile(muted));
    await assert.rejects(
      () => inspectReleaseMedia(render),
      code('SILENT_AUDIO'),
    );
    await writeFile(videoPath, original);
    const noAudio = join(root, 'no-audio.mp4');
    await runMedia('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-i',
      videoPath,
      '-map',
      '0:v:0',
      '-c:v',
      'copy',
      '-an',
      noAudio,
    ]);
    await writeFile(videoPath, await readFile(noAudio));
    await assert.rejects(
      () => inspectReleaseMedia(render),
      code('MEDIA_QC_FAILED'),
    );
    await writeFile(videoPath, original);
    const alternate = join(root, 'alternate.mp4');
    await runMedia('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-i',
      videoPath,
      '-vf',
      'scale=540:960',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-c:a',
      'copy',
      alternate,
    ]);
    await writeFile(videoPath, await readFile(alternate));
    await assert.rejects(
      () => inspectReleaseMedia(render),
      code('MEDIA_QC_FAILED'),
    );
    await writeFile(videoPath, original);
    const captions = join(render, 'captions.srt'),
      saved = await readFile(captions);
    await writeFile(captions, '1\n00:00:00,000 --> 00:09:00,000\nBad timing\n');
    await assert.rejects(
      () => inspectReleaseMedia(render),
      code('TIMING_BINDING_INVALID'),
    );
    await writeFile(captions, saved);
    meta.settings.rate = 1.1;
    await json(metaPath, meta);
    await assert.rejects(
      () => inspectReleaseMedia(render),
      code('NARRATION_BINDING_INVALID'),
    );
    await json(metaPath, preview.narration[0].metadata);
    preview.brand = { ...brandIdentity(), sha256: hash('changed brand') };
    await json(manifestPath, preview);
    await assert.rejects(
      () => inspectReleaseMedia(render),
      code('RENDER_BINDING_INVALID'),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('release media subprocesses reject remote playlist protocols before any request', async () => {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'studio-release-protocol-')),
  );
  try {
    const { localReleaseMedia } = await import('../../src/release/media.ts');
    const playlist = join(root, 'untrusted.m3u8');
    await writeFile(
      playlist,
      '#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nhttp://127.0.0.1:9/blocked.ts\n#EXT-X-ENDLIST\n',
    );
    await assert.rejects(
      () =>
        localReleaseMedia('ffprobe', [
          '-v',
          'error',
          '-show_streams',
          '-of',
          'json',
          playlist,
        ]),
      (error) =>
        error instanceof Error &&
        'stderr' in error &&
        String(error.stderr).includes("not on whitelist 'file,pipe'"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
