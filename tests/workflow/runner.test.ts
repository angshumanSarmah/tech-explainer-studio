import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { runJobsCli } from '../../src/cli/jobs-cli.ts';
import { importDraft, reviewDraft } from '../../src/director/core.ts';
import { loadNarrationAsset } from '../../src/media/narration-input.ts';
import { probeNarratedVideo } from '../../src/media/qc.ts';
import { probeSilentVideo } from '../../src/renderers/remotion/media-tools.ts';
import { evidenceKey, fingerprint } from '../../src/workflow/dependencies.ts';
import { importSnapshot } from '../../src/workflow/import.ts';
import { WorkflowError } from '../../src/workflow/model.ts';
import { JobRunner } from '../../src/workflow/runner.ts';
import { researchFixture } from '../director/helpers.ts';
import { inputs, renderTestScene } from './helpers.ts';

const root = await mkdtemp(join(tmpdir(), 'studio-workflow-'));
after(() => rm(root, { recursive: true, force: true }));
const source = await inputs(root);
const adapter = {
  renderScene: renderTestScene,
  adapterId: 'phase07-test-renderer-v1',
};
function editHeading(script: typeof source.script) {
  const first = script.scenes[0];
  assert.ok(first?.visual.type === 'title-card');
  first.visual.heading = 'Inside the HTTP server';
  return script;
}
test('real FFmpeg assembly resumes cached outputs, edits only one visual and repairs one corrupt clip', async () => {
  const events: { stage: string; sceneId: string; cached: boolean }[] = [];
  const runner = new JobRunner(
    join(root, 'incremental'),
    join(root, 'exports'),
    { ...adapter, onStep: (e) => events.push(e) },
  );
  try {
    const snapshot = await importSnapshot(
      { script: source.path, narration: source.narration, allowFallback: true },
      runner.cache,
    );
    const job = runner.repo.create(snapshot);
    const result = await runner.resume(job.id);
    assert.equal(runner.repo.get(job.id).status, 'review_ready');
    assert.equal(result.approvedForRelease, false);
    const output = JSON.parse(
      await readFile(join(result.outputDir, 'job-manifest.json'), 'utf8'),
    );
    assert.equal(output.provenance.origin, 'manual_import');
    assert.equal(output.effectiveBrand.id, 'tech-explainer');
    assert.equal(output.narration[0].metadata.settings.voiceId, 'mock-tone');
    assert.equal(output.approvedForRelease, false);
    const manifest = JSON.parse(
      await readFile(join(result.outputDir, 'render-manifest.json'), 'utf8'),
    );
    assert.ok(
      manifest.narration.every((a: { wavPath: string }) =>
        a.wavPath.startsWith('narration/'),
      ),
    );
    await probeNarratedVideo(join(result.outputDir, 'video.mp4'), 60);
    events.length = 0;
    const again = await runner.resume(job.id);
    assert.equal(again.outputDir, result.outputDir);
    assert.equal(events.filter((e) => !e.cached).length, 0);
    const original = runner.repo.steps(job.id);
    const audioHashes = original
      .filter((s) => s.stage === 'audio')
      .map((s) => s.outputHash);
    const changed = editHeading(structuredClone(source.script));
    const path = join(root, 'changed.json');
    await writeFile(path, JSON.stringify(changed));
    const revised = await importSnapshot(
      { script: path },
      runner.cache,
      snapshot,
    );
    const lease = runner.repo.acquire(job.id);
    runner.repo.revise(
      job.id,
      revised,
      lease,
      runner.repo.get(job.id).version,
      false,
      false,
    );
    runner.repo.release(lease);
    assert.equal(runner.repo.render(job.id), null);
    events.length = 0;
    await runner.resume(job.id);
    assert.deepEqual(
      events
        .filter((e) => e.stage === 'scene' && !e.cached)
        .map((e) => e.sceneId),
      [source.script.scenes[0]?.scene_id],
    );
    assert.deepEqual(
      runner.repo
        .steps(job.id)
        .filter((s) => s.stage === 'audio')
        .map((s) => s.outputHash),
      audioHashes,
    );
    const clip = runner.repo
      .steps(job.id)
      .find(
        (s) =>
          s.stage === 'scene' &&
          s.sceneId === source.script.scenes[1]?.scene_id,
      );
    assert.ok(clip?.output);
    const video = clip.output.find((f) => f.file === 'video.mp4');
    assert.ok(video);
    await writeFile(runner.cache.blob(video.sha256), 'corrupted');
    events.length = 0;
    await runner.resume(job.id);
    assert.deepEqual(
      events
        .filter((e) => e.stage === 'scene' && !e.cached)
        .map((e) => e.sceneId),
      [source.script.scenes[1]?.scene_id],
    );
  } finally {
    runner.close();
  }
});
test('SIGKILL during scene two recovers after lease timeout without rerendering scene one or loading paid/research code', async () => {
  const data = join(root, 'crash');
  const exports = join(root, 'crash-output');
  let runner = new JobRunner(data, exports, adapter);
  const snapshot = await importSnapshot(
    { script: source.path, narration: source.narration, allowFallback: true },
    runner.cache,
  );
  const job = runner.repo.create(snapshot);
  runner.close();
  const worker = resolve('tests/workflow/crash-worker.ts');
  const killed = spawnSync(
    process.execPath,
    [worker, data, exports, job.id, 'kill'],
    { encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(killed.signal, 'SIGKILL', killed.stderr);
  runner = new JobRunner(data, exports, adapter);
  const first = runner.repo
    .steps(job.id)
    .find((s) => s.stage === 'scene' && s.status === 'succeeded');
  assert.ok(first);
  assert.equal(runner.repo.get(job.id).status, 'running');
  // Simulate the clock reaching the persisted heartbeat deadline, without a two-minute sleep.
  runner.repo.db.exec('UPDATE leases SET expires_at=0');
  runner.close();
  const resumed = spawnSync(
    process.execPath,
    [worker, data, exports, job.id, 'resume'],
    { encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(resumed.status, 0, resumed.stderr);
  runner = new JobRunner(data, exports, adapter);
  try {
    assert.equal(runner.repo.get(job.id).status, 'review_ready');
    const steps = runner.repo.steps(job.id);
    assert.equal(steps.find((s) => s.id === first.id)?.attempts, 1);
    assert.equal(
      steps.find((s) => s.id === first.id)?.outputHash,
      first.outputHash,
    );
    assert.equal(
      steps.find(
        (s) =>
          s.stage === 'scene' &&
          s.sceneId === source.script.scenes[1]?.scene_id,
      )?.attempts,
      2,
    );
    assert.equal(runner.repo.usage(job.id).length, 0);
  } finally {
    runner.close();
  }
});
test('saved narrator changes clear audio cache inputs, preserve script, and require explicit local synthesis', async () => {
  const runner = new JobRunner(
    join(root, 'voice'),
    join(root, 'voice-output'),
    adapter,
  );
  try {
    const original = await importSnapshot(
      { script: source.path, narration: source.narration, allowFallback: true },
      runner.cache,
    );
    const job = runner.repo.create(original);
    await runner.resume(job.id);
    const config = JSON.parse(
      await readFile('narration.mock.example.json', 'utf8'),
    );
    config.settings = {
      version: 'kokoro-http-v2',
      voiceId: 'af_bella',
      language: 'en-us',
      rate: 1,
      seed: 0,
      lexiconVersion: 'tech-en-v1',
    };
    const configPath = join(root, 'bella.json');
    await writeFile(configPath, JSON.stringify(config));
    const revised = await importSnapshot(
      { script: source.path, config: configPath },
      runner.cache,
      original,
    );
    assert.deepEqual(revised.savedAudio, {});
    assert.equal(fingerprint(revised.script), fingerprint(original.script));
    const leases = runner.repo.acquire(job.id);
    runner.repo.revise(
      job.id,
      revised,
      leases,
      runner.repo.get(job.id).version,
      false,
      false,
    );
    runner.repo.release(leases);
    await assert.rejects(
      () => runner.resume(job.id),
      /explicitly pass --allow-local-synthesis/,
    );
    await runner.resume(job.id, { allowLocalSynthesis: true });
    assert.equal(runner.repo.get(job.id).status, 'review_ready');
    assert.equal(runner.repo.usage(job.id).length, 0);
    const scenes = runner.repo.steps(job.id).filter((s) => s.stage === 'scene');
    assert.equal(scenes.length, 2); // same timing/captions => pixels reused
  } finally {
    runner.close();
  }
});
test('bound research/reviews/origin survive SQLite; evidence changes pause and cannot bypass review via pause/continue', async () => {
  const evidence = await researchFixture();
  evidence.script.scenes = evidence.script.scenes.slice(0, 2);
  for (const scene of evidence.script.scenes)
    scene.timing = { min_seconds: 0.5, preferred_seconds: 1, max_seconds: 2 };
  const draft = reviewDraft(
    importDraft(JSON.stringify(evidence.script), {
      origin: 'deepseek',
      generation: {
        model: 'synthetic-receipt-only',
        budget: null,
        brief: evidence.bundle.instructions,
        requestSha256: 'e'.repeat(64),
        attempts: 1,
        usage: [
          {
            inputTokens: 100,
            outputTokens: 20,
            estimatedUsd: 0.01,
            reservedUsd: 0.02,
            outcome: 'success',
          },
        ],
      },
      bundle: evidence.bundle,
      ledger: evidence.ledger,
    }),
    'Fixture reviewer',
    'Reviewed for this storage test',
    { bundle: evidence.bundle, ledger: evidence.ledger },
  );
  const draftPath = join(root, 'draft.json'),
    bundlePath = join(root, 'bundle.json'),
    ledgerPath = join(root, 'ledger.json');
  await writeFile(draftPath, JSON.stringify(draft));
  await writeFile(bundlePath, JSON.stringify(evidence.bundle));
  await writeFile(ledgerPath, JSON.stringify(evidence.ledger));
  const runner = new JobRunner(
    join(root, 'evidence'),
    join(root, 'evidence-out'),
    adapter,
  );
  try {
    const snapshot = await importSnapshot(
      {
        draft: draftPath,
        bundle: bundlePath,
        ledger: ledgerPath,
        config: 'narration.mock.example.json',
        allowFallback: true,
      },
      runner.cache,
    );
    const job = runner.repo.create(snapshot);
    const saved = runner.repo.snapshot(job.id);
    const preview = await runner.resume(job.id, { allowLocalSynthesis: true });
    const manifest = JSON.parse(
      await readFile(join(preview.outputDir, 'job-manifest.json'), 'utf8'),
    );
    assert.equal(manifest.provenance.origin, 'deepseek');
    assert.equal(
      manifest.provenance.research.bundleSha256,
      evidence.bundle.bundleSha256,
    );
    assert.equal(manifest.provenance.usage.entries[0].estimatedUsd, 0.01);
    assert.equal(runner.repo.usage(job.id).length, 1);
    assert.equal(
      saved.provenance.research?.bundleSha256,
      evidence.bundle.bundleSha256,
    );
    assert.equal(
      saved.provenance.research?.ledgerRevision,
      evidence.ledger.revision,
    );
    assert.equal(
      saved.provenance.research?.claimReviewReferences[0]?.review?.reviewer,
      'Synthetic test reviewer',
    );
    const changed = structuredClone(evidence.script);
    const claim = changed.claims[0];
    assert.ok(claim);
    claim.text = 'An edited unsupported assertion';
    const path = join(root, 'evidence-changed.json');
    await writeFile(path, JSON.stringify(changed));
    const next = await importSnapshot({ script: path }, runner.cache, saved);
    assert.notEqual(evidenceKey(next), evidenceKey(saved));
    const leases = runner.repo.acquire(job.id);
    runner.repo.revise(
      job.id,
      next,
      leases,
      runner.repo.get(job.id).version,
      true,
      false,
    );
    runner.repo.release(leases);
    await assert.rejects(() => runner.resume(job.id), /needs evidence review/);
    assert.equal(runner.repo.get(job.id).status, 'needs_review');
    let stderr = '';
    const output = {
      stdout: () => {},
      stderr: (s: string) => {
        stderr += s;
      },
    };
    assert.equal(
      await runJobsCli(['pause', job.id, '--data', runner.dataDir], output),
      0,
    );
    assert.equal(
      await runJobsCli(['continue', job.id, '--data', runner.dataDir], output),
      5,
    );
    assert.match(stderr, /EVIDENCE_REVIEW_REQUIRED/);
    await assert.rejects(() =>
      importSnapshot(
        { draft: draftPath, config: 'narration.mock.example.json' },
        runner.cache,
      ),
    );
  } finally {
    runner.close();
  }
});

test('scene-only exports one clip, failures retain a scene diagnostic, and unchanged inputs stop after two attempts', async () => {
  let failing = true;
  const rendered: string[] = [];
  const runner = new JobRunner(
    join(root, 'bounded'),
    join(root, 'bounded-out'),
    {
      ...adapter,
      renderScene: async (script, options) => {
        const id =
          options.frameRange?.[0] === 0 ? 'scene-01-hook' : 'scene-02-request';
        rendered.push(id);
        if (id === 'scene-02-request' && failing)
          throw new WorkflowError(
            'TEST_RENDER_FAILURE',
            'scene',
            'Deliberate scene failure',
            id,
          );
        return renderTestScene(script, options);
      },
    },
  );
  try {
    const snapshot = await importSnapshot(
      { script: source.path, narration: source.narration, allowFallback: true },
      runner.cache,
    );
    const job = runner.repo.create(snapshot);
    for (let n = 0; n < 2; n++)
      await assert.rejects(
        () => runner.resume(job.id),
        (e) =>
          e instanceof WorkflowError &&
          e.code === 'TEST_RENDER_FAILURE' &&
          e.sceneId === 'scene-02-request',
      );
    await assert.rejects(
      () => runner.resume(job.id),
      (e) =>
        e instanceof WorkflowError &&
        e.code === 'RETRY_LIMIT' &&
        e.sceneId === 'scene-02-request',
    );
    assert.equal(rendered.filter((id) => id === 'scene-01-hook').length, 1);
    assert.equal(rendered.filter((id) => id === 'scene-02-request').length, 2);
    assert.equal(runner.repo.render(job.id), null);
    const selected = await runner.resume(job.id, { sceneId: 'scene-01-hook' });
    assert.equal(selected.sceneId, 'scene-01-hook');
    await probeSilentVideo(join(selected.outputDir, 'video.mp4'), 30);
    assert.equal(runner.repo.render(job.id), null);
    assert.equal(runner.repo.get(job.id).status, 'queued');
    // Explicit scene repair changes the failed scene input; good clip/audio hashes remain eligible.
    failing = false;
    const revised = structuredClone(snapshot);
    const second = revised.script.scenes[1];
    assert.ok(second?.visual.type === 'tech-animation');
    second.visual.props.request.path = '/health';
    const leases = runner.repo.acquire(job.id);
    runner.repo.revise(
      job.id,
      revised,
      leases,
      runner.repo.get(job.id).version,
      false,
      false,
    );
    runner.repo.release(leases);
    await runner.resume(job.id);
    assert.equal(runner.repo.get(job.id).status, 'review_ready');
    assert.equal(rendered.filter((id) => id === 'scene-01-hook').length, 1);
  } finally {
    runner.close();
  }
});

test('saved-audio credential fields are rejected before persistence and legacy metadata paths are ignored', async () => {
  const runner = new JobRunner(
    join(root, 'unsafe'),
    join(root, 'unsafe-output'),
    adapter,
  );
  try {
    const first = source.script.scenes[0];
    assert.ok(first);
    const metadata = JSON.parse(
      await readFile(
        join(source.narration, first.scene_id, 'narration.json'),
        'utf8',
      ),
    );
    const dir = join(root, 'unsafe-narration', first.scene_id);
    await mkdir(dir, { recursive: true });
    metadata.wavPath = '/a/stale/legacy/location.wav';
    metadata.metadataPath = '/a/stale/legacy/narration.json';
    await copyFile(
      join(source.narration, first.scene_id, `${first.scene_id}.wav`),
      join(dir, `${first.scene_id}.wav`),
    );
    await writeFile(join(dir, 'narration.json'), JSON.stringify(metadata));
    assert.equal(
      (await loadNarrationAsset(first, dir)).sha256,
      metadata.sha256,
    );
    metadata.identity.apiKey = 'synthetic-sensitive-value';
    await writeFile(join(dir, 'narration.json'), JSON.stringify(metadata));
    await assert.rejects(
      () =>
        importSnapshot(
          { script: source.path, narration: join(root, 'unsafe-narration') },
          runner.cache,
        ),
      (error) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'UNSAFE_METADATA' &&
        !error.message.includes('synthetic-sensitive-value'),
    );
    assert.equal(runner.repo.list().length, 0);
  } finally {
    runner.close();
  }
});

test('inherited object names cannot dispatch a command or masquerade as saved audio', async () => {
  const runner = new JobRunner(
    join(root, 'own-properties'),
    join(root, 'own-output'),
    adapter,
  );
  try {
    const script = structuredClone(source.script);
    script.scenes = script.scenes.slice(0, 1);
    const scene = script.scenes[0];
    assert.ok(scene);
    scene.scene_id = 'constructor';
    const path = join(root, 'constructor-scene.json');
    await writeFile(path, JSON.stringify(script));
    await assert.rejects(
      () => importSnapshot({ script: path }, runner.cache),
      (error) =>
        error instanceof WorkflowError && error.code === 'AUDIO_INPUT_REQUIRED',
    );
    const input = await importSnapshot(
      { script: source.path, config: 'narration.mock.example.json' },
      runner.cache,
    );
    const job = runner.repo.create(input);
    const leases = runner.repo.acquire(job.id);
    runner.repo.transition(job.id, 'paused', leases);
    runner.repo.release(leases);
    let stderr = '';
    const result = await runJobsCli(
      ['constructor', job.id, '--data', runner.dataDir],
      {
        stdout: () => {},
        stderr: (s) => {
          stderr += s;
        },
      },
    );
    assert.equal(result, 2);
    assert.match(stderr, /CLI_USAGE_ERROR/);
    assert.equal(runner.repo.get(job.id).status, 'paused');
  } finally {
    runner.close();
  }
});
