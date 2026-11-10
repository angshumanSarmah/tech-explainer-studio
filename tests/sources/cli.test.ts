import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { runEvidenceCli } from '../../src/cli/evidence-cli.ts';
import { dependencies, fixture, response, url } from './helpers.ts';

const temp = await mkdtemp(join(tmpdir(), 'studio-evidence-'));
after(async () => {
  await rm(temp, { recursive: true, force: true });
});
async function invoke(group: 'source' | 'claims', args: string[]) {
  let stdout = '';
  let stderr = '';
  const exit = await runEvidenceCli(
    group,
    args,
    {
      stdout: (s) => {
        stdout += s;
      },
      stderr: (s) => {
        stderr += s;
      },
    },
    dependencies({
      request: async () =>
        response(await fixture('http.html'), { 'content-type': 'text/html' }),
    }),
  );
  return { exit, stdout, stderr };
}
const save = async (name: string, value: unknown) => {
  const path = join(temp, name);
  await writeFile(path, JSON.stringify(value));
  return path;
};
test('mock CLI ingestion and JSON review workflow preserve revisions and require explicit approval', async () => {
  const folder = join(temp, 'snapshot');
  const ingested = await invoke('source', [
    'ingest',
    '--url',
    url,
    '--confirm-public',
    '--output',
    folder,
  ]);
  assert.equal(ingested.exit, 0, ingested.stderr);
  const snapshotPath = join(folder, 'snapshot.json');
  const s = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const claimId = 'http-model';
  const quote = 'HTTP uses a request-response model.';
  const draft = await save('draft.json', {
    claims: [{ claimId, text: quote, sourceIds: [s.sourceId] }],
  });
  const initial = join(temp, 'initial.json');
  assert.equal(
    (
      await invoke('claims', [
        'init',
        '--claims',
        draft,
        '--source',
        snapshotPath,
        '--output',
        initial,
      ])
    ).exit,
    0,
  );
  assert.equal(
    (await invoke('claims', ['check', '--ledger', initial])).exit,
    4,
  );
  const decision = await save('decision.json', {
    claimId,
    status: 'supported',
    reviewer: 'Synthetic test reviewer',
    rationale: 'Fixture quote inspected in test only',
    evidence: [{ sourceId: s.sourceId, quote }],
  });
  const reviewed = join(temp, 'reviewed.json');
  assert.equal(
    (
      await invoke('claims', [
        'review',
        '--ledger',
        initial,
        '--decision',
        decision,
        '--output',
        reviewed,
      ])
    ).exit,
    0,
  );
  assert.equal(
    (
      await invoke('claims', [
        'context',
        '--ledger',
        reviewed,
        '--output',
        join(temp, 'premature-context.json'),
      ])
    ).exit,
    4,
  );
  const approved = join(temp, 'approved.json');
  assert.equal(
    (
      await invoke('claims', [
        'approve',
        '--ledger',
        reviewed,
        '--reviewer',
        'Synthetic test reviewer',
        '--rationale',
        'Synthetic fixture only',
        '--output',
        approved,
      ])
    ).exit,
    0,
  );
  assert.equal(
    (await invoke('claims', ['check', '--ledger', approved])).exit,
    0,
  );
  const context = join(temp, 'context.json');
  assert.equal(
    (
      await invoke('claims', [
        'context',
        '--ledger',
        approved,
        '--output',
        context,
      ])
    ).exit,
    0,
  );
  assert.equal(
    JSON.parse(await readFile(context, 'utf8')).commandsAllowed,
    false,
  );
  const before = await readFile(initial, 'utf8');
  assert.equal(
    (await invoke('claims', ['init', '--claims', draft, '--output', initial]))
      .exit,
    2,
  );
  assert.equal(await readFile(initial, 'utf8'), before);
  assert.equal(JSON.parse(before).factApproval, null);
});
test('source CLI requires public confirmation and rejects unrelated or unsafe options', async () => {
  for (const args of [
    ['ingest', '--url', url, '--output', join(temp, 'no-optin')],
    [
      'ingest',
      '--url',
      url,
      '--confirm-public',
      '--reviewer',
      'X',
      '--output',
      join(temp, 'bad-option'),
    ],
    ['init', '--claims', 'x'],
    [
      'ingest',
      '--url',
      'https://user:FAKE_PASSWORD@docs.example.org',
      '--confirm-public',
      '--output',
      join(temp, 'bad-url'),
    ],
  ]) {
    const result = await invoke('source', args);
    assert.notEqual(result.exit, 0);
    assert.ok(!result.stderr.includes('FAKE_PASSWORD'));
  }
  assert.equal((await invoke('claims', ['--help'])).exit, 0);
  const bad = await save('bad.json', {
    claims: [],
    secret: 'SYNTHETIC_VALUE_DO_NOT_LOG',
  });
  const result = await invoke('claims', [
    'init',
    '--claims',
    bad,
    '--output',
    join(temp, 'bad-ledger.json'),
  ]);
  assert.equal(result.exit, 2);
  assert.ok(!result.stderr.includes('SYNTHETIC_VALUE'));
});
test('source CLI persists quarantined snapshot without unsafe text', async () => {
  let stdout = '';
  const folder = join(temp, 'quarantine');
  const exit = await runEvidenceCli(
    'source',
    ['ingest', '--url', url, '--confirm-public', '--output', folder],
    {
      stdout: (s) => {
        stdout += s;
      },
      stderr: (s) => assert.fail(s),
    },
    dependencies({
      request: async () =>
        response(await fixture('malicious.html'), {
          'content-type': 'text/html',
        }),
    }),
  );
  assert.equal(exit, 0);
  assert.equal(JSON.parse(stdout).quarantined, true);
  const saved = await readFile(join(folder, 'snapshot.json'), 'utf8');
  assert.equal(JSON.parse(saved).excerpt, null);
  assert.ok(!saved.includes('SYNTHETIC_TEST_ONLY'));
});
test('public CLI help, validation and blocked source requests run under a network-denying preload', () => {
  for (const [args, expected] of [
    [['source', '--help'], 0],
    [['claims', '--help'], 0],
    [
      ['script', 'validate', '--file', 'examples/http-server.videoscript.json'],
      0,
    ],
    [
      [
        'source',
        'ingest',
        '--url',
        'http://127.0.0.1/',
        '--confirm-public',
        '--output',
        join(temp, 'blocked'),
      ],
      4,
    ],
  ] as [string[], number][]) {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        './tests/helpers/no-network.ts',
        'src/cli/index.ts',
        ...args,
      ],
      { encoding: 'utf8', timeout: 10000 },
    );
    assert.equal(result.status, expected, result.stderr);
    assert.ok(!result.stderr.includes('Network is disabled'));
  }
});

test('credential URL failures never echo encoded or decoded credential text', async () => {
  const value = 'Authorization: Bearer SYNTHETIC_TEST_ONLY_123456789';
  const encoded = encodeURIComponent(value);
  const result = await invoke('source', [
    'ingest',
    '--url',
    `https://docs.example.org/${encoded}`,
    '--confirm-public',
    '--output',
    join(temp, 'credential-url'),
  ]);
  assert.equal(result.exit, 4);
  assert.equal(JSON.parse(result.stderr).error.code, 'URL_SECRET');
  assert.equal(result.stdout, '');
  assert.ok(!result.stderr.includes(encoded));
  assert.ok(!result.stderr.includes(value));
  assert.ok(!result.stderr.includes('SYNTHETIC_TEST_ONLY'));
});
