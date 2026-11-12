import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from 'remotion';
import { resolveBrand } from '../branding/profile.ts';
import type { VideoScript } from '../domain/videoscript.ts';
import { runMedia } from '../media/qc.ts';
import { hash } from '../render-manifest/manifest.ts';
import { executeFile } from '../renderers/remotion/media-tools.ts';
import { VIDEO } from '../renderers/remotion/theme.ts';
import { fileHash } from '../storage/cache.ts';
import type { Snapshot } from './model.ts';

export const fingerprint = (value: unknown) => hash(JSON.stringify(value));
export function evidenceKey(snapshot: Snapshot) {
  return fingerprint({
    sources: snapshot.script.sources,
    claims: snapshot.script.claims,
    research: snapshot.provenance.research,
  });
}
/** Deliberately separates voice from visual tokens, and waveform from pixel timing. */
export function audioKey(
  scene: VideoScript['scenes'][number],
  narrator: unknown,
  implementation: unknown,
) {
  return fingerprint({
    version: 1,
    sceneId: scene.scene_id,
    text: scene.narration,
    narrator,
    implementation,
  });
}
export function sceneKey(
  scene: VideoScript['scenes'][number],
  context: unknown,
  visualBrand: unknown,
  implementation: unknown,
  dimensions: unknown = VIDEO,
) {
  return fingerprint({
    version: 1,
    sceneId: scene.scene_id,
    visual: scene.visual,
    ...('transition' in scene && scene.transition
      ? { transition: scene.transition }
      : {}),
    context,
    visualBrand,
    implementation,
    dimensions,
  });
}
export function visualBrand(script: VideoScript) {
  const { narration: _narration, ...visual } = resolveBrand(
    'brand' in script ? script.brand : undefined,
  );
  return visual;
}
export function narratorConfig(config: NonNullable<Snapshot['config']>) {
  return {
    provider: config.provider,
    settings: config.settings,
    limits: config.limits,
    ...(config.provider === 'kokoro-onnx'
      ? {
          modelId: config.modelId,
          modelSha256: config.modelSha256,
          voicesId: config.voicesId,
          voicesSha256: config.voicesSha256,
          pythonExecutable: config.pythonExecutable,
        }
      : {}),
  };
}
export async function implementationIdentity(
  browser: string,
  adapterId?: string,
) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const tree = async (directories: string[]) => {
    const files: { file: string; sha256: string }[] = [];
    const walk = async (path: string) => {
      const info = await readdir(join(root, path), { withFileTypes: true });
      for (const item of info.sort((a, b) => a.name.localeCompare(b.name))) {
        const relative = `${path}/${item.name}`;
        if (item.isDirectory()) await walk(relative);
        else if (item.isFile())
          files.push({
            file: relative,
            sha256: await fileHash(join(root, relative)),
          });
      }
    };
    for (const dir of [
      ...directories,
      ...(import.meta.url.includes('/dist/')
        ? directories.map((dir) => dir.replace(/^src\//, 'dist/'))
        : []),
    ])
      await walk(dir);
    return fingerprint(files);
  };
  const lock = hash(await readFile(join(root, 'package-lock.json')));
  const ffmpeg = (await runMedia('ffmpeg', ['-version'])).stdout.split('\n')[0];
  const ffprobe = (await runMedia('ffprobe', ['-version'])).stdout.split(
    '\n',
  )[0];
  const runtime = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    lock,
    ffmpeg,
    ffprobe,
  };
  // UI/font package changes must not request new speech. Native tool versions and
  // the separately pinned Python environment identify audio dependencies.
  const { lock: _packageLock, ...audioRuntime } = runtime;
  const validationPackage: { version: string } = JSON.parse(
    await readFile(
      fileURLToPath(import.meta.resolve('zod/package.json')),
      'utf8',
    ),
  );
  const font = fileURLToPath(
    import.meta.resolve(
      '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
    ),
  );
  return {
    audio: {
      ...audioRuntime,
      zod: validationPackage.version,
      code: await tree(['src/audio', 'src/config']),
      requirements: hash(await readFile(join(root, 'requirements-audio.lock'))),
    },
    visuals: {
      ...runtime,
      remotion: VERSION,
      code: await tree([
        'src/renderers',
        'src/visuals',
        'src/timing',
        'src/domain',
        'src/visual-assets',
      ]),
      fontSha256: await fileHash(font),
      browser:
        adapterId ??
        (
          await executeFile(browser, ['--version'], {
            timeout: 15000,
            maxBuffer: 65536,
          })
        ).stdout.trim(),
      adapter: adapterId ?? 'remotion',
    },
    assembly: {
      ...runtime,
      code: await tree([
        'src/media',
        'src/render-manifest',
        'src/workflow',
        'src/storage',
      ]),
    },
  };
}
