import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/cli/run.ts';
import { animation, fixture, fixturePath } from './helpers/fixture.ts';

const temp = await mkdtemp(join(tmpdir(), 'studio-cli-test-'));
after(async () => {
  await rm(temp, { recursive: true, force: true });
});

async function invoke(args: string[]) {
  let stdout = '';
  let stderr = '';
  const exit = await runCli(args, {
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { exit, stdout, stderr };
}

test('CLI accepts the original fixture', async () => {
  const result = await invoke([
    'script',
    'validate',
    '--file',
    fileURLToPath(fixturePath),
  ]);
  assert.equal(result.exit, 0);
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), {
    valid: true,
    script_id: 'fixture-http-request-001',
    schema_version: '1.0.0',
    scene_count: 6,
  });
});

test('CLI help and usage errors use documented exit codes', async () => {
  for (const args of [
    [],
    ['--help'],
    ['-h'],
    ['script', 'validate', '--help'],
  ]) {
    const result = await invoke(args);
    assert.equal(result.exit, 0);
    assert.match(result.stdout, /script validate --file/);
  }
  for (const args of [
    ['render'],
    ['script', 'validate'],
    ['script', 'validate', '--file'],
    ['script', 'validate', '--file', 'x', '--unsafe'],
    ['script', 'validate', '--file', 'x', 'extra'],
  ]) {
    const result = await invoke(args);
    assert.equal(result.exit, 2);
    assert.equal(JSON.parse(result.stderr).error.code, 'CLI_USAGE_ERROR');
  }
});

test('CLI reports unreadable files and malformed JSON without stack traces', async () => {
  let result = await invoke([
    'script',
    'validate',
    '--file',
    join(temp, 'missing.json'),
  ]);
  assert.equal(result.exit, 2);
  assert.equal(JSON.parse(result.stderr).error.code, 'FILE_READ_ERROR');
  const malformed = join(temp, 'malformed.json');
  await writeFile(malformed, '{"secret":"do-not-log-value",}');
  result = await invoke(['script', 'validate', '--file', malformed]);
  assert.equal(result.exit, 2);
  assert.equal(JSON.parse(result.stderr).error.code, 'MALFORMED_JSON');
  assert.ok(!result.stderr.includes('do-not-log-value'));
  assert.equal(result.stdout, '');
});

function offlineProcess(args: string[]) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      fileURLToPath(new URL('./helpers/no-network.ts', import.meta.url)),
      fileURLToPath(new URL('../src/cli/index.ts', import.meta.url)),
      ...args,
    ],
    { encoding: 'utf8', env: {}, timeout: 10000 },
  );
}

test('real CLI accepts the fixture with network blocked and no API-key environment', () => {
  const result = offlineProcess([
    'script',
    'validate',
    '--file',
    fileURLToPath(fixturePath),
  ]);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).valid, true);
});

test('real CLI rejects two invalid fixtures with exact nonzero exits and structured errors', async () => {
  const component = fixture();
  Object.assign(animation(component), { component: 'UntrustedComponent' });
  const props = fixture();
  Object.assign(animation(props).props, {
    arbitraryExpression: 'process.exit(0)',
  });
  for (const [name, input, code, exit] of [
    ['unknown-component', component, 'UNKNOWN_VISUAL_COMPONENT', 3],
    ['extra-props', props, 'INVALID_INPUT', 2],
  ] as const) {
    const file = join(temp, `${name}.json`);
    await writeFile(file, JSON.stringify(input));
    const result = offlineProcess(['script', 'validate', '--file', file]);
    assert.equal(result.status, exit, result.stderr);
    assert.equal(result.stdout, '');
    const error = JSON.parse(result.stderr).error;
    assert.equal(error.code, 'SCRIPT_VALIDATION_FAILED');
    assert.equal(error.issues[0].code, code);
    assert.equal(error.issues[0].scene_id, 'scene-02-request');
    assert.ok(error.issues[0].path.includes('["visual"]'));
    assert.ok(error.issues[0].reason.length > 0);
  }
});

test('network guard blocks fetch before a connection is attempted', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      fileURLToPath(new URL('./helpers/no-network.ts', import.meta.url)),
      '--input-type=module',
      '-e',
      'fetch("https://example.invalid")',
    ],
    { encoding: 'utf8', env: {}, timeout: 10000 },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Network is disabled in this test/);
});

test('script validation stays independent of Remotion and render CLI modules', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      fileURLToPath(new URL('./helpers/no-renderer.ts', import.meta.url)),
      fileURLToPath(new URL('../src/cli/index.ts', import.meta.url)),
      'script',
      'validate',
      '--file',
      fileURLToPath(fixturePath),
    ],
    { encoding: 'utf8', env: {}, timeout: 10000 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).valid, true);
});

test('render CLI reports unsupported cues, missing browser and blocked output before launching rendering', async () => {
  const input = fixture();
  const cue = animation(input).cues[0];
  assert.ok(cue);
  cue.trigger = { kind: 'phrase', text: 'GET slash' };
  const file = join(temp, 'unresolved-phrase.json');
  await writeFile(file, JSON.stringify(input));
  const unsupported = offlineProcess(['render', '--script', file]);
  assert.equal(unsupported.status, 3, unsupported.stderr);
  const error = JSON.parse(unsupported.stderr).error;
  assert.equal(error.code, 'UNSUPPORTED_RENDER_INPUT');
  assert.equal(error.scene_id, 'scene-02-request');
  assert.match(error.path, /cues/);
  const missing = offlineProcess([
    'render',
    '--script',
    fileURLToPath(fixturePath),
    '--browser',
    join(temp, 'missing-chrome'),
    '--output',
    join(temp, 'not-rendered'),
  ]);
  assert.equal(missing.status, 5, missing.stderr);
  assert.equal(JSON.parse(missing.stderr).error.stage, 'browser');
  const parentFile = join(temp, 'parent-file');
  await writeFile(
    parentFile,
    'This is a regular file, not an output directory.',
  );
  const blocked = offlineProcess([
    'render',
    '--script',
    fileURLToPath(fixturePath),
    '--browser',
    process.execPath,
    '--output',
    join(parentFile, 'child'),
  ]);
  assert.equal(blocked.status, 5, blocked.stderr);
  assert.equal(JSON.parse(blocked.stderr).error.stage, 'output');
});
