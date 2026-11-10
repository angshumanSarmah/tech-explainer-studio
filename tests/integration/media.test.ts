import assert from 'node:assert/strict';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { crc32, deflateSync } from 'node:zlib';
import { createNarrationProvider } from '../../src/audio/provider.ts';
import { MediaError } from '../../src/media/error.ts';
import { wavFromPcm } from '../../src/media/pcm.ts';
import {
  type PipelineDependencies,
  renderNarratedPreview,
} from '../../src/media/pipeline.ts';
import { runMedia } from '../../src/media/qc.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import { fixture } from '../helpers/fixture.ts';

const root = await mkdtemp(join(tmpdir(), 'studio-phase04-'));
after(() => rm(root, { recursive: true, force: true }));
const script = fixture();
script.scenes = script.scenes.slice(0, 2);
for (const scene of script.scenes)
  scene.timing = { min_seconds: 0.5, preferred_seconds: 1, max_seconds: 2 };
const provider = createNarrationProvider(
  JSON.parse(await readFile('narration.mock.example.json', 'utf8')),
);
for (const scene of script.scenes)
  await provider.synthesize({
    sceneId: scene.scene_id,
    text: scene.narration,
    outputDir: join(root, 'audio'),
  });
const renderVisuals: NonNullable<
  PipelineDependencies['renderVisuals']
> = async (_script, options) => {
  await mkdir(options.outputDir);
  assert.ok(options.presentation);
  const frames = options.presentation.scenes.reduce(
    (total, s) => total + s.durationFrames,
    0,
  );
  const chunk = (type: string, data: Buffer) => {
    const name = Buffer.from(type);
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length, 0);
    name.copy(result, 4);
    data.copy(result, 8);
    result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1080, 0);
  header.writeUInt32BE(1920, 4);
  header[8] = 8;
  header[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.alloc((1080 * 3 + 1) * 1920))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  const pngPath = join(options.outputDir, 'synthetic.png');
  await writeFile(pngPath, png);
  // Explicit test renderer; production always uses the registered Remotion visuals/captions.
  await runMedia('ffmpeg', [
    '-v',
    'error',
    '-nostdin',
    '-n',
    '-loop',
    '1',
    '-framerate',
    '30',
    '-i',
    pngPath,
    '-frames:v',
    String(frames),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    join(options.outputDir, 'video.mp4'),
  ]);
  return {
    outputDir: options.outputDir,
    manifest: { kind: 'test-only-color-renderer' },
  };
};
const options = {
  narrationDir: join(root, 'audio'),
  browserExecutable: 'unused-explicit-test-adapter',
  allowFallback: true,
  strict: false,
};

test('mock WAV to real FFmpeg H.264/AAC assembly, independent decode/QC and hashed manifest', async () => {
  const output = join(root, 'success');
  const result = await renderNarratedPreview(
    script,
    { ...options, outputDir: output },
    { renderVisuals },
  );
  assert.equal(result.manifest.durationFrames, 60);
  assert.equal(result.report.mediaChecksPassed, true);
  assert.equal(result.report.releaseChecksPassed, false);
  assert.equal(result.report.decodedAudio.length, 2);
  assert.equal(result.manifest.isMock, true);
  assert.equal(
    result.manifest.videoSha256,
    hash(await readFile(join(output, 'video.mp4'))),
  );
  assert.ok(
    (await readFile(join(output, 'captions.srt'), 'utf8')).includes(
      'HTTP request',
    ),
  );
  await assert.rejects(
    () =>
      renderNarratedPreview(
        script,
        { ...options, outputDir: output },
        { renderVisuals },
      ),
    (error) => error instanceof MediaError && error.code === 'OUTPUT_EXISTS',
  );
});

test('strict checks block mock/fallback before rendering and keep scene failure evidence', async () => {
  await assert.rejects(
    () =>
      renderNarratedPreview(
        script,
        { ...options, strict: true, outputDir: join(root, 'strict') },
        { renderVisuals },
      ),
    (error) => error instanceof MediaError && error.code === 'REVIEW_REQUIRED',
  );
  const first = script.scenes[0];
  assert.ok(first);
  const folder = join(root, 'audio', first.scene_id);
  const metadataFile = join(folder, 'narration.json');
  const metadata = JSON.parse(await readFile(metadataFile, 'utf8'));
  metadata.originalTextSha256 = '0'.repeat(64);
  await writeFile(metadataFile, JSON.stringify(metadata));
  const out = join(root, 'bad-input');
  await assert.rejects(
    () =>
      renderNarratedPreview(
        script,
        { ...options, outputDir: out },
        { renderVisuals },
      ),
    (error) =>
      error instanceof MediaError &&
      error.code === 'NARRATION_IDENTITY' &&
      error.sceneId === first.scene_id,
  );
  const error = JSON.parse(
    await readFile(join(out, 'render-error.json'), 'utf8'),
  );
  assert.equal(error.sceneId, first.scene_id);
  await assert.rejects(() => access(join(out, 'video.mp4')));
  metadata.originalTextSha256 = hash(first.narration);
  await writeFile(metadataFile, JSON.stringify(metadata));
});

test('a silently muted final AAC track fails independent per-scene QC and is never finalized', async () => {
  const silent = join(root, 'silent.wav');
  await writeFile(silent, wavFromPcm(Buffer.alloc(48000 * 2)));
  const out = join(root, 'muted-final');
  await assert.rejects(
    () =>
      renderNarratedPreview(
        script,
        { ...options, outputDir: out },
        {
          renderVisuals,
          runner: async (type, args) => {
            if (type === 'ffmpeg' && args.includes('0:v:0')) {
              const muted = [...args];
              const inputs = muted
                .map((value, index) => (value === '-i' ? index : -1))
                .filter((index) => index >= 0);
              const audioIndex = inputs[1];
              assert.notEqual(audioIndex, undefined);
              muted[(audioIndex ?? 0) + 1] = silent;
              return runMedia(type, muted);
            }
            return runMedia(type, args);
          },
        },
      ),
    (error) =>
      error instanceof MediaError &&
      error.code === 'SILENT_AUDIO' &&
      error.sceneId === script.scenes[0]?.scene_id,
  );
  await assert.rejects(() => access(join(out, 'video.mp4')));
  assert.equal(
    JSON.parse(await readFile(join(out, 'render-error.json'), 'utf8')).code,
    'SILENT_AUDIO',
  );
});
