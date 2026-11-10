import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { runCli } from '../../src/cli/run.ts';
import { loadNarrationConfig } from '../../src/config/narration.ts';

const folder = await mkdtemp(join(tmpdir(), 'studio-audio-cli-'));
after(() => rm(folder, { recursive: true, force: true }));
const mockPath = 'narration.mock.example.json';
const scriptPath = 'examples/http-server.videoscript.json';

async function invoke(args: string[]) {
  let stdout = '';
  let stderr = '';
  const exit = await runCli(['audio', ...args], {
    stdout: (value) => {
      stdout += value;
    },
    stderr: (value) => {
      stderr += value;
    },
  });
  return { exit, stdout, stderr };
}

test('audio CLI health and all-scene mock narration preserve real measured per-scene artifacts', async () => {
  const health = await invoke(['doctor', '--config', mockPath]);
  assert.equal(health.exit, 0);
  assert.equal(JSON.parse(health.stdout).ready, true);
  const output = join(folder, 'all-scenes');
  const args = [
    'narrate',
    '--config',
    mockPath,
    '--script',
    scriptPath,
    '--output',
    output,
  ];
  const result = await invoke(args);
  assert.equal(result.exit, 0);
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).scenes, 6);
  const manifest = JSON.parse(
    await readFile(join(output, 'narration-manifest.json'), 'utf8'),
  );
  assert.equal(manifest.isMock, true);
  assert.equal(manifest.approvedForRelease, false);
  for (const artifact of manifest.artifacts) {
    assert.equal(artifact.durationSeconds, 1);
    assert.equal(artifact.measurement, 'ffprobe');
    assert.equal((await readFile(artifact.wavPath)).length, artifact.bytes);
  }
  assert.equal((await invoke(args)).exit, 5);
  assert.equal(
    JSON.parse(await readFile(join(output, 'narration-manifest.json'), 'utf8'))
      .status,
    'complete',
  );
});

test('audio CLI reports invalid configuration, usage, script and absent scene', async () => {
  for (const args of [
    [
      'smoke',
      '--config',
      mockPath,
      '--script',
      scriptPath,
      '--output',
      join(folder, 'missing-scene-flag'),
    ],
    ['doctor', '--config', mockPath, '--output', 'unused'],
    [
      'narrate',
      '--config',
      mockPath,
      '--script',
      scriptPath,
      '--output',
      'unused',
      '--scene',
      'extra',
    ],
    ['doctor', '--config', join(folder, 'absent-config')],
    [
      'smoke',
      '--config',
      mockPath,
      '--script',
      scriptPath,
      '--scene',
      'absent',
      '--output',
      join(folder, 'absent'),
    ],
    [
      'narrate',
      '--config',
      mockPath,
      '--script',
      join(folder, 'missing-script'),
      '--output',
      join(folder, 'invalid'),
    ],
  ]) {
    const result = await invoke(args);
    assert.equal(result.exit, 2);
    assert.ok(JSON.parse(result.stderr).error.code);
  }
});

test('real audio requires opt-in before starting health or synthesis', async () => {
  const configPath = join(folder, 'local.json');
  const config = JSON.parse(
    await readFile('narration.config.example.json', 'utf8'),
  );
  await writeFile(configPath, JSON.stringify(config));
  const loaded = await loadNarrationConfig(configPath);
  assert.equal(loaded.provider, 'kokoro-onnx');
  if (loaded.provider !== 'kokoro-onnx') throw new Error('Expected Kokoro');
  assert.equal(loaded.modelPath, join(folder, 'models/kokoro-v1.0.int8.onnx'));
  assert.equal(loaded.pythonExecutable, join(folder, '.venv/bin/python'));
  const result = await invoke([
    'smoke',
    '--config',
    configPath,
    '--script',
    scriptPath,
    '--scene',
    'scene-02-request',
    '--output',
    join(folder, 'not-opted-in'),
  ]);
  assert.equal(result.exit, 6);
  assert.equal(
    JSON.parse(result.stderr).error.code,
    'LOCAL_SYNTHESIS_OPT_IN_REQUIRED',
  );
});
