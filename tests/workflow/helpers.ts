import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { createNarrationProvider } from '../../src/audio/provider.ts';
import { brandIdentity } from '../../src/branding/identity.ts';
import { NarrationConfigSchema } from '../../src/config/narration.ts';
import type { VideoScript } from '../../src/domain/videoscript.ts';
import { runMedia } from '../../src/media/qc.ts';
import type { RenderOptions } from '../../src/renderers/remotion/render.ts';
import { SnapshotSchema } from '../../src/workflow/model.ts';
import { fixture } from '../helpers/fixture.ts';

export const mockConfig = NarrationConfigSchema.parse(
  JSON.parse(await readFile('narration.mock.example.json', 'utf8')),
);
export function shortScript() {
  const script = fixture();
  script.scenes = script.scenes.slice(0, 2);
  for (const scene of script.scenes)
    scene.timing = { min_seconds: 0.5, preferred_seconds: 1, max_seconds: 2 };
  return script;
}
export function snapshot() {
  return SnapshotSchema.parse({
    version: 1,
    requiresEvidenceReview: false,
    script: shortScript(),
    provenance: {
      origin: 'manual_import',
      brand: brandIdentity(),
      research: null,
      draftSha256: null,
      draftReview: null,
      usage: null,
    },
    config: mockConfig,
    savedAudio: {},
    alignment: null,
    allowFallback: true,
    strict: false,
  });
}
export async function inputs(root: string) {
  const script = shortScript();
  const path = join(root, 'input.json');
  await writeFile(path, JSON.stringify(script));
  const provider = createNarrationProvider(mockConfig);
  const narration = join(root, 'audio');
  for (const scene of script.scenes)
    await provider.synthesize({
      sceneId: scene.scene_id,
      text: scene.narration,
      outputDir: narration,
    });
  return { script, path, narration };
}
export async function renderTestScene(
  _script: VideoScript,
  options: RenderOptions,
) {
  await mkdir(options.outputDir);
  const range = options.frameRange;
  if (!range) throw new Error('Test adapter requires explicit scene range');
  const chunk = (type: string, data: Buffer) => {
    const name = Buffer.from(type);
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length, 0);
    name.copy(result, 4);
    data.copy(result, 8);
    result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1080, 0);
  header.writeUInt32BE(1920, 4);
  header[8] = 8;
  header[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels(range[0]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  const path = join(options.outputDir, 'frame.png');
  await writeFile(path, png);
  await runMedia('ffmpeg', [
    '-v',
    'error',
    '-nostdin',
    '-n',
    '-loop',
    '1',
    '-framerate',
    '30',
    '-i',
    path,
    '-frames:v',
    String(range[1] - range[0] + 1),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    join(options.outputDir, 'video.mp4'),
  ]);
  await writeFile(
    join(options.outputDir, 'render-manifest.json'),
    JSON.stringify({
      kind: 'test-only-black-frames',
      approvedForRelease: false,
    }),
  );
  return {
    outputDir: options.outputDir,
    manifest: { kind: 'test-only-black-frames' },
  };
}

function pixels(startFrame: number) {
  const stride = 1080 * 3 + 1;
  const data = Buffer.alloc(stride * 1920, startFrame ? 96 : 0);
  for (let row = 0; row < 1920; row++) data[row * stride] = 0;
  return data;
}
