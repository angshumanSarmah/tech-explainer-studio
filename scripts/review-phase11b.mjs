import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { inspectDecodedAudio, probeNarratedVideo } from '../src/media/qc.ts';
import { hash } from '../src/render-manifest/manifest.ts';
import {
  executeFile,
  executeMedia,
  mediaBinary,
} from '../src/renderers/remotion/media-tools.ts';
import {
  cityDemandState,
  projectCity,
} from '../src/visuals/city-demand-state.ts';
import { mechanismProgress } from '../src/visuals/library-state.ts';

const [baseline, candidate, flat, destination] = process.argv.slice(2);
if (!baseline || !candidate || !flat || !destination)
  throw new Error(
    'Supply baseline render, independent isometric render, flat render and fresh review directory',
  );
const out = resolve(destination);
await mkdir(out);
const report = {
  approvedForRelease: false,
  humanVisualReview: 'pending',
  renders: [],
  replay: {},
};
for (const [name, dir] of [
  ['isometric', candidate],
  ['flat', flat],
]) {
  const manifest = JSON.parse(
    await readFile(join(dir, 'render-manifest.json'), 'utf8'),
  );
  const timeline = JSON.parse(
    await readFile(join(dir, 'timeline.json'), 'utf8'),
  );
  const video = join(dir, 'video.mp4');
  assert.equal(hash(await readFile(video)), manifest.videoSha256);
  assert.equal(manifest.approvedForRelease, false);
  const media = await probeNarratedVideo(video, manifest.durationFrames);
  const decoded = await inspectDecodedAudio(
    video,
    join(out, `${name}-decoded.wav`),
    timeline,
  );
  const events = [];
  for (const [i, item] of timeline.scenes.entries()) {
    const visual = item.scene.visual;
    assert.equal(visual.component, 'CityDemandHeatmap');
    const cues = item.cueWindows[0];
    assert.ok(cues);
    const poses = [];
    for (const fraction of [0.15, 0.5, 0.85]) {
      const local = Math.round(
          cues.fromFrame + (cues.toFrame - cues.fromFrame) * fraction,
        ),
        frame = item.from + local;
      const stem = `${name}-${i + 1}-${Math.round(fraction * 100)}-f${frame}`;
      await executeMedia('ffmpeg', [
        '-v',
        'error',
        '-nostdin',
        '-i',
        video,
        '-ss',
        (frame / 30).toFixed(9),
        '-frames:v',
        '1',
        '-y',
        join(out, `${stem}.png`),
      ]);
      await executeMedia('ffmpeg', [
        '-v',
        'error',
        '-nostdin',
        '-i',
        join(out, `${stem}.png`),
        '-vf',
        'scale=360:640',
        '-frames:v',
        '1',
        '-y',
        join(out, `${stem}-mobile.png`),
      ]);
      const state = cityDemandState(
        visual.props,
        mechanismProgress(visual, local, item.durationFrames),
      );
      poses.push({
        frame,
        file: `${stem}.png`,
        mobile: `${stem}-mobile.png`,
        pngSha256: hash(await readFile(join(out, `${stem}.png`))),
        camera: state.camera,
        focusIntensity: state.focusIntensity,
        density: state.density,
        vehicles: state.vehicles.map((v) => ({
          ...v,
          screen: projectCity(visual.props, state, v.x, v.y, 6),
        })),
      });
    }
    assert.notDeepEqual(poses[0].vehicles, poses[2].vehicles);
    events.push({ beat: visual.props.storyBeat, poses });
  }
  report.renders.push({
    name,
    dir,
    videoSha256: manifest.videoSha256,
    frames: manifest.durationFrames,
    seconds: manifest.durationFrames / 30,
    brand: manifest.brand,
    scriptSha256: manifest.scriptSha256,
    captionMethod: manifest.captionMethod,
    requiresTimingReview: manifest.requiresTimingReview,
    media: media.summary,
    decodedAudio: decoded,
    spatialScenes: manifest.visuals.spatialScenes,
    events,
  });
}
const [a, b] = await Promise.all(
  [baseline, candidate].map(async (dir) =>
    JSON.parse(await readFile(join(dir, 'render-manifest.json'), 'utf8')),
  ),
);
assert.equal(a.scriptSha256, b.scriptSha256);
assert.equal(a.durationFrames, b.durationFrames);
assert.deepEqual(a.brand, b.brand);
assert.deepEqual(
  a.narration.map((n) => n.sha256),
  b.narration.map((n) => n.sha256),
);
// Compare every encoded frame at mobile resolution in grayscale. Conservative
// tolerances accommodate browser/encoder edges; no claim of universal GPU equality.
const binary = mediaBinary('ffmpeg');
const decode = async (dir) =>
  (
    await executeFile(
      binary,
      [
        '-v',
        'error',
        '-nostdin',
        '-i',
        join(dir, 'video.mp4'),
        '-an',
        '-vf',
        'scale=360:640',
        '-pix_fmt',
        'gray',
        '-c:v',
        'rawvideo',
        '-f',
        'image2pipe',
        '-',
      ],
      {
        encoding: 'buffer',
        maxBuffer: 180 * 1024 * 1024,
        env: { ...process.env, DYLD_LIBRARY_PATH: dirname(binary) },
      },
    )
  ).stdout;
const left = await decode(baseline),
  right = await decode(candidate);
assert.equal(left.length, 360 * 640 * a.durationFrames);
assert.equal(left.length, right.length);
let sum = 0,
  max = 0,
  changed = 0;
const frames = [];
for (let frame = 0; frame < a.durationFrames; frame++) {
  let frameSum = 0,
    frameMax = 0,
    frameChanged = 0;
  for (let i = frame * 360 * 640; i < (frame + 1) * 360 * 640; i++) {
    const delta = Math.abs(left[i] - right[i]);
    frameSum += delta;
    frameMax = Math.max(frameMax, delta);
    if (delta) frameChanged++;
  }
  sum += frameSum;
  max = Math.max(max, frameMax);
  changed += frameChanged;
  const mean = frameSum / (360 * 640),
    fraction = frameChanged / (360 * 640);
  frames.push({
    frame,
    meanAbsoluteGrayDifference: mean,
    maxDifference: frameMax,
    changedPixelFraction: fraction,
  });
  assert.ok(
    mean <= 0.05 && fraction <= 0.005,
    `Replay frame ${frame} exceeds declared visual tolerances`,
  );
}
report.replay = {
  baseline,
  candidate,
  frames: a.durationFrames,
  decodedMobileGraySha256: [hash(left), hash(right)],
  meanAbsoluteGrayDifference: sum / left.length,
  maxDifference: max,
  changedPixelFraction: changed / left.length,
  tolerancePerFrame: {
    meanAbsoluteGrayDifference: 0.05,
    changedPixelFraction: 0.005,
  },
  passed: true,
  mp4ByteEqual: a.videoSha256 === b.videoSha256,
};
await writeFile(
  join(out, 'replay-frames.json'),
  JSON.stringify(frames, null, 2),
);
await writeFile(
  join(out, 'review-report.json'),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      renders: report.renders.map((r) => ({
        name: r.name,
        frames: r.frames,
        seconds: r.seconds,
      })),
      replay: report.replay,
    },
    null,
    2,
  ),
);
