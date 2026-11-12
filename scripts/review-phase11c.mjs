import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseVideoScript } from '../src/domain/validation.ts';
import { loadNarrationAsset } from '../src/media/narration-input.ts';
import { pcmData, wavFromPcm } from '../src/media/pcm.ts';
import { runMedia } from '../src/media/qc.ts';
import { inspectReleaseMedia } from '../src/release/media.ts';
import { hash } from '../src/render-manifest/manifest.ts';

// Read-only media inspection; creates a fresh evidence directory, never reviews a release.
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error(
    'Usage: node scripts/review-phase11c.mjs <render-map.json> <new-evidence-directory>',
  );
const mapping = JSON.parse(await readFile(input, 'utf8'));
const out = resolve(output);
await mkdir(out);
const renders = [];
for (const [name, value] of Object.entries(mapping)) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(name))
    throw new Error('Unsafe evidence label');
  const dir = resolve(value.renderDir);
  console.log(`Inspecting ${name}`);
  const script = parseVideoScript(
    JSON.parse(await readFile(join(dir, 'videoscript.json'), 'utf8')),
  );
  const manifest = JSON.parse(
    await readFile(join(dir, 'render-manifest.json'), 'utf8'),
  );
  const timeline = JSON.parse(
    await readFile(join(dir, 'timeline.json'), 'utf8'),
  );
  assert.equal(
    hash(await readFile(join(dir, 'video.mp4'))),
    manifest.videoSha256,
  );
  assert.equal(manifest.approvedForRelease, false);
  const independentMedia = await inspectReleaseMedia(dir);
  const wavs = [];
  for (const scene of script.scenes) {
    const audio = await loadNarrationAsset(
      scene,
      join(dir, 'narration', scene.scene_id),
    );
    const original = value.narrationDir
      ? await loadNarrationAsset(
          scene,
          join(value.narrationDir, scene.scene_id),
        )
      : undefined;
    if (original) assert.equal(audio.sha256, original.sha256);
    wavs.push({
      sceneId: scene.scene_id,
      sha256: audio.sha256,
      samples: audio.samples,
      seconds: audio.durationSeconds,
      unchangedFromSavedInput: original
        ? audio.sha256 === original.sha256
        : null,
    });
  }
  const frames = new Map();
  for (const s of timeline.scenes) {
    for (const u of [0.15, 0.5, 0.85]) {
      const frame = s.from + Math.round(u * (s.durationFrames - 1));
      frames.set(frame, { kind: 'scene-pose', sceneId: s.scene.scene_id });
    }
  }
  for (const [i, s] of timeline.scenes.entries()) {
    if (!i) continue;
    for (const offset of [-1, 0, 5, 11, 12])
      frames.set(s.from + offset, {
        kind: 'boundary',
        incomingScene: s.scene.scene_id,
        offset,
      });
  }
  const poses = [];
  for (const [frame, context] of [...frames].sort(([a], [b]) => a - b)) {
    const file = `${name}-f${frame}.png`;
    await runMedia('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-protocol_whitelist',
      'file,pipe',
      '-ss',
      String(frame / 30),
      '-i',
      join(dir, 'video.mp4'),
      '-frames:v',
      '1',
      join(out, file),
    ]);
    const mobile = `${name}-f${frame}-mobile.png`;
    await runMedia('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-i',
      join(out, file),
      '-vf',
      'scale=360:640',
      '-frames:v',
      '1',
      join(out, mobile),
    ]);
    poses.push({
      frame,
      ...context,
      file,
      mobile,
      sha256: hash(await readFile(join(out, file))),
    });
  }
  const pcm = pcmData(await readFile(join(dir, 'decoded-audio.wav')));
  const excerpts = [];
  for (const [i, s] of timeline.scenes.entries()) {
    if (!i) continue;
    const from = Math.max(0, s.from * 800 - 24000);
    const to = Math.min(pcm.length / 2, s.from * 800 + 24000);
    const file = `${name}-boundary-${i}.wav`;
    const bytes = wavFromPcm(pcm.subarray(from * 2, to * 2));
    await writeFile(join(out, file), bytes, { flag: 'wx' });
    excerpts.push({
      file,
      sha256: hash(bytes),
      startSample: from,
      endSample: to,
      source: 'decoded final MP4',
      purpose: 'Human boundary listening excerpt; source WAVs unchanged',
    });
  }
  const pacing =
    script.schema_version === '1.2.0'
      ? JSON.parse(await readFile(join(dir, 'boundary-pacing.json'), 'utf8'))
      : null;
  renders.push({
    name,
    dir,
    videoSha256: manifest.videoSha256,
    frames: manifest.durationFrames,
    seconds: manifest.durationFrames / 30,
    independentMedia,
    captionMethod: manifest.captionMethod,
    requiresTimingReview: manifest.requiresTimingReview,
    pacing,
    wavs,
    poses,
    excerpts,
  });
  await writeFile(
    join(out, `${name}-evidence.json`),
    `${JSON.stringify(renders.at(-1), null, 2)}\n`,
    { flag: 'wx' },
  );
}
await writeFile(
  join(out, 'review-report.json'),
  `${JSON.stringify({ approvedForRelease: false, humanVisualReview: 'pending', humanListeningReview: 'pending', renders }, null, 2)}\n`,
  { flag: 'wx' },
);
console.log(`Saved ${renders.length} independently inspected videos to ${out}`);
