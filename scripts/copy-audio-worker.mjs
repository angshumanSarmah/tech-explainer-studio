import { copyFile, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/audio/', import.meta.url), { recursive: true });
await copyFile(
  new URL('../src/audio/kokoro-worker.py', import.meta.url),
  new URL('../dist/audio/kokoro-worker.py', import.meta.url),
);
