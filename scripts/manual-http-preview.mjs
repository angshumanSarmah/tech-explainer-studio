import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { file: { type: 'string' } } });
const input = resolve(
  values.file ?? join(root, 'examples/http-server.videoscript.json'),
);
async function invoke(args) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, ['src/cli/index.ts', ...args], {
      cwd: root,
      shell: false,
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin' },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', (code) => accept(code ?? 1));
  });
}
async function main() {
  // Validate the supplied file before creating output or running narration/rendering.
  const validation = await invoke(['director', 'validate', '--file', input]);
  if (validation !== 0) {
    process.exitCode = validation;
    return;
  }
  await mkdir(join(root, 'output', 'phase06'), { recursive: true });
  const out = await mkdtemp(join(root, 'output', 'phase06', 'manual-http-'));
  const runs = [];
  async function run(args) {
    runs.push({ executable: process.execPath, args });
    const code = await invoke(args);
    if (code !== 0)
      throw new Error(
        `Local preview stage failed with exit ${code}; inspect ${out}`,
      );
  }
  console.log(`Manual preview output: ${out}`);
  try {
    await run(['director', 'export', '--output', join(out, 'contract')]);
    await run([
      'director',
      'import',
      '--file',
      input,
      '--output',
      join(out, 'draft'),
    ]);
    const script = join(out, 'draft', 'videoscript.json');
    await run(['director', 'validate', '--file', script]);
    await run([
      'audio',
      'narrate',
      '--config',
      join(root, 'narration.config.example.json'),
      '--script',
      script,
      '--output',
      join(out, 'narration'),
      '--allow-local-synthesis',
    ]);
    await run([
      'render',
      '--script',
      script,
      '--narration',
      join(out, 'narration'),
      '--output',
      join(out, 'render'),
      '--allow-caption-fallback',
    ]);
    const manifest = JSON.parse(
      await readFile(join(out, 'render', 'render-manifest.json'), 'utf8'),
    );
    await writeFile(
      join(out, 'manual-run.json'),
      JSON.stringify(
        {
          status: 'complete',
          input,
          runs,
          brand: manifest.brand,
          requiresHumanReview: true,
          requiresTimingReview: manifest.requiresTimingReview,
          approvedForRelease: false,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        {
          video: join(out, 'render', 'video.mp4'),
          captions: join(out, 'render', 'captions.srt'),
          narration: join(out, 'narration'),
          draft: join(out, 'draft', 'draft.json'),
          contract: join(out, 'contract'),
          requiresHumanReview: true,
          approvedForRelease: false,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await writeFile(
      join(out, 'manual-run.json'),
      JSON.stringify(
        { status: 'failed', runs, approvedForRelease: false },
        null,
        2,
      ),
    );
    console.error(
      error instanceof Error
        ? error.message
        : `Local preview failed; inspect ${out}`,
    );
    process.exitCode = 1;
  }
}
await main();
