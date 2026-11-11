import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { hash } from '../src/render-manifest/manifest.ts';
import {
  mediaBinary,
  probeSilentVideo,
} from '../src/renderers/remotion/media-tools.ts';

const [a, b, report] = process.argv.slice(2);
if (!a || !b || !report || resolve(a) === resolve(b))
  throw new Error(
    'Supply two independent silent render directories and a new report path',
  );
const [first, second] = await Promise.all(
  [a, b].map(async (d) =>
    JSON.parse(await readFile(join(d, 'render-manifest.json'), 'utf8')),
  ),
);
assert.equal(first.kind, 'silent-preview');
assert.equal(second.kind, 'silent-preview');
for (const key of [
  'scriptSha256',
  'tools',
  'encoder',
  'durationFrames',
  'stills',
])
  assert.deepEqual(first[key], second[key], key);
for (const m of [first, second]) assert.equal(m.approvedForRelease, false);
for (const d of [a, b]) {
  await probeSilentVideo(join(d, 'video.mp4'), first.durationFrames);
  for (const still of first.stills) {
    assert.match(still.file, /^[A-Za-z0-9_-]+\.png$/);
    assert.equal(hash(await readFile(join(d, still.file))), still.sha256);
  }
}
const binary = mediaBinary('ffmpeg');
async function decoded(dir) {
  return new Promise((done, reject) => {
    const sum = createHash('sha256');
    let bytes = 0;
    const child = spawn(
      binary,
      [
        '-v',
        'error',
        '-nostdin',
        '-i',
        join(dir, 'video.mp4'),
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
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, DYLD_LIBRARY_PATH: dirname(binary) },
      },
    );
    let error = '';
    child.stdout.on('data', (b) => {
      sum.update(b);
      bytes += b.length;
    });
    child.stderr.on('data', (b) => {
      if (error.length < 4096) error += b.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(error));
      else done({ sha256: sum.digest('hex'), bytes });
    });
  });
}
const [decodedA, decodedB] = await Promise.all([decoded(a), decoded(b)]);
assert.deepEqual(decodedA, decodedB);
assert.equal(decodedA.bytes, 1080 * 1920 * 1.5 * first.durationFrames);
await writeFile(
  report,
  JSON.stringify(
    {
      baseline: a,
      candidate: b,
      frames: first.durationFrames,
      stills: first.stills,
      decoded: decodedA,
      exactPngAndDecodedFrameParity: true,
      mp4ByteEqual: first.videoSha256 === second.videoSha256,
      humanVisualReview: 'pending',
      approvedForRelease: false,
    },
    null,
    2,
  ),
  { flag: 'wx' },
);
console.log(
  'Exact PNG and every decoded video frame match; human visual approval remains pending.',
);
