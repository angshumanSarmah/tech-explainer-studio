import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import {
  mediaBinary,
  probeSilentVideo,
} from '../../src/renderers/remotion/media-tools.ts';

const hash = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');
const ShaSchema = z.string().regex(/^[a-f0-9]{64}$/);
const StillSchema = z.object({
  file: z.string().regex(/^[A-Za-z0-9_-]+\.png$/),
  frame: z.int().nonnegative(),
  scene_id: z.string(),
  phase: z.string(),
  sha256: ShaSchema,
});
const ManifestSchema = z.object({
  kind: z.literal('silent-preview'),
  scriptSha256: ShaSchema,
  videoSha256: ShaSchema,
  width: z.literal(1080),
  height: z.literal(1920),
  fps: z.literal(30),
  durationFrames: z.literal(1650),
  timingMode: z.literal('silent-preview-estimates'),
  measuredAudio: z.literal(false),
  theme: z.string(),
  guides: z.literal(false),
  encoder: z.record(z.string(), z.union([z.string(), z.number()])),
  tools: z.object({
    remotion: z.string(),
    node: z.string(),
    browser: z.string(),
    ffmpeg: z.string(),
    fontPackage: z.string(),
    fontSha256: ShaSchema,
    platform: z.string(),
    arch: z.string(),
  }),
  stills: z.array(StillSchema).length(8),
});
const GoldenSchema = z.object({
  scriptSha256: ShaSchema,
  tools: ManifestSchema.shape.tools,
  theme: z.string(),
  stills: z.array(StillSchema).length(8),
});
const { values } = parseArgs({
  options: { baseline: { type: 'string' }, candidate: { type: 'string' } },
});
if (!values.baseline || !values.candidate)
  throw new Error(
    'Use --baseline <first-render-directory> --candidate <second-render-directory>',
  );
const firstDir = resolve(values.baseline);
const secondDir = resolve(values.candidate);
assert.notEqual(
  firstDir,
  secondDir,
  'Reproducibility needs two independent render directories',
);
const first = ManifestSchema.parse(
  JSON.parse(await readFile(join(firstDir, 'render-manifest.json'), 'utf8')),
);
const second = ManifestSchema.parse(
  JSON.parse(await readFile(join(secondDir, 'render-manifest.json'), 'utf8')),
);
const golden = GoldenSchema.parse(
  JSON.parse(await readFile(join(firstDir, 'golden-manifest.json'), 'utf8')),
);
assert.equal(first.scriptSha256, second.scriptSha256, 'Script inputs differ');
assert.deepEqual(first.tools, second.tools, 'Tool/font/platform inputs differ');
assert.equal(first.theme, second.theme);
assert.deepEqual(first.encoder, second.encoder);
assert.equal(
  first.scriptSha256,
  golden.scriptSha256,
  'Fixture differs from reviewed goldens',
);
assert.deepEqual(
  first.tools,
  golden.tools,
  'Golden environment differs; explicitly review new frames before defining a new baseline',
);
assert.equal(first.theme, golden.theme);
assert.deepEqual(
  first.stills,
  golden.stills,
  'First render differs from reviewed golden hashes',
);
assert.deepEqual(
  second.stills,
  golden.stills,
  'Second render differs from reviewed golden hashes',
);
assert.deepEqual(
  new Set(first.stills.map((still) => still.phase)),
  new Set([
    'hook',
    'request',
    'parse',
    'route',
    'response',
    'summary',
    'idle',
    'overview',
  ]),
);
for (const still of golden.stills) {
  for (const directory of [firstDir, secondDir]) {
    const bytes = await readFile(join(directory, still.file));
    assert.equal(
      hash(bytes),
      still.sha256,
      `${directory}/${still.file} differs from the golden`,
    );
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1080);
    assert.equal(bytes.readUInt32BE(20), 1920);
  }
}
const firstMedia = await probeSilentVideo(join(firstDir, 'video.mp4'), 1650);
const secondMedia = await probeSilentVideo(join(secondDir, 'video.mp4'), 1650);
const firstBytes = hash(await readFile(join(firstDir, 'video.mp4')));
const secondBytes = hash(await readFile(join(secondDir, 'video.mp4')));
assert.equal(firstBytes, first.videoSha256);
assert.equal(secondBytes, second.videoSha256);
async function decodedFrameHashes(file: string): Promise<string[]> {
  const binary = mediaBinary('ffmpeg');
  // This pinned FFmpeg build omits framemd5/rawvideo muxers. image2pipe can
  // carry rawvideo packets without a container; hash fixed-size YUV420p frames.
  const child = spawn(
    binary,
    [
      '-v',
      'error',
      '-i',
      file,
      '-map',
      '0:v:0',
      '-an',
      '-pix_fmt',
      'yuv420p',
      '-c:v',
      'rawvideo',
      '-f',
      'image2pipe',
      '-',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DYLD_LIBRARY_PATH: dirname(binary) },
    },
  );
  const size = (1080 * 1920 * 3) / 2;
  let remaining = size;
  let frameHash = createHash('sha256');
  const hashes: string[] = [];
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    if (stderr.length < 4096) stderr += chunk.toString();
  });
  child.stdout.on('data', (chunk: Buffer) => {
    let offset = 0;
    while (offset < chunk.length) {
      const length = Math.min(remaining, chunk.length - offset);
      frameHash.update(chunk.subarray(offset, offset + length));
      remaining -= length;
      offset += length;
      if (remaining === 0) {
        hashes.push(frameHash.digest('hex'));
        frameHash = createHash('sha256');
        remaining = size;
      }
    }
  });
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`Decoded-frame verification failed (${code}): ${stderr}`),
        );
    });
  });
  assert.equal(remaining, size, 'Truncated raw frame');
  return hashes;
}

const decoded: string[][] = [];
for (const directory of [firstDir, secondDir]) {
  const frames = await decodedFrameHashes(join(directory, 'video.mp4'));
  await writeFile(
    join(directory, 'decoded-frame-sha256.json'),
    `${JSON.stringify(frames, null, 2)}\n`,
  );
  assert.equal(frames.length, 1650);
  decoded.push(frames);
}
assert.deepEqual(
  decoded[0],
  decoded[1],
  'Decoded video frames differ between renders',
);
const report = {
  goldenPngs: 8,
  goldenComparisons: 16,
  matchingDecodedFrames: 1650,
  videoBytesIdentical: firstBytes === secondBytes,
  firstVideoSha256: firstBytes,
  secondVideoSha256: secondBytes,
  firstMedia: firstMedia.summary,
  secondMedia: secondMedia.summary,
};
await writeFile(
  join(secondDir, 'verification.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
