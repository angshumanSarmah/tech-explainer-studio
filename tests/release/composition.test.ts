import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { COMPOSED_EXAMPLE } from '../../src/domain/composed.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { libraryRegistry } from '../../src/domain/visual-library-registry.ts';
import { reviewRecord } from '../../src/release/service.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import { approve, checks, json, setup } from './helpers.ts';

test('visual semantic edits with identical narration invalidate facts, rights, video and release; pacing decisions bind exact reports', async () => {
  const s = await setup();
  try {
    const script = parseVideoScript({
      ...s.script,
      schema_version: '1.2.0',
      scenes: s.script.scenes.map((scene) => ({
        ...scene,
        visual: {
          type: 'composed',
          component: 'ComposedScene',
          props: structuredClone(COMPOSED_EXAMPLE),
          cues: [],
        },
      })),
    });
    const report = { boundaries: [{ id: 'a--b', requiresHumanReview: true }] };
    await json(join(s.render, 'boundary-pacing.json'), report);
    await json(join(s.render, 'videoscript.json'), script);
    await json(join(s.render, 'render-manifest.json'), {
      ...s.preview,
      scriptSha256: hash(JSON.stringify(script)),
    });
    s.rights.assets = s.rights.assets.map((a) =>
      a.kind === 'original-visual'
        ? {
            ...a,
            sha256: hash(JSON.stringify(script.scenes.map((s) => s.visual))),
            review: {
              ...required(a.review),
              assetSha256: hash(
                JSON.stringify(script.scenes.map((s) => s.visual)),
              ),
            },
          }
        : a,
    );
    await json(s.options.rights, s.rights);
    const first = await s.service.prepare(s.options);
    await approve(s.service, first.releaseId, 'facts');
    await approve(s.service, first.releaseId, 'rights');
    await assert.rejects(
      () => approve(s.service, first.releaseId, 'video'),
      /Listen to each flagged boundary/,
    );
    const record = reviewRecord(
      'video-reviewer',
      'Synthetic media test only',
      'approve',
      checks,
    );
    const reportSha256 = hash(
      await readFile(join(s.render, 'boundary-pacing.json')),
    );
    for (const classification of ['unresolved', 'unintended'] as const)
      await assert.rejects(
        () =>
          s.service.review(first.releaseId, 'video', {
            ...record,
            boundaryPacing: {
              reportSha256,
              decisions: [
                { id: 'a--b', classification, rationale: 'Test-only report' },
              ],
            },
          }),
        /Listen to each flagged boundary/,
      );
    await s.service.review(first.releaseId, 'video', {
      ...record,
      boundaryPacing: {
        reportSha256,
        decisions: [
          {
            id: 'a--b',
            classification: 'deliberate',
            rationale: 'Synthetic test assertion, no real human review',
          },
        ],
      },
    });
    await approve(s.service, first.releaseId, 'publish');
    const v = required(script.scenes[0]).visual;
    if (v.type !== 'composed') throw new Error();
    required(v.props.entities[0]).label = 'Different meaning';
    await json(join(s.render, 'videoscript.json'), script);
    await json(join(s.render, 'render-manifest.json'), {
      ...s.preview,
      scriptSha256: hash(JSON.stringify(script)),
    });
    const second = await s.service.prepare(s.options);
    const result = await s.service.check(second.releaseId);
    assert.equal(result.approvals.facts, null);
    assert.equal(result.approvals.rights, null);
    assert.equal(result.approvals.video, null);
    assert.equal(result.approvals.publish, null);
    assert.equal(
      required(script.scenes[0]).narration,
      required(s.script.scenes[0]).narration,
    );
  } finally {
    s.repo.close();
    await rm(s.root, { recursive: true, force: true });
  }
});

function required<T>(value: T | null | undefined): T {
  assert.ok(value !== undefined && value !== null);
  return value;
}

test('specialized crossfade binds predecessor visual meaning even when both narration strings remain unchanged', async () => {
  const s = await setup();
  try {
    const first = required(s.script.scenes[0]);
    const visual = {
      type: 'registered-animation',
      component: 'CacheAsideScene',
      taxonomy_version: '1.0.0',
      props: structuredClone(libraryRegistry.CacheAsideScene.example),
      cues: [],
    };
    const script = parseVideoScript({
      ...s.script,
      schema_version: '1.2.0',
      scenes: [
        { ...first, visual },
        {
          ...first,
          scene_id: 'second',
          visual,
          transition: { kind: 'crossfade', preset: 'short' },
        },
      ],
    });
    const save = async () => {
      await json(join(s.render, 'videoscript.json'), script);
      await json(join(s.render, 'render-manifest.json'), {
        ...s.preview,
        scriptSha256: hash(JSON.stringify(script)),
      });
    };
    await save();
    const a = await s.service.prepare(s.options);
    await approve(s.service, a.releaseId, 'facts');
    const oldNarration = script.scenes.map((scene) => scene.narration);
    const changed = required(script.scenes[0]).visual;
    if (
      changed.type !== 'registered-animation' ||
      changed.component !== 'CacheAsideScene'
    )
      throw new Error();
    changed.props = { ...changed.props, valueLabel: 'Different data' };
    await save();
    const b = await s.service.prepare(s.options);
    assert.equal(s.service.approvals(b.releaseId, b.manifest).facts, null);
    assert.deepEqual(
      script.scenes.map((scene) => scene.narration),
      oldNarration,
    );
  } finally {
    s.repo.close();
    await rm(s.root, { recursive: true, force: true });
  }
});
