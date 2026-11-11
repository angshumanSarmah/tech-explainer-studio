import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseVideoScript } from '../../src/domain/validation.ts';
import { libraryRegistry } from '../../src/domain/visual-library-registry.ts';
import {
  approveVisualAsset,
  importVisualAsset,
  resolveVisualAsset,
  safeSvg,
  stageVisualAssets,
} from '../../src/visual-assets/store.ts';
import { fixture } from '../helpers/fixture.ts';

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect x="0" y="0" width="300" height="300" fill="#45B8D8"/></svg>';
const meta = {
  originalSource: 'Original test geometry',
  metadata: {
    title: 'Test square',
    description: 'Original authored rectangle',
  },
};
test('passive SVG rejects active content, URL references, entities, foreign objects, CSS and malformed nesting', () => {
  assert.deepEqual(safeSvg(Buffer.from(svg)), { width: 300, height: 300 });
  for (const bad of [
    '<script>alert(1)</script>',
    '<foreignObject/>',
    '<image href="https://example.com/x"/>',
    '<use href="#x"/>',
    '<style>*{fill:red}</style>',
    '<rect onload="alert(1)"/>',
    '<rect fill="url(http://bad.invalid)"/>',
    '<g></rect>',
    '&xxe;',
    '<!-- comment -->',
    '<animate attributeName="x"/>',
    '<rect style="fill:red"/>',
  ])
    assert.throws(() =>
      safeSvg(
        Buffer.from(
          svg.replace(
            '<rect x="0" y="0" width="300" height="300" fill="#45B8D8"/>',
            bad,
          ),
        ),
      ),
    );
  assert.throws(() =>
    safeSvg(
      Buffer.from(
        `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>${svg}`,
      ),
    ),
  );
});
test('local import deduplicates content, requires explicit rights review, stages hashed files, detects tampering and rejects paths', async () => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'visual-assets-')));
  try {
    const root = join(dir, 'store'),
      file = join(dir, 'original.svg');
    await writeFile(file, svg);
    const a = await importVisualAsset(file, meta, root),
      b = await importVisualAsset(file, meta, root);
    assert.deepEqual(a, b);
    assert.equal(a.record.status, 'pending');
    await assert.rejects(resolveVisualAsset(a.ref, root), /approved rights/);
    await assert.rejects(
      approveVisualAsset(
        a.ref,
        { reviewer: 'test-reviewer', rationale: 'unit test only' },
        {
          rights: 'unknown',
          licenseEvidence: null,
          attribution: { required: false, text: null },
        },
        root,
      ),
    );
    const approved = await approveVisualAsset(
      a.ref,
      {
        reviewer: 'test-reviewer',
        rationale: 'Original test fixture, test-only assertion',
      },
      {
        rights: 'original',
        licenseEvidence: 'Authored in this test',
        attribution: { required: false, text: null },
      },
      root,
    );
    assert.notEqual(approved.ref.recordSha256, a.ref.recordSha256);
    assert.equal(approved.ref.sha256, a.ref.sha256);
    const f = fixture();
    const s = parseVideoScript({
      ...f,
      schema_version: '1.1.0',
      scenes: [
        {
          ...f.scenes[1],
          visual: {
            type: 'registered-animation',
            component: 'LayeredAssetScene',
            taxonomy_version: '1.0.0',
            props: {
              ...libraryRegistry.LayeredAssetScene.example,
              layers: libraryRegistry.LayeredAssetScene.example.layers.map(
                (l) => ({ ...l, asset: approved.ref }),
              ),
            },
            cues: [],
          },
        },
      ],
    });
    const staged = await stageVisualAssets(s, join(dir, 'staged'), root);
    assert.equal(staged.length, 1);
    assert.equal(
      await readFile(join(dir, 'staged', `${a.record.sha256}.svg`), 'utf8'),
      svg,
    );
    await writeFile(file, svg.replace('300', '301'));
    const changed = await importVisualAsset(file, meta, root);
    assert.notEqual(changed.ref.sha256, a.ref.sha256);
    assert.equal(changed.record.status, 'pending');
    await writeFile(join(root, `${a.record.sha256}.svg`), 'changed');
    await assert.rejects(
      resolveVisualAsset(approved.ref, root),
      /changed bytes/,
    );
    await assert.rejects(
      resolveVisualAsset({ ...approved.ref, assetId: '../../secret' }, root),
    );
    await writeFile(join(dir, 'fake.png'), svg);
    await assert.rejects(
      importVisualAsset(join(dir, 'fake.png'), meta, root),
      /content must match/,
    );
    await symlink(file, join(dir, 'link.svg'));
    await assert.rejects(
      importVisualAsset(join(dir, 'link.svg'), meta, root),
      /Symlinks/,
    );
    await writeFile(
      join(dir, 'huge.svg'),
      svg.replace('width="300"', 'width="9000"'),
    );
    await assert.rejects(importVisualAsset(join(dir, 'huge.svg'), meta, root));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('real PNG/JPEG/WebP decoder verifies bytes, dimensions and corruption without network access', async () => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'visual-raster-')));
  try {
    const { executeMedia } = await import(
      '../../src/renderers/remotion/media-tools.ts'
    );
    const png = join(dir, 'square.png');
    const { deflateSync } = await import('node:zlib');
    const crc = (bytes: Buffer) => {
      let n = 0xffffffff;
      for (const b of bytes) {
        n ^= b;
        for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
      }
      return (n ^ 0xffffffff) >>> 0;
    };
    const chunk = (type: string, data: Buffer) => {
      const body = Buffer.concat([Buffer.from(type), data]),
        out = Buffer.alloc(data.length + 12);
      out.writeUInt32BE(data.length);
      body.copy(out, 4);
      out.writeUInt32BE(crc(body), out.length - 4);
      return out;
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(64);
    header.writeUInt32BE(64, 4);
    header[8] = 8;
    header[9] = 2;
    await writeFile(
      png,
      Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(Buffer.alloc(64 * (64 * 3 + 1)))),
        chunk('IEND', Buffer.alloc(0)),
      ]),
    );
    const a = await importVisualAsset(png, meta, join(dir, 'store'));
    assert.equal(a.record.width, 64);
    assert.equal(a.record.mimeType, 'image/png');
    for (const ext of ['jpg', 'webp']) {
      const path = join(dir, `square.${ext}`);
      if (ext === 'webp')
        await writeFile(
          path,
          Buffer.from(
            'UklGRiIAAABXRUJQVlA4TBUAAAAvP8APAAcQ0f/+B4CE8P+9FtH/1A8A',
            'base64',
          ),
        );
      else
        await executeMedia('ffmpeg', [
          '-v',
          'error',
          '-i',
          png,
          '-frames:v',
          '1',
          path,
        ]);
      if (ext === 'webp' && process.platform !== 'darwin') {
        await assert.rejects(
          importVisualAsset(path, meta, join(dir, 'store')),
          /macOS sips/,
        );
        continue;
      }
      assert.equal(
        (await importVisualAsset(path, meta, join(dir, 'store'))).record.width,
        64,
      );
    }
    const data = await readFile(png);
    await writeFile(join(dir, 'broken.png'), data.subarray(0, 30));
    await assert.rejects(
      importVisualAsset(join(dir, 'broken.png'), meta, join(dir, 'store')),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('missing assets identify the affected scene/stage before browser, narration or encoding starts', async () => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'asset-stage-')));
  try {
    const base = fixture();
    const script = parseVideoScript({
      ...base,
      schema_version: '1.1.0',
      scenes: [
        {
          ...base.scenes[1],
          scene_id: 'missing-image',
          visual: {
            type: 'registered-animation',
            component: 'LayeredAssetScene',
            taxonomy_version: '1.0.0',
            props: libraryRegistry.LayeredAssetScene.example,
            cues: [],
          },
        },
      ],
    });
    const { renderSilentPreview } = await import(
      '../../src/renderers/remotion/render.ts'
    );
    const { renderNarratedPreview } = await import(
      '../../src/media/pipeline.ts'
    );
    await assert.rejects(
      renderSilentPreview(script, {
        outputDir: join(dir, 'silent'),
        browserExecutable: process.execPath,
      }),
      (e: unknown) => {
        assert.ok(e instanceof Error && 'stage' in e && 'scene_id' in e);
        assert.equal(e.stage, 'asset-preflight');
        assert.equal(e.scene_id, 'missing-image');
        return true;
      },
    );
    await assert.rejects(
      renderNarratedPreview(script, {
        outputDir: join(dir, 'narrated'),
        narrationDir: join(dir, 'nonexistent-audio'),
        browserExecutable: process.execPath,
        allowFallback: true,
        strict: false,
      }),
      (e: unknown) => {
        assert.ok(
          e instanceof Error && 'stage' in e && 'sceneId' in e && 'code' in e,
        );
        assert.equal(e.code, 'VISUAL_ASSET_INVALID');
        assert.equal(e.stage, 'asset-preflight');
        assert.equal(e.sceneId, 'missing-image');
        return true;
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
