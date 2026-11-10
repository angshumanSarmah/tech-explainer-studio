import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, renameSync } from 'node:fs';
import {
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  rename,
  rm,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { hash } from '../render-manifest/manifest.ts';
import { type FileGroup, fail, GroupSchema } from '../workflow/model.ts';
import type { Lease, Repository } from './repository.ts';

export async function fileHash(path: string) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
export class AssetCache {
  readonly root: string;
  readonly repo: Repository;
  constructor(root: string, repo: Repository) {
    this.root = resolve(root);
    this.repo = repo;
  }
  blob(sha: string) {
    if (!/^[a-f0-9]{64}$/.test(sha))
      fail('HASH_INVALID', 'Invalid content address');
    return join(this.root, 'sha256', sha.slice(0, 2), sha);
  }
  async putFile(source: string, file: string) {
    const info = await lstat(source);
    if (!info.isFile() || info.size <= 0 || info.size > 1073741824)
      fail(
        'ASSET_INVALID',
        'Asset must be a nonempty regular file of at most 1 GiB',
      );
    const tempDir = join(this.root, 'tmp');
    await mkdir(tempDir, { recursive: true });
    const temp = join(tempDir, randomUUID());
    try {
      await copyFile(source, temp);
      const sha256 = await fileHash(temp);
      const bytes = (await lstat(temp)).size;
      const entry = GroupSchema.parse([{ file, sha256, bytes }])[0];
      if (!entry) fail('ASSET_INVALID', 'Missing asset');
      const handle = await open(temp, 'r');
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
      const target = this.blob(sha256);
      await mkdir(dirname(target), { recursive: true });
      await rename(temp, target);
      const folder = await open(dirname(target), 'r');
      try {
        await folder.sync();
      } finally {
        await folder.close();
      }
      // Orphan blobs after interruption are harmless; only fenced steps publish cache mappings.
      this.repo.db
        .prepare('INSERT OR IGNORE INTO assets VALUES(?,?,?)')
        .run(sha256, bytes, target);
      return entry;
    } finally {
      await rm(temp, { force: true });
    }
  }
  async capture(dir: string): Promise<FileGroup> {
    const files: FileGroup = [];
    const walk = async (relative: string) => {
      for (const entry of (
        await readdir(join(dir, relative), { withFileTypes: true })
      ).sort((a, b) => a.name.localeCompare(b.name))) {
        const path = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile())
          files.push(await this.putFile(join(dir, path), path));
        else
          fail(
            'ASSET_INVALID',
            'Symlinks and special files cannot enter the artifact cache',
          );
      }
    };
    await walk('');
    return GroupSchema.parse(files);
  }
  async verify(files: FileGroup, dir?: string) {
    try {
      for (const entry of GroupSchema.parse(files)) {
        const path = dir ? join(dir, entry.file) : this.blob(entry.sha256);
        const info = await lstat(path);
        if (
          !info.isFile() ||
          info.size !== entry.bytes ||
          (await fileHash(path)) !== entry.sha256
        )
          return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  async lookup(key: string) {
    const files = this.repo.cache(key);
    return files && (await this.verify(files)) ? files : null;
  }
  async hydrate(files: FileGroup, target: string, fence?: () => void) {
    if (!(await this.verify(files)))
      fail(
        'CACHE_CORRUPT',
        'Cached asset is missing or changed; resume will rebuild its producing step',
      );
    await mkdir(dirname(target), { recursive: true });
    const staging = join(dirname(target), `.stage-${randomUUID()}`);
    await mkdir(staging);
    try {
      for (const file of files) {
        const output = join(staging, file.file);
        await mkdir(dirname(output), { recursive: true });
        await copyFile(this.blob(file.sha256), output);
        const handle = await open(output, 'r');
        try {
          await handle.sync();
        } finally {
          await handle.close();
        }
      }
      if (!(await this.verify(files, staging)))
        fail('CACHE_CORRUPT', 'Asset changed during export');
      const directory = await open(staging, 'r');
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
      // Guard and rename execute in one synchronous SQLite write transaction.
      this.repo.transaction(() => {
        fence?.();
        renameSync(staging, target);
      });
      const parent = await open(dirname(target), 'r');
      try {
        await parent.sync();
      } finally {
        await parent.close();
      }
    } finally {
      await rm(staging, { force: true, recursive: true });
    }
  }
  async publish(
    id: string,
    key: string,
    files: FileGroup,
    target: string,
    leases: Lease[],
  ) {
    try {
      await lstat(target);
      if (!(await this.verify(files, target)))
        fail(
          'EXPORT_CHANGED',
          'Existing job export changed; move it aside before resuming, or inspect the preserved files',
        );
    } catch (error) {
      if (
        !(
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'ENOENT'
        )
      )
        throw error;
      await this.hydrate(files, target, () => this.repo.guard(id, leases));
    }
    this.repo.saveRender(id, key, target, files, leases);
    return {
      outputDir: target,
      inputHash: key,
      outputHash: hash(JSON.stringify(files)),
    };
  }
}
