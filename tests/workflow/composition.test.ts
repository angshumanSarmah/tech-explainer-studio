import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { COMPOSED_EXAMPLE } from '../../src/domain/composed.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { inspectReleaseMedia } from '../../src/release/media.ts';
import { importSnapshot } from '../../src/workflow/import.ts';
import { JobRunner } from '../../src/workflow/runner.ts';
import { inputs, renderTestScene } from './helpers.ts';

test('real SQLite/FFmpeg workflow reuses all audio and both-neighbor boundary clips invalidate correctly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-composed-'));
  const events: { stage: string; sceneId: string; cached: boolean }[] = [];
  const runner = new JobRunner(join(root, 'data'), join(root, 'output'), {
    adapterId: 'composition-test-v1',
    renderScene: renderTestScene,
    onStep: (e) => events.push(e),
  });
  try {
    const original = await inputs(root);
    const script = parseVideoScript({
      ...original.script,
      schema_version: '1.2.0',
      scenes: original.script.scenes.map((scene, i) => ({
        ...scene,
        visual: {
          type: 'composed',
          component: 'ComposedScene',
          props: structuredClone(COMPOSED_EXAMPLE),
          cues: [],
        },
        ...(i ? { transition: { kind: 'crossfade', preset: 'short' } } : {}),
      })),
    });
    const path = join(root, 'composed.json');
    await writeFile(path, JSON.stringify(script));
    const snapshot = await importSnapshot(
      { script: path, narration: original.narration, allowFallback: true },
      runner.cache,
    );
    const job = runner.repo.create(snapshot),
      first = await runner.resume(job.id);
    const originalVideo = await readFile(join(first.outputDir, 'video.mp4'));
    // Independent release inspection must read the cached assembly's tool receipt,
    // then reject these explicitly synthetic narration fixtures at the normal gate.
    await assert.rejects(
      () => inspectReleaseMedia(first.outputDir),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'MOCK_NARRATION',
    );
    events.length = 0;
    const repeated = await runner.resume(job.id);
    assert.deepEqual(
      await readFile(join(repeated.outputDir, 'video.mp4')),
      originalVideo,
    );
    assert.equal(events.filter((e) => !e.cached).length, 0);
    let previous = snapshot;
    for (const index of [0, 1]) {
      const scene = required(script.scenes[index]).visual;
      if (scene.type !== 'composed') throw new Error();
      required(scene.props.entities[0]).role = index ? 'success' : 'highlight';
      await writeFile(path, JSON.stringify(script));
      const revised = await importSnapshot(
        { script: path },
        runner.cache,
        previous,
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
      events.length = 0;
      await runner.resume(job.id);
      assert.equal(
        events.filter((e) => e.stage === 'audio' && !e.cached).length,
        0,
      );
      assert.deepEqual(
        events
          .filter((e) => e.stage === 'scene' && !e.cached)
          .map((e) => e.sceneId),
        index === 0
          ? script.scenes.map((s) => s.scene_id)
          : [required(script.scenes[1]).scene_id],
      );
      previous = revised;
    }
    assert.equal(runner.repo.get(job.id).status, 'review_ready');
  } finally {
    runner.close();
    await rm(root, { recursive: true, force: true });
  }
});

function required<T>(value: T | null | undefined): T {
  assert.ok(value !== undefined && value !== null);
  return value;
}
