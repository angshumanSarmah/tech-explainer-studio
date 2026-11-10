import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { hash } from '../../src/render-manifest/manifest.ts';
import { Repository } from '../../src/storage/repository.ts';
import { fingerprint } from '../../src/workflow/dependencies.ts';
import { snapshot } from '../workflow/helpers.ts';
import { setup } from './helpers.ts';

test('v1 jobs upgrade to v2 without losing previews or weakening render CHECK; repeat migration works', async () => {
  const s = await setup();
  s.repo.close();
  try {
    const db = new DatabaseSync(join(s.root, 'studio.sqlite'));
    db.exec(
      'DROP TABLE release_audit; DROP TABLE release_reviews; DROP TABLE releases; PRAGMA user_version=1;',
    );
    db.close();
    let repo = new Repository(join(s.root, 'studio.sqlite'));
    const job = repo.create(snapshot(), 'legacy-upgrade');
    repo.close();
    repo = new Repository(join(s.root, 'studio.sqlite'));
    assert.equal(repo.get(job.id).revision, 1);
    assert.equal(repo.db.prepare('PRAGMA user_version').get()?.user_version, 2);
    assert.match(
      String(
        repo.db
          .prepare("SELECT sql FROM sqlite_master WHERE name='renders'")
          .get()?.sql,
      ),
      /CHECK\(approved_for_release=0\)/,
    );
    assert.ok(
      repo.db
        .prepare("SELECT name FROM sqlite_master WHERE name='release_reviews'")
        .get(),
    );
    repo.close();
  } finally {
    await rm(s.root, { recursive: true, force: true });
  }
});

test('release binds a review_ready SQLite job and cannot outlive its exact active revision', async () => {
  const s = await setup();
  try {
    const input = snapshot();
    input.script = s.script;
    const job = s.repo.create(input, 'release-job'),
      leases = s.repo.acquire(job.id);
    s.repo.transition(job.id, 'running', leases);
    s.repo.transition(job.id, 'review_ready', leases);
    s.repo.release(leases);
    s.repo.db
      .prepare('INSERT INTO renders VALUES(?,?,?,?,?,?,0)')
      .run(
        job.id,
        1,
        'a'.repeat(64),
        hash(await readFile(join(s.render, 'render-manifest.json'))),
        s.preview.videoSha256,
        s.render,
      );
    const { releaseId: id } = await s.service.prepare({
      ...s.options,
      job: job.id,
    });
    assert.equal(s.service.store.get(id).job?.revision, 1);
    const lock = s.repo.acquire(job.id),
      current = s.repo.get(job.id);
    input.script.topic += ' revised';
    s.repo.revise(job.id, input, lock, current.version, false, false);
    s.repo.release(lock);
    await assert.rejects(
      () => s.service.check(id),
      (e) => e instanceof Error && 'code' in e && e.code === 'STALE_JOB',
    );
    assert.notEqual(fingerprint(input.script), s.preview.scriptSha256);
  } finally {
    s.repo.close();
    await rm(s.root, { recursive: true, force: true });
  }
});
