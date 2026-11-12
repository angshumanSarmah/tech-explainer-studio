import { constants } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  open,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { z } from 'zod';
import { AssetRefSchema } from '../domain/library.ts';
import type { VideoScript } from '../domain/videoscript.ts';
import { hash } from '../render-manifest/manifest.ts';
import { executeFile, mediaBinary } from '../renderers/remotion/media-tools.ts';

const executeMedia = (type: 'ffmpeg' | 'ffprobe', args: string[]) => {
  const binary = mediaBinary(type);
  return executeFile(binary, args, {
    timeout: 15000,
    maxBuffer: 65536,
    env: { ...process.env, DYLD_LIBRARY_PATH: dirname(binary) },
  });
};

import {
  type VisualAsset,
  VisualAssetError,
  VisualAssetSchema,
} from './model.ts';
export const DEFAULT_ASSET_ROOT = 'data/visual-assets';
function fail(s: string): never {
  throw new VisualAssetError(s);
}
async function localBytes(path: string, max = 8 * 1024 * 1024) {
  const full = resolve(path);
  if ((await realpath(full)) !== full)
    fail('Symlinks are not accepted in asset paths');
  const f = await open(full, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const s = await f.stat();
    if (!s.isFile() || s.size < 1 || s.size > max)
      fail('Use a nonempty regular local file within the size limit');
    const bytes = await f.readFile();
    if (bytes.length !== s.size || bytes.length > max)
      fail('Asset changed or exceeded byte limit');
    return bytes;
  } finally {
    await f.close();
  }
}
/** Tiny passive SVG dialect. Rejects all entities, CSS, scripts, URLs, images, text/fonts and unknown syntax. */
export function safeSvg(bytes: Buffer) {
  const text = bytes.toString('utf8');
  if (
    text.includes('\ufffd') ||
    text.length > 1_000_000 ||
    /[&]|<!|<\?/.test(text) ||
    [...text].some((c) => c.charCodeAt(0) < 9)
  )
    fail(
      'SVG entities, declarations and processing instructions are forbidden',
    );
  const tags = new Set([
    'svg',
    'g',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polygon',
    'polyline',
  ]);
  const attrs = new Set([
    'xmlns',
    'width',
    'height',
    'viewBox',
    'fill',
    'stroke',
    'stroke-width',
    'opacity',
    'fill-opacity',
    'stroke-opacity',
    'x',
    'y',
    'x1',
    'y1',
    'x2',
    'y2',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'd',
    'points',
    'transform',
    'stroke-linecap',
    'stroke-linejoin',
    'fill-rule',
  ]);
  const stack: string[] = [];
  let root = false;
  let width = 0,
    height = 0;
  let cursor = 0;
  let tagCount = 0;
  for (const match of text.matchAll(/<([^>]+)>/g)) {
    if (++tagCount > 256) fail('SVG exceeds the 256-element geometry limit');
    if (text.slice(cursor, match.index).trim())
      fail('Only passive SVG geometry is accepted');
    cursor = (match.index ?? 0) + match[0].length;
    const raw = match[1] ?? '';
    const closing = raw.startsWith('/'),
      self = raw.endsWith('/');
    const body = raw.replace(/^\/|\/$/g, '').trim();
    const name = /^[A-Za-z][A-Za-z0-9-]*/.exec(body)?.[0] ?? '';
    if (!tags.has(name)) fail('Unsupported or active SVG element');
    if (closing) {
      if (body !== name || stack.pop() !== name) fail('Malformed SVG nesting');
      continue;
    }
    if (!root) {
      if (name !== 'svg') fail('SVG root required');
      root = true;
    } else if (!stack.length || name === 'svg') fail('One SVG root required');
    let rest = body.slice(name.length);
    const used = new Set<string>();
    let count = 0;
    while (rest.trim()) {
      const a = /^\s+([A-Za-z][A-Za-z0-9-]*)\s*=\s*"([^"]*)"/.exec(rest);
      if (!a) fail('SVG attributes require double quotes');
      const key = a[1] ?? '',
        v = a[2] ?? '';
      if (!attrs.has(key) || used.has(key))
        fail('Unknown or duplicate SVG attribute');
      used.add(key);
      count++;
      if (count > 30 || v.length > 8000) fail('SVG geometry limit');
      if (key === 'xmlns') {
        if (name !== 'svg' || v !== 'http://www.w3.org/2000/svg')
          fail('Invalid SVG namespace');
      } else if (['fill', 'stroke'].includes(key)) {
        if (!/^(?:none|#[a-fA-F0-9]{3,8})$/.test(v))
          fail('SVG paint must be literal color or none');
      } else if (
        ['stroke-linecap', 'stroke-linejoin', 'fill-rule'].includes(key)
      ) {
        if (!/^(?:round|butt|square|miter|bevel|nonzero|evenodd)$/.test(v))
          fail('Invalid geometry attribute');
      } else if (key === 'd') {
        if (!/^[MmZzLlHhVvCcSsQqTtAa0-9., +eE-]+$/.test(v))
          fail('Invalid path');
      } else if (key === 'transform') {
        if (
          !/^(?:(?:translate|scale|rotate|matrix)\([0-9., +eE-]+\)\s*)+$/.test(
            v,
          )
        )
          fail('Invalid SVG transform');
      } else if (!/^[0-9., +eE-]+$/.test(v))
        fail('Only numeric SVG geometry is accepted');
      if (
        ![
          'xmlns',
          'fill',
          'stroke',
          'stroke-linecap',
          'stroke-linejoin',
          'fill-rule',
          'd',
          'transform',
        ].includes(key) &&
        v
          .split(/[ ,]+/)
          .filter(Boolean)
          .some(
            (n) => !Number.isFinite(Number(n)) || Math.abs(Number(n)) > 10000,
          )
      )
        fail('SVG numeric geometry exceeds bounds');
      if (name === 'svg' && key === 'width') width = Number(v);
      if (name === 'svg' && key === 'height') height = Number(v);
      rest = rest.slice(a[0].length);
    }
    if (!self) stack.push(name);
  }
  if (
    stack.length ||
    !root ||
    text.slice(cursor).trim() ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  )
    fail('SVG needs a closed root and integer width/height');
  return { width, height };
}
export async function inspectImage(bytes: Buffer, extension: string) {
  if (extension === 'svg')
    return {
      ...safeSvg(bytes),
      mimeType: 'image/svg+xml' as const,
      extension: 'svg' as const,
    };
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';
  if (
    (png && bytes.includes(Buffer.from('acTL'))) ||
    (webp && bytes.includes(Buffer.from('ANIM')))
  )
    fail('Animated images require a separately vetted adapter');
  const expected =
    extension === 'png' && png
      ? 'png'
      : (extension === 'jpg' || extension === 'jpeg') && jpeg
        ? 'mjpeg'
        : extension === 'webp' && webp
          ? 'webp'
          : null;
  if (!expected)
    fail('Extension and decoded image content must match PNG/JPEG/WebP/SVG');
  await mkdir('output', { recursive: true });
  const dir = await mkdtemp(join(resolve('output'), '.asset-decode-'));
  try {
    const path = join(dir, `input.${extension}`);
    await writeFile(path, bytes);
    let decodePath = path;
    // The pinned small FFmpeg omits WebP decoding. macOS supplies a bounded native adapter.
    if (webp) {
      if (process.platform !== 'darwin')
        fail(
          'WebP requires the vetted macOS sips adapter in this build; convert locally to PNG on other systems',
        );
      // Check the container dimensions before invoking the native decoder.
      const dimensions = await executeFile(
        '/usr/bin/sips',
        ['-g', 'pixelWidth', '-g', 'pixelHeight', path],
        { timeout: 15000, maxBuffer: 65536 },
      );
      const width = Number(/pixelWidth: (\d+)/.exec(dimensions.stdout)?.[1]),
        height = Number(/pixelHeight: (\d+)/.exec(dimensions.stdout)?.[1]);
      if (
        !width ||
        !height ||
        width > 4096 ||
        height > 4096 ||
        width * height > 12_000_000
      )
        fail('WebP exceeds native decode dimension limits');
      decodePath = join(dir, 'webp-decoded.png');
      await executeFile(
        '/usr/bin/sips',
        ['-s', 'format', 'png', path, '--out', decodePath],
        { timeout: 15000, maxBuffer: 65536 },
      );
    }
    const { stdout } = await executeMedia('ffprobe', [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-show_streams',
      '-of',
      'json',
      decodePath,
    ]);
    const result = z
      .object({
        streams: z
          .array(
            z.object({
              codec_name: z.string(),
              width: z.int(),
              height: z.int(),
            }),
          )
          .length(1),
      })
      .parse(JSON.parse(stdout));
    const s = result.streams[0];
    if (!s || s.codec_name !== (webp ? 'png' : expected))
      fail('Decoded image codec mismatch');
    if (
      s.width < 16 ||
      s.height < 16 ||
      s.width > 4096 ||
      s.height > 4096 ||
      s.width * s.height > 12_000_000
    )
      fail('Image dimension limit: 16..4096, at most 12 MP');
    // Decode every pixel, reject corrupt/truncated payloads; no shell or network protocols.
    await executeMedia('ffmpeg', [
      '-v',
      'error',
      '-xerror',
      '-protocol_whitelist',
      'file,pipe',
      '-i',
      decodePath,
      '-frames:v',
      '1',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      join(dir, 'decoded.png'),
    ]);
    return {
      width: s.width,
      height: s.height,
      mimeType: png
        ? ('image/png' as const)
        : jpeg
          ? ('image/jpeg' as const)
          : ('image/webp' as const),
      extension: png
        ? ('png' as const)
        : jpeg
          ? ('jpg' as const)
          : ('webp' as const),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
async function safeRoot(root: string) {
  const r = resolve(root);
  await mkdir(r, { recursive: true });
  if ((await realpath(r)) !== r)
    fail('Asset store cannot contain symlink ancestors');
  return r;
}
async function immutable(path: string, bytes: Buffer | string) {
  try {
    await writeFile(path, bytes, { flag: 'wx' });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    if (!Buffer.from(await localBytes(path)).equals(Buffer.from(bytes)))
      fail('Immutable asset address has conflicting content');
  }
}
export async function importVisualAsset(
  file: string,
  metadata: Pick<VisualAsset, 'originalSource' | 'metadata'>,
  root = DEFAULT_ASSET_ROOT,
) {
  const bytes = await localBytes(file);
  const extension = extname(file).slice(1).toLowerCase();
  await mkdir('output', { recursive: true });
  const decoded = await inspectImage(bytes, extension);
  const sha256 = hash(bytes);
  const record = VisualAssetSchema.parse({
    schemaVersion: '1.0.0',
    assetId: `asset-${sha256.slice(0, 24)}`,
    sha256,
    ...decoded,
    bytes: bytes.length,
    originalSha256: sha256,
    ...metadata,
    rights: 'unknown',
    licenseEvidence: null,
    attribution: { required: false, text: null },
    status: 'pending',
    review: null,
  });
  const r = await safeRoot(root);
  await immutable(join(r, `${sha256}.${decoded.extension}`), bytes);
  return saveRecord(record, r);
}
export async function saveRecord(input: unknown, root = DEFAULT_ASSET_ROOT) {
  const record = VisualAssetSchema.parse(input);
  const r = await safeRoot(root),
    text = JSON.stringify(record),
    recordSha256 = hash(text);
  await immutable(join(r, `${recordSha256}.json`), text);
  return {
    record,
    ref: { assetId: record.assetId, sha256: record.sha256, recordSha256 },
  };
}
export async function approveVisualAsset(
  ref: unknown,
  review: { reviewer: string; rationale: string },
  rights: Pick<VisualAsset, 'rights' | 'licenseEvidence' | 'attribution'>,
  root = DEFAULT_ASSET_ROOT,
) {
  const { record } = await resolveVisualAsset(ref, root, false);
  return saveRecord(
    {
      ...record,
      ...rights,
      status: 'approved',
      review: {
        ...review,
        reviewedAt: new Date().toISOString(),
        fileSha256: record.sha256,
      },
    },
    root,
  );
}
export async function resolveVisualAsset(
  input: unknown,
  root = DEFAULT_ASSET_ROOT,
  requireApproval = true,
) {
  const ref = AssetRefSchema.parse(input),
    r = resolve(root);
  const record = VisualAssetSchema.parse(
    JSON.parse(
      (await localBytes(join(r, `${ref.recordSha256}.json`), 16384)).toString(),
    ),
  );
  if (
    hash(JSON.stringify(record)) !== ref.recordSha256 ||
    ref.assetId !== record.assetId ||
    ref.sha256 !== record.sha256
  )
    fail(`Asset ${ref.assetId}: record/hash changed; import and review again`);
  if (requireApproval && record.status !== 'approved')
    fail(`Asset ${ref.assetId}: approved rights review required`);
  const file = join(r, `${ref.sha256}.${record.extension}`),
    bytes = await localBytes(file);
  if (bytes.length !== record.bytes || hash(bytes) !== record.sha256)
    fail(`Asset ${ref.assetId}: missing or changed bytes`);
  const decoded = await inspectImage(bytes, record.extension);
  if (
    decoded.width !== record.width ||
    decoded.height !== record.height ||
    decoded.mimeType !== record.mimeType
  )
    fail(
      `Asset ${ref.assetId}: decoded dimensions/type no longer match record`,
    );
  return { record, ref, file, bytes };
}
export function scriptAssetRefs(script: VideoScript) {
  return script.scenes.flatMap((s) =>
    s.visual.type === 'composed'
      ? s.visual.props.entities.flatMap((e) =>
          e.kind === 'node' && e.asset ? [e.asset] : [],
        )
      : s.visual.type === 'registered-animation' &&
          s.visual.component === 'LayeredAssetScene'
        ? s.visual.props.layers.map((l) => l.asset)
        : [],
  );
}
export async function preflightVisualAssets(
  script: VideoScript,
  root = DEFAULT_ASSET_ROOT,
) {
  const refs = scriptAssetRefs(script),
    unique = new Map(refs.map((r) => [r.recordSha256, r]));
  return Promise.all(
    [...unique.values()].map(async (r) => {
      try {
        return await resolveVisualAsset(r, root);
      } catch (error) {
        const scene = script.scenes.find(
          (s) =>
            (s.visual.type === 'composed' &&
              s.visual.props.entities.some(
                (e) =>
                  e.kind === 'node' && e.asset?.recordSha256 === r.recordSha256,
              )) ||
            (s.visual.type === 'registered-animation' &&
              s.visual.component === 'LayeredAssetScene' &&
              s.visual.props.layers.some(
                (l) => l.asset.recordSha256 === r.recordSha256,
              )),
        );
        throw new VisualAssetError(
          `Asset ${r.assetId}: ${error instanceof VisualAssetError ? error.message : 'Missing, malformed or unsafe local asset; import and review it again'}`,
          scene?.scene_id ?? null,
        );
      }
    }),
  );
}
export async function stageVisualAssets(
  script: VideoScript,
  dir: string,
  root = DEFAULT_ASSET_ROOT,
) {
  const assets = await preflightVisualAssets(script, root);
  await mkdir(dir, { recursive: true });
  for (const a of assets) {
    await immutable(
      join(dir, `${a.record.sha256}.${a.record.extension}`),
      a.bytes,
    );
    await immutable(
      join(dir, `${a.ref.recordSha256}.json`),
      JSON.stringify(a.record),
    );
  }
  return assets.map((a) => ({
    ref: a.ref,
    record: a.record,
    file: `visual-assets/${a.record.sha256}.${a.record.extension}`,
  }));
}
