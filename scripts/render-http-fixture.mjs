import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputParent = join(root, 'output');
await mkdir(outputParent, { recursive: true });
const runDir = await mkdtemp(join(outputParent, 'http-full-'));
const narrationDir = join(runDir, 'narration');
const renderDir = join(runDir, 'render');
const config = join(root, 'narration.config.example.json');
const script = join(root, 'examples/http-server.videoscript.json');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const info = {
  schemaVersion: '1.0.0',
  status: 'running',
  createdAt: new Date().toISOString(),
  runDir,
  narrationDir,
  renderDir,
  configFile: config,
  configSha256: sha256(await readFile(config)),
  scriptFile: script,
  scriptSha256: sha256(await readFile(script)),
  runnerSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
  captionPolicy: 'scene-speech-span-v1; requires human timing review',
  approvedForRelease: false,
  commands: [],
};
const save = () =>
  writeFile(
    join(runDir, 'full-run.json'),
    `${JSON.stringify(info, null, 2)}\n`,
  );

async function run(stage, args) {
  const command = {
    stage,
    executable: process.execPath,
    args,
    status: 'running',
  };
  info.commands.push(command);
  await save();
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      shell: false,
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin' },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      command.exitCode = code;
      command.status = code === 0 ? 'complete' : 'failed';
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${stage} failed (${signal ?? code}); artifacts remain in ${runDir}`,
          ),
        );
    });
  });
  await save();
}

console.log(`Full HTTP render directory: ${runDir}`);
try {
  await run('kokoro', [
    'src/cli/index.ts',
    'audio',
    'narrate',
    '--config',
    config,
    '--script',
    script,
    '--output',
    narrationDir,
    '--allow-local-synthesis',
  ]);
  await run('remotion-ffmpeg-qc', [
    'src/cli/index.ts',
    'render',
    '--script',
    script,
    '--narration',
    narrationDir,
    '--output',
    renderDir,
    '--allow-caption-fallback',
  ]);
  if (sha256(await readFile(config)) !== info.configSha256)
    throw new Error(
      'Default voice config changed during rendering; review full-run.json and scene metadata',
    );
  info.status = 'complete';
  await save();
  console.log(
    JSON.stringify(
      {
        video: join(renderDir, 'video.mp4'),
        srt: join(renderDir, 'captions.srt'),
        sceneAudio: narrationDir,
        frames: join(renderDir, 'visuals'),
        requiresTimingReview: true,
      },
      null,
      2,
    ),
  );
} catch (error) {
  info.status = 'failed';
  info.error =
    error instanceof Error ? error.message : 'Local full render failed';
  await save();
  console.error(info.error);
  process.exitCode = 1;
}
