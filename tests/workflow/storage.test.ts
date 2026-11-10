import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { AssetCache } from '../../src/storage/cache.ts';
import { Repository } from '../../src/storage/repository.ts';
import { fingerprint } from '../../src/workflow/dependencies.ts';
import { GroupSchema, WorkflowError } from '../../src/workflow/model.ts';
import { snapshot } from './helpers.ts';

const root = await mkdtemp(join(tmpdir(), 'studio-store-'));
after(() => rm(root, { recursive: true, force: true }));
const code = (expected: string) => (error: unknown) =>
  error instanceof WorkflowError && error.code === expected;
test('first actual SQLite migration is atomic, repeatable, strict and rejects future schemas', () => {
  const path = join(root, 'migration.sqlite');
  let repo = new Repository(path);
  assert.equal(repo.db.prepare('PRAGMA user_version').get()?.user_version, 2);
  assert.equal(repo.db.prepare('PRAGMA foreign_keys').get()?.foreign_keys, 1);
  assert.throws(() =>
    repo.transaction(() => {
      repo.db.prepare('INSERT INTO assets VALUES(?,?,?)').run('x', 1, 'x');
      throw new Error('crash');
    }),
  );
  assert.equal(repo.db.prepare('SELECT count(*) AS n FROM assets').get()?.n, 0);
  repo.close();
  repo = new Repository(path);
  assert.equal(repo.list().length, 0);
  repo.close();
  const db = new DatabaseSync(path);
  db.exec('PRAGMA user_version=3');
  db.close();
  assert.throws(() => new Repository(path), code('SCHEMA_TOO_NEW'));
});
test('legacy fixture/default brand, idempotent creation and imported spend round trip', () => {
  const repo = new Repository(join(root, 'identity.sqlite'));
  try {
    const input = snapshot();
    input.provenance.origin = 'deepseek';
    input.provenance.draftSha256 = 'a'.repeat(64);
    input.provenance.usage = {
      provider: 'deepseek',
      model: 'reviewed-model',
      requestSha256: 'b'.repeat(64),
      budget: null,
      entries: [
        {
          inputTokens: 123,
          outputTokens: 45,
          estimatedUsd: 0.002,
          reservedUsd: 0.003,
          outcome: 'success',
        },
      ],
    };
    assert.equal(input.script.schema_version, '1.0.0');
    assert.equal('brand' in input.script, false);
    const job = repo.create(input, 'one');
    assert.deepEqual(repo.create(input, 'one'), job);
    assert.equal(repo.snapshot(job.id).provenance.brand.id, 'tech-explainer');
    assert.equal(repo.usage(job.id).length, 1);
    const lease = repo.acquire(job.id);
    repo.revise(job.id, input, lease, job.version, false, false);
    repo.release(lease);
    assert.equal(repo.usage(job.id).length, 1);
    assert.equal(repo.render(job.id), null);
    const changed = structuredClone(input);
    changed.script.topic = 'Changed topic';
    assert.throws(
      () => repo.create(changed, 'one'),
      code('IDEMPOTENCY_CONFLICT'),
    );
  } finally {
    repo.close();
  }
});
test('two connections enforce lease ownership, global producer, CAS, transitions and stale-worker fencing', () => {
  let now = 1000;
  const path = join(root, 'concurrency.sqlite');
  const a = new Repository(path, () => now);
  const b = new Repository(path, () => now);
  try {
    const first = a.create(snapshot(), 'a'),
      second = a.create(snapshot(), 'b');
    const l1 = a.acquire(first.id, 100, true);
    assert.throws(() => b.acquire(first.id, 100), code('LEASE_BUSY'));
    assert.throws(() => b.acquire(second.id, 100, true), code('LEASE_BUSY'));
    assert.throws(
      () => a.transition(first.id, 'review_ready', l1),
      code('INVALID_TRANSITION'),
    );
    a.transition(first.id, 'running', l1);
    const step = a.beginStep(
      first.id,
      'scene',
      'scene-01-hook',
      'c'.repeat(64),
      l1,
    );
    now += 101;
    const l2 = b.acquire(first.id, 100, true);
    assert.equal(b.steps(first.id)[0]?.status, 'abandoned');
    assert.equal(b.steps(first.id)[0]?.errorCode, 'WORKER_INTERRUPTED');
    assert.throws(
      () =>
        a.completeStep(
          first.id,
          step,
          'c'.repeat(64),
          [{ file: 'video.mp4', bytes: 1, sha256: 'd'.repeat(64) }],
          l1,
        ),
      code('LEASE_LOST'),
    );
    assert.throws(
      () => b.transition(first.id, 'running', l2, first.version),
      code('VERSION_CONFLICT'),
    );
    b.transition(first.id, 'running', l2);
    b.beginStep(first.id, 'scene', 'scene-01-hook', 'c'.repeat(64), l2);
    now += 101;
    const l3 = b.acquire(first.id, 100, true);
    b.transition(first.id, 'running', l3);
    assert.throws(
      () => b.beginStep(first.id, 'scene', 'scene-01-hook', 'c'.repeat(64), l3),
      code('RETRY_LIMIT'),
    );
    a.release(l1);
    b.assertLeases(l3);
    b.release(l3);
  } finally {
    a.close();
    b.close();
  }
});
test('pause/evidence gates survive revisions; no stale render approval can be stored', () => {
  const repo = new Repository(join(root, 'gates.sqlite'));
  try {
    const job = repo.create(snapshot());
    const leases = repo.acquire(job.id);
    repo.transition(job.id, 'paused', leases);
    const input = snapshot();
    const claim = input.script.claims[0];
    assert.ok(claim);
    claim.text = 'A revised claim';
    repo.revise(job.id, input, leases, repo.get(job.id).version, true, false);
    assert.equal(repo.get(job.id).status, 'paused');
    assert.equal(repo.snapshot(job.id).requiresEvidenceReview, true);
    assert.throws(
      () => repo.transition(job.id, 'queued', leases),
      code('EVIDENCE_REVIEW_REQUIRED'),
    );
    assert.equal(repo.render(job.id), null);
    assert.throws(() =>
      repo.db
        .prepare('INSERT INTO renders VALUES(?,?,?,?,?,?,1)')
        .run(job.id, 2, 'a', 'b', 'c', 'd'),
    );
    repo.release(leases);
  } finally {
    repo.close();
  }
});
test('content-addressed files verify bytes, hydrate atomically and reject corruption and traversal', async () => {
  const repo = new Repository(join(root, 'assets.sqlite'));
  const cache = new AssetCache(join(root, 'cache'), repo);
  try {
    const dir = join(root, 'capture');
    await mkdir(dir);
    await writeFile(join(dir, 'one.txt'), 'verified');
    const files = await cache.capture(dir);
    const key = fingerprint('asset');
    const job = repo.create(snapshot());
    const leases = repo.acquire(job.id);
    repo.transition(job.id, 'running', leases);
    assert.equal(await cache.lookup(key), null); // file persistence alone never completes a step
    const step = repo.beginStep(job.id, 'scene', 'scene-01-hook', key, leases);
    repo.completeStep(job.id, step, key, files, leases);
    assert.deepEqual(await cache.lookup(key), files);
    const target = join(root, 'hydrated');
    await assert.rejects(() =>
      cache.hydrate(files, target, () => {
        throw new Error('lost lease');
      }),
    );
    await assert.rejects(() => readFile(join(target, 'one.txt')));
    await cache.hydrate(files, target, () => repo.guard(job.id, leases));
    assert.equal(await readFile(join(target, 'one.txt'), 'utf8'), 'verified');
    await writeFile(join(target, 'one.txt'), 'modified');
    assert.equal(await cache.verify(files), true); // exports are copies, never hardlinks
    const file = files[0];
    assert.ok(file);
    await writeFile(cache.blob(file.sha256), 'corrupted');
    assert.equal(await cache.lookup(key), null);
    await assert.rejects(() => cache.hydrate(files, join(root, 'bad')));
    assert.equal(
      GroupSchema.safeParse([
        { file: '../escape', sha256: 'a'.repeat(64), bytes: 1 },
      ]).success,
      false,
    );
    repo.release(leases);
  } finally {
    repo.close();
  }
});

test('persisted revision corruption cannot silently change a saved script', () => {
  const repo = new Repository(join(root, 'corrupt-revision.sqlite'));
  try {
    const job = repo.create(snapshot());
    const changed = snapshot();
    changed.script.topic = 'Changed outside the revision API';
    repo.db
      .prepare('UPDATE script_revisions SET snapshot=? WHERE job_id=?')
      .run(JSON.stringify(changed), job.id);
    assert.throws(() => repo.snapshot(job.id), code('SNAPSHOT_CORRUPT'));
  } finally {
    repo.close();
  }
});
