import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadNarrationAsset } from '../src/media/narration-input.ts';
import { signalReport, wavFromPcm } from '../src/media/pcm.ts';
import { hash } from '../src/render-manifest/manifest.ts';
import { planNarratedRender } from '../src/timing/timeline.ts';

// Explicit local synthesis + existing Producer only. All artifacts are unapproved previews.
const names = process.argv.slice(2);
if (!names.length)
  names.push(
    'caching',
    'cloud-sync',
    'queue',
    'btree',
    'git-objects',
    'code-trace',
    'http',
  );
if (
  names.some(
    (n) =>
      ![
        'caching',
        'cloud-sync',
        'queue',
        'btree',
        'git-objects',
        'code-trace',
        'http',
      ].includes(n),
  )
)
  throw new Error('Choose documented Phase 11 examples');
await mkdir('output/phase11', { recursive: true });
const run = await mkdtemp(resolve('output/phase11/demos-'));
console.log(`Artifacts: ${run}`);
const receipts = [];
async function command(args) {
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, ['src/cli/index.ts', ...args], {
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? done()
        : reject(new Error(`Stage failed: ${args[0]}, exit ${code}`)),
    );
  });
}
for (const name of names) {
  const file =
      name === 'http'
        ? 'examples/http-server.videoscript.json'
        : `examples/phase11/${name}.videoscript.json`,
    dir = join(run, name);
  await mkdir(dir);
  const script = JSON.parse(await readFile(file, 'utf8'));
  await command([
    'audio',
    'narrate',
    '--config',
    'narration.config.example.json',
    '--script',
    file,
    '--output',
    join(dir, 'raw-audio'),
    '--allow-local-synthesis',
  ]);
  const processing = [];
  for (const scene of script.scenes) {
    const raw = await loadNarrationAsset(
      scene,
      join(dir, 'raw-audio', scene.scene_id),
    );
    let sum = 0;
    for (let i = 0; i < raw.pcm.length; i += 2) sum += raw.pcm.readInt16LE(i);
    const offset = Math.round(sum / raw.samples);
    const pcm = Buffer.alloc(raw.pcm.length);
    for (let i = 0; i < pcm.length; i += 2) {
      const n = raw.pcm.readInt16LE(i) - offset;
      assert.ok(n >= -32768 && n <= 32767);
      pcm.writeInt16LE(n, i);
    }
    const signal = signalReport(pcm, scene.scene_id);
    assert.equal(signal.samples, raw.samples);
    assert.equal(signal.speechStartSample, raw.speechStartSample);
    assert.equal(signal.speechEndSample, raw.speechEndSample);
    const out = join(dir, 'narration', scene.scene_id);
    await mkdir(out, { recursive: true });
    const bytes = wavFromPcm(pcm),
      metadata = {
        ...raw.metadata,
        wavPath: join(out, `${scene.scene_id}.wav`),
        metadataPath: join(out, 'narration.json'),
        sha256: hash(bytes),
        bytes: bytes.length,
        identity: {
          ...raw.metadata.identity,
          episodePostprocess: 'constant-dc-offset-removal-v1',
          sourceWavSha256: raw.sha256,
          removedIntegerOffset: String(offset),
        },
      };
    await writeFile(metadata.wavPath, bytes, { flag: 'wx' });
    await writeFile(metadata.metadataPath, JSON.stringify(metadata, null, 2), {
      flag: 'wx',
    });
    processing.push({
      sceneId: scene.scene_id,
      sourceSha256: raw.sha256,
      sha256: metadata.sha256,
      offset,
      samples: raw.samples,
      speechTimingUnchanged: true,
    });
  }
  await writeFile(
    join(dir, 'audio-processing.json'),
    JSON.stringify(processing, null, 2),
  );
  const audio = await Promise.all(
    script.scenes.map((scene) =>
      loadNarrationAsset(scene, join(dir, 'narration', scene.scene_id)),
    ),
  );
  const timeline = planNarratedRender(script, audio, { allowFallback: true });
  for (const [i, scene] of script.scenes.entries()) {
    const a = audio[i],
      timing = timeline.scenes[i];
    if (scene.visual.type === 'registered-animation' && a && timing)
      scene.visual.cues = [
        {
          cue_id: 'measured-mechanism',
          trigger: {
            kind: 'progress',
            from:
              Math.floor(a.speechStartSample / 800) /
              (timing.durationFrames - 1),
            to: Math.min(
              1,
              Math.ceil(a.speechEndSample / 800) / (timing.durationFrames - 1),
            ),
          },
          action: { kind: 'move', target: 'mechanism' },
        },
      ];
  }
  const renderScript = join(dir, 'videoscript.measured.json');
  await writeFile(renderScript, JSON.stringify(script, null, 2));
  await command([
    'render',
    '--script',
    renderScript,
    '--narration',
    join(dir, 'narration'),
    '--output',
    join(dir, 'render'),
    '--allow-caption-fallback',
  ]);
  const manifest = JSON.parse(
    await readFile(join(dir, 'render/render-manifest.json'), 'utf8'),
  );
  receipts.push({
    name,
    video: join(dir, 'render/video.mp4'),
    sha256: manifest.videoSha256,
    frames: manifest.durationFrames,
    seconds: manifest.durationFrames / 30,
    approvedForRelease: false,
    requiresTimingReview: manifest.requiresTimingReview,
  });
  await writeFile(join(run, 'demos.json'), JSON.stringify(receipts, null, 2));
}
console.log(JSON.stringify(receipts, null, 2));
