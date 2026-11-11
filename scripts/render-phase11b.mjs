import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseVideoScript } from '../src/domain/validation.ts';
import { loadNarrationAsset } from '../src/media/narration-input.ts';
import { signalReport, wavFromPcm } from '../src/media/pcm.ts';
import { renderNarratedPreview } from '../src/media/pipeline.ts';
import { hash } from '../src/render-manifest/manifest.ts';
import { planNarratedRender } from '../src/timing/timeline.ts';

// Explicit local Kokoro synthesis, or replay saved WAVs without loading a model.
const args = process.argv.slice(2);
const replayIndex = args.indexOf('--replay');
const replay = replayIndex < 0 ? null : args[replayIndex + 1];
if (replayIndex >= 0 && !replay)
  throw new Error('--replay requires a saved run directory');
if (
  args.some(
    (v, i) =>
      !['--replay', '--flat'].includes(v) &&
      !(replayIndex >= 0 && i === replayIndex + 1),
  )
)
  throw new Error(
    'Usage: node scripts/render-phase11b.mjs [--replay <run>] [--flat]',
  );
await mkdir('output/phase11b', { recursive: true });
const dir = await mkdtemp(resolve('output/phase11b/run-'));
console.log(`Artifacts: ${dir}`);
const input = replay
  ? join(replay, 'videoscript.measured.json')
  : 'examples/phase11b/city-demand.videoscript.json';
const script = parseVideoScript(JSON.parse(await readFile(input, 'utf8')));
if (args.includes('--flat'))
  for (const s of script.scenes)
    if (
      s.visual.type === 'registered-animation' &&
      s.visual.component === 'CityDemandHeatmap'
    )
      s.visual.props.renderMode = 'flat-svg';
const start = performance.now();
let narrationDir;
if (replay) narrationDir = resolve(replay, 'narration');
else {
  const cmd = [
    'src/cli/index.ts',
    'audio',
    'narrate',
    '--config',
    'narration.config.example.json',
    '--script',
    input,
    '--output',
    join(dir, 'raw-audio'),
    '--allow-local-synthesis',
  ];
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, cmd, {
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? done()
        : reject(new Error(`Local narration failed: ${code}`)),
    );
  });
  narrationDir = join(dir, 'narration');
  const receipts = [];
  for (const scene of script.scenes) {
    const raw = await loadNarrationAsset(
      scene,
      join(dir, 'raw-audio', scene.scene_id),
    );
    let sum = 0;
    for (let i = 0; i < raw.pcm.length; i += 2) sum += raw.pcm.readInt16LE(i);
    const offset = Math.round(sum / raw.samples),
      pcm = Buffer.alloc(raw.pcm.length);
    for (let i = 0; i < pcm.length; i += 2) {
      const n = raw.pcm.readInt16LE(i) - offset;
      assert.ok(n >= -32768 && n <= 32767);
      pcm.writeInt16LE(n, i);
    }
    const signal = signalReport(pcm, scene.scene_id);
    assert.equal(signal.samples, raw.samples);
    assert.equal(signal.speechStartSample, raw.speechStartSample);
    assert.equal(signal.speechEndSample, raw.speechEndSample);
    const folder = join(narrationDir, scene.scene_id);
    await mkdir(folder, { recursive: true });
    const bytes = wavFromPcm(pcm);
    const metadata = {
      ...raw.metadata,
      wavPath: join(folder, `${scene.scene_id}.wav`),
      metadataPath: join(folder, 'narration.json'),
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
    receipts.push({
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
    JSON.stringify(receipts, null, 2),
  );
  const audio = await Promise.all(
    script.scenes.map((s) =>
      loadNarrationAsset(s, join(narrationDir, s.scene_id)),
    ),
  );
  const timeline = planNarratedRender(script, audio, { allowFallback: true });
  for (const [i, scene] of script.scenes.entries()) {
    const a = audio[i],
      time = timeline.scenes[i];
    if (a && time && scene.visual.type === 'registered-animation')
      scene.visual.cues = [
        {
          cue_id: 'measured-mechanism',
          trigger: {
            kind: 'progress',
            from:
              Math.floor(a.speechStartSample / 800) / (time.durationFrames - 1),
            to: Math.min(
              1,
              Math.ceil(a.speechEndSample / 800) / (time.durationFrames - 1),
            ),
          },
          action: { kind: 'move', target: 'mechanism' },
        },
      ];
  }
}
await writeFile(
  join(dir, 'videoscript.measured.json'),
  JSON.stringify(script, null, 2),
);
const renderStart = performance.now();
const result = await renderNarratedPreview(script, {
  outputDir: join(dir, 'render'),
  narrationDir,
  browserExecutable:
    process.env.STUDIO_BROWSER ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  allowFallback: true,
  strict: false,
  onProgress: console.log,
});
const report = {
  template: 'CityDemandHeatmap',
  mode: args.includes('--flat') ? 'flat-svg' : 'isometric-svg',
  replayOf: replay,
  video: join(dir, 'render/video.mp4'),
  totalWallSeconds: (performance.now() - start) / 1000,
  renderWallSeconds: (performance.now() - renderStart) / 1000,
  nodePeakRssKiB: process.resourceUsage().maxRSS,
  memoryScope: 'Runner Node process only; not child/browser/FFmpeg peak',
  frames: result.manifest.durationFrames,
  seconds: result.manifest.durationFrames / 30,
  videoSha256: result.manifest.videoSha256,
  approvedForRelease: false,
  requiresTimingReview: result.manifest.requiresTimingReview,
};
await writeFile(join(dir, 'performance.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
