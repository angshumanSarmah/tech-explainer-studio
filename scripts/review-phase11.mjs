import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { probeNarratedVideo } from '../src/media/qc.ts';
import { hash } from '../src/render-manifest/manifest.ts';
import {
  executeFile,
  executeMedia,
  mediaBinary,
  probeSilentVideo,
} from '../src/renderers/remotion/media-tools.ts';
import { validateCaptions } from '../src/timing/timeline.ts';

// Read-only input checks and new exclusive frame outputs; never updates human approvals.
const [input, outputArg] = process.argv.slice(2);
if (!input || !outputArg)
  throw new Error(
    'node scripts/review-phase11.mjs <name-to-render-directory.json> <new-review-directory>',
  );
const dirs = JSON.parse(await readFile(input, 'utf8')),
  out = resolve(outputArg);
await mkdir(out);
const reports = [];
const goldens = [];
const binary = mediaBinary('ffmpeg');
async function pixels(video, frame, roi) {
  const { stdout } = await executeFile(
    binary,
    [
      '-v',
      'error',
      '-nostdin',
      '-ss',
      String(frame / 30),
      '-i',
      video,
      '-frames:v',
      '1',
      '-vf',
      `crop=${roi.w}:${roi.h}:${roi.x}:${roi.y}`,
      '-an',
      '-pix_fmt',
      'rgb24',
      '-c:v',
      'rawvideo',
      '-f',
      'image2pipe',
      '-',
    ],
    {
      encoding: null,
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, DYLD_LIBRARY_PATH: dirname(binary) },
    },
  );
  assert.equal(stdout.length, roi.w * roi.h * 3);
  return stdout;
}
function delta(a, b) {
  let pixels = 0,
    total = 0;
  for (let i = 0; i < a.length; i += 3) {
    let d = 0;
    for (let c = 0; c < 3; c++) d += Math.abs(a[i + c] - b[i + c]);
    if (d > 60) pixels++;
    total += d;
  }
  return { changedPixels: pixels, meanAbsoluteRgbDifference: total / a.length };
}
for (const [name, dir] of Object.entries(dirs)) {
  const manifest = JSON.parse(
      await readFile(join(dir, 'render-manifest.json'), 'utf8'),
    ),
    video = join(dir, 'video.mp4'),
    silent = manifest.kind === 'silent-preview';
  assert.equal(hash(await readFile(video)), manifest.videoSha256);
  assert.equal(manifest.approvedForRelease, false);
  const probe = silent
    ? await probeSilentVideo(video, manifest.durationFrames)
    : await probeNarratedVideo(video, manifest.durationFrames);
  let timeline;
  if (!silent) {
    assert.equal(manifest.isMock, false);
    timeline = JSON.parse(await readFile(join(dir, 'timeline.json'), 'utf8'));
    validateCaptions(
      timeline.captions,
      timeline.scenes,
      manifest.durationFrames,
    );
    const qc = JSON.parse(await readFile(join(dir, 'qc-report.json'), 'utf8'));
    assert.ok(
      qc.decodedAudio.every(
        (s) => s.clipped === 0 && Math.abs(s.dcOffset) < 0.01,
      ),
    );
    for (const a of manifest.narration) {
      assert.equal(a.metadata.settings.voiceId, 'af_heart');
      assert.equal(a.metadata.settings.rate, 1);
      assert.equal(
        a.metadata.originalTextSha256,
        hash(
          timeline.scenes.find((s) => s.scene.scene_id === a.sceneId).scene
            .narration,
        ),
      );
    }
    assert.equal(manifest.requiresTimingReview, true);
  }
  const scenes = silent
    ? manifest.scenes.map((s) => ({
        ...s,
        scene: {
          scene_id: s.scene_id,
          visual: {
            type: 'registered-animation',
            component: 'LayeredAssetScene',
            cues: [],
          },
        },
      }))
    : timeline.scenes;
  const checks = [];
  for (const [index, item] of scenes.entries()) {
    const v = item.scene.visual;
    if (name === 'queue' && ![0, 3, 5].includes(index)) continue;
    if (name === 'btree' && ![0, 3].includes(index)) continue;
    if (name === 'git-objects' && index > 0) continue;
    if (name === 'http' && ![1, 4].includes(index)) continue;
    const cue = item.cueWindows?.[0];
    const start = cue?.fromFrame ?? 0,
      end = cue?.toFrame ?? item.durationFrames - 1;
    const fractions =
      name === 'cloud-sync'
        ? [0.15, 0.25, 0.9]
        : name === 'btree'
          ? [0.2, 0.4, 0.96]
          : name === 'git-objects'
            ? [0.19, 0.21, 0.9]
            : name === 'code-trace'
              ? [0.2, 0.6, 0.95]
              : name === 'queue'
                ? [0.1, 0.18, 0.9]
                : [0.2, 0.65, 0.94];
    const frames = fractions.map(
      (f) =>
        item.from +
        Math.min(
          item.durationFrames - 1,
          Math.round(start + f * (end - start)),
        ),
    );
    let roi = { x: 96, y: 480, w: 816, h: 800 };
    if (name === 'btree') roi = { x: 340, y: 658, w: 380, h: 160 };
    if (name === 'git-objects') roi = { x: 430, y: 500, w: 160, h: 160 };
    if (name === 'code-trace') roi = { x: 128, y: 500, w: 752, h: 580 };
    if (name === 'caching' && v.props.visualPhase === 'lookup')
      roi = { x: 396, y: 632, w: 220, h: 140 };
    const d = delta(
      await pixels(video, frames[0], roi),
      await pixels(video, frames[1], roi),
    );
    const expectedIdle = name === 'queue' && index === 5;
    if (!expectedIdle)
      assert.ok(
        d.changedPixels > 40,
        `${name}/${item.scene.scene_id}: no visible mechanism change ${JSON.stringify(d)}`,
      );
    const poses = [];
    for (const [i, frame] of frames.entries()) {
      const stem = `${name}-${item.scene.scene_id}-${i}`,
        file = `${stem}.png`,
        mobile = `${stem}-mobile.png`;
      await executeMedia('ffmpeg', [
        '-v',
        'error',
        '-nostdin',
        '-ss',
        String(frame / 30),
        '-i',
        video,
        '-frames:v',
        '1',
        join(out, file),
      ]);
      await executeMedia('ffmpeg', [
        '-v',
        'error',
        '-nostdin',
        '-i',
        join(out, file),
        '-vf',
        'scale=360:640',
        '-frames:v',
        '1',
        join(out, mobile),
      ]);
      const pose = {
        sceneId: item.scene.scene_id,
        frame,
        file,
        mobile,
        sha256: hash(await readFile(join(out, file))),
        mobileSha256: hash(await readFile(join(out, mobile))),
      };
      poses.push(pose);
      goldens.push(pose);
    }
    checks.push({
      sceneId: item.scene.scene_id,
      roi,
      frames,
      ...d,
      expectedIdle,
      poses,
    });
  }
  reports.push({
    name,
    dir,
    sha256: manifest.videoSha256,
    frames: manifest.durationFrames,
    seconds: manifest.durationFrames / 30,
    media: probe.summary,
    brand: manifest.brand ?? null,
    requiresTimingReview: !silent,
    approvedForRelease: false,
    checks,
  });
  await writeFile(
    join(out, 'review-report.json'),
    JSON.stringify(reports, null, 2),
  );
}
await writeFile(
  join(out, 'golden-manifest.json'),
  JSON.stringify(
    {
      status: 'coding-agent-baseline; human visual review pending',
      approvedForRelease: false,
      frames: goldens,
    },
    null,
    2,
  ),
);
await writeFile(
  join(out, 'HUMAN-REVIEW.md'),
  '# Phase 11 human review\n\nThese coding-agent checks and synthetic asset reviews grant no release approval.\n\n- [ ] Watch every complete MP4 on a phone\n- [ ] Listen for voice clarity, noise and pronunciation\n- [ ] Check packet/file travel and causal state transitions\n- [ ] Check queue waiting vs processing, drop vs block, and capacity\n- [ ] Verify B-tree path and Git reference direction\n- [ ] Verify code trace values manually; source never executes\n- [ ] Check all caption lines and event timing; scene speech-span fallback remains unreviewed\n- [ ] Judge visual polish and consistency against the previous cache proof\n- [ ] Replace test-only asset review assertions with genuine human rights decisions before production use\n- [ ] Complete source snapshots/claim decisions, credits and separate Phase 08 exact-artifact gates\n\nNo Phase 11B, dashboard or publishing authorization is implied.\n',
);
console.log(
  JSON.stringify(
    reports.map((r) => ({
      name: r.name,
      seconds: r.seconds,
      sha256: r.sha256,
      states: r.checks.length,
    })),
    null,
    2,
  ),
);
