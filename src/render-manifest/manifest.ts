import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { LimitsSchema, SettingsSchema } from '../config/narration.ts';
export const hash = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const NarrationArtifactSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0.0'),
    provider: z.enum(['mock', 'kokoro-onnx']),
    isMock: z.boolean(),
    sceneId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/),
    wavPath: z.string(),
    metadataPath: z.string(),
    sha256: sha,
    bytes: z.int().positive(),
    durationSeconds: z.number().positive(),
    measurement: z.literal('ffprobe'),
    sampleRate: z.literal(24000),
    samples: z.int().positive(),
    originalTextSha256: sha,
    spokenTextSha256: sha,
    settings: SettingsSchema,
    identity: z.record(z.string(), z.string().nullable()),
    limits: LimitsSchema,
  })
  .refine(
    (a) => a.isMock === (a.provider === 'mock'),
    'Provider/mock identity mismatch',
  );

export async function sourceInventory() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files: { file: string; sha256: string }[] = [];
  async function walk(dir: string) {
    for (const entry of (
      await readdir(join(root, dir), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile())
        files.push({
          file: path,
          sha256: hash(await readFile(join(root, path))),
        });
    }
  }
  // Hash executed source/compiled JS and all authored source, including the Python bridge.
  await walk('src');
  if (import.meta.url.includes('/dist/')) await walk('dist');
  for (const file of [
    'package.json',
    'package-lock.json',
    'requirements-audio.lock',
  ])
    files.push({ file, sha256: hash(await readFile(join(root, file))) });
  return { files, sha256: hash(JSON.stringify(files)) };
}
