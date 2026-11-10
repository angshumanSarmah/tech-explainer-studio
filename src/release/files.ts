import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, realpath } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import type { z } from 'zod';
import { block, FileBinding, type ReleaseManifest } from './model.ts';

export async function bindFile(
  role: string,
  path: string,
): Promise<z.infer<typeof FileBinding>> {
  const absolute = resolve(path);
  const info = await lstat(absolute);
  // Reject symlink ancestors as well as symlink files.
  if (
    !info.isFile() ||
    (await realpath(absolute)) !== absolute ||
    info.size < 1 ||
    info.size > 1073741824
  )
    block(
      'RELEASE_FILE_INVALID',
      'Release inputs must be nonempty regular files without symlinks, at most 1 GiB',
    );
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(absolute)) {
    bytes += chunk.length;
    if (bytes > 1073741824)
      block('RELEASE_FILE_LIMIT', 'Release file grew beyond 1 GiB');
    hash.update(chunk);
  }
  if (bytes !== info.size)
    block('RELEASE_FILE_CHANGED', 'File changed during inspection');
  return FileBinding.parse({
    role,
    path: absolute,
    sha256: hash.digest('hex'),
    bytes,
  });
}
export async function renderFiles(dir: string) {
  const root = resolve(dir);
  const files: z.infer<typeof FileBinding>[] = [];
  let bytes = 0;
  async function walk(path: string) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) await walk(full);
      else {
        if (!entry.isFile())
          block(
            'RELEASE_FILE_INVALID',
            'Special/symlink files cannot enter a release',
          );
        const item = await bindFile(
          `render:${full
            .slice(root.length + 1)
            .split(sep)
            .join('/')}`,
          full,
        );
        bytes += item.bytes;
        if (files.length >= 1400 || bytes > 4294967296)
          block(
            'RELEASE_FILE_LIMIT',
            'Release render exceeds 1400 files or 4 GiB',
          );
        files.push(item);
      }
    }
  }
  await walk(root);
  return files;
}
export async function verifyFiles(manifest: ReleaseManifest) {
  const current = await renderFiles(manifest.renderDir);
  const expected = manifest.files.filter((f) => f.role.startsWith('render:'));
  if (JSON.stringify(current) !== JSON.stringify(expected))
    block('STALE_RELEASE', 'Render inventory changed; prepare a new candidate');
  for (const file of manifest.files.filter(
    (f) => !f.role.startsWith('render:'),
  )) {
    const actual = await bindFile(file.role, file.path);
    if (actual.sha256 !== file.sha256 || actual.bytes !== file.bytes)
      block(
        'STALE_RELEASE',
        `Changed input: ${file.role}; prepare a new candidate`,
      );
  }
}
