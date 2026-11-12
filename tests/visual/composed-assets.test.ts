import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { COMPOSED_EXAMPLE } from '../../src/domain/composed.ts';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { compileVisualPlan } from '../../src/renderers/remotion/compile.ts';
import { planSilentRender } from '../../src/renderers/remotion/plan.ts';
import {
  approveVisualAsset,
  importVisualAsset,
  preflightVisualAssets,
  scriptAssetRefs,
  stageVisualAssets,
} from '../../src/visual-assets/store.ts';
import { fixture } from '../helpers/fixture.ts';

test('composed asset inventory binds exact reviewed records/bytes from both sides, rejects pending and changed files, stages portable evidence', async () => {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'composed-assets-')),
  );
  try {
    const source = join(root, 'original.svg'),
      store = join(root, 'assets');
    await writeFile(
      source,
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect x="0" y="0" width="300" height="300" fill="#45B8D8"/></svg>',
    );
    const a = await importVisualAsset(
      source,
      {
        originalSource: 'Original synthetic unit fixture',
        metadata: {
          title: 'Test fixture',
          description: 'No human production approval',
        },
      },
      store,
    );
    const props = structuredClone(COMPOSED_EXAMPLE),
      node = required(props.entities[0]);
    if (node.kind !== 'node') throw new Error();
    node.asset = a.ref;
    const f = fixture();
    let s = parseVideoScript({
      ...f,
      schema_version: '1.2.0',
      scenes: [
        {
          ...f.scenes[0],
          visual: {
            type: 'composed',
            component: 'ComposedScene',
            props,
            cues: [],
          },
        },
      ],
    });
    await assert.rejects(preflightVisualAssets(s, store), /approved rights/);
    const reviewed = await approveVisualAsset(
      a.ref,
      { reviewer: 'unit-test-harness', rationale: 'Synthetic fixture only' },
      {
        rights: 'original',
        licenseEvidence: 'Original geometry for tests',
        attribution: { required: false, text: null },
      },
      store,
    );
    node.asset = reviewed.ref;
    s = parseVideoScript({
      ...s,
      scenes: [
        {
          ...s.scenes[0],
          visual: {
            type: 'composed',
            component: 'ComposedScene',
            props,
            cues: [],
          },
        },
      ],
    });
    assert.equal(
      required(scriptAssetRefs(s)[0]).recordSha256,
      reviewed.ref.recordSha256,
    );
    const key = required(
      compileVisualPlan(s, planSilentRender(s).scenes).scenes[0],
    ).dependency;
    const staged = await stageVisualAssets(s, join(root, 'portable'), store);
    assert.equal(staged.length, 1);
    assert.equal(
      (await preflightVisualAssets(s, join(root, 'portable'))).length,
      1,
    );
    const before = await readFile(source);
    await writeFile(
      join(store, `${reviewed.ref.sha256}.svg`),
      Buffer.concat([before, Buffer.from(' ')]),
    );
    await assert.rejects(preflightVisualAssets(s, store), /changed bytes/);
    node.asset = { ...reviewed.ref, recordSha256: 'f'.repeat(64) };
    const changed = parseVideoScript({
      ...s,
      scenes: [
        {
          ...s.scenes[0],
          visual: {
            type: 'composed',
            component: 'ComposedScene',
            props,
            cues: [],
          },
        },
      ],
    });
    assert.notEqual(
      required(
        compileVisualPlan(changed, planSilentRender(changed).scenes).scenes[0],
      ).dependency,
      key,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function required<T>(value: T | null | undefined): T {
  assert.ok(value !== undefined && value !== null);
  return value;
}
