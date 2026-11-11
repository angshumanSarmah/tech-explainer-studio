import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { libraryRegistry } from '../../src/domain/visual-library-registry.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import {
  approveVisualAsset,
  importVisualAsset,
  stageVisualAssets,
} from '../../src/visual-assets/store.ts';
import { json, setup } from './helpers.ts';

test('layered images cannot bypass release rights inventory or attribution; staged bytes remain release-bound', async () => {
  const s = await setup();
  try {
    const file = join(s.root, 'test.svg');
    await writeFile(
      file,
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#45B8D8"/></svg>',
    );
    const root = join(s.root, 'asset-store');
    const pending = await importVisualAsset(
      file,
      {
        originalSource: 'Original synthetic test fixture',
        metadata: {
          title: 'Square',
          description: 'Synthetic release regression',
        },
      },
      root,
    );
    const a = await approveVisualAsset(
      pending.ref,
      {
        reviewer: 'test-only-reviewer',
        rationale: 'Synthetic assertion; no real rights approval',
      },
      {
        rights: 'original',
        licenseEvidence: 'Authored synthetic rectangle',
        attribution: { required: true, text: 'TEST-SQUARE-CREDIT' },
      },
      root,
    );
    const script = parseVideoScript({
      ...s.script,
      schema_version: '1.1.0',
      scenes: s.script.scenes.map((scene) => ({
        ...scene,
        visual: {
          type: 'registered-animation',
          taxonomy_version: '1.0.0',
          component: 'LayeredAssetScene',
          props: {
            ...libraryRegistry.LayeredAssetScene.example,
            layers: libraryRegistry.LayeredAssetScene.example.layers.map(
              (l) => ({ ...l, asset: a.ref }),
            ),
          },
          cues: [],
        },
      })),
    });
    await stageVisualAssets(script, join(s.render, 'visual-assets'), root);
    await json(join(s.render, 'videoscript.json'), script);
    await json(join(s.render, 'render-manifest.json'), {
      ...s.preview,
      scriptSha256: hash(JSON.stringify(script)),
    });
    const original = s.rights.assets.find((a) => a.kind === 'original-visual');
    assert.ok(original);
    original.sha256 = hash(JSON.stringify(script.scenes.map((s) => s.visual)));
    if (original.review) original.review.assetSha256 = original.sha256;
    await json(s.options.rights, s.rights);
    const { releaseId } = await s.service.prepare(s.options);
    const result = await s.service.check(releaseId);
    assert.ok(result.issues.includes('RIGHTS_INVENTORY_MISSING:image'));
    assert.ok(
      result.issues.includes(`ATTRIBUTION_MISSING:${a.record.assetId}`),
    );
    assert.equal(result.eligible, false);
    await writeFile(
      join(s.render, 'visual-assets', `${a.record.sha256}.svg`),
      'changed',
    );
    await assert.rejects(s.service.check(releaseId), /inventory changed/);
    // Original fixture and actual local media are never replaced by this synthetic test.
    assert.ok(await readFile(file));
  } finally {
    s.repo.close();
    await rm(s.root, { recursive: true, force: true });
  }
});
