import type { DatabaseSync } from 'node:sqlite';
import { fail } from '../workflow/model.ts';

// There was no database in Phases 01–06. Version 1 is the first actual schema.
export function migrate(db: DatabaseSync) {
  db.exec(
    'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;',
  );
  db.exec('BEGIN IMMEDIATE');
  try {
    const version = Number(
      db.prepare('PRAGMA user_version').get()?.user_version,
    );
    if (version > 2)
      fail(
        'SCHEMA_TOO_NEW',
        'Database belongs to a newer studio; use the matching application',
      );
    if (version === 0)
      db.exec(`
      CREATE TABLE jobs (
        id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, initial_hash TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('queued','running','failed','paused','needs_review','review_ready')),
        revision INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE script_revisions (
        job_id TEXT NOT NULL REFERENCES jobs(id), revision INTEGER NOT NULL,
        input_hash TEXT NOT NULL, script_hash TEXT NOT NULL, snapshot TEXT NOT NULL,
        created_at INTEGER NOT NULL, PRIMARY KEY(job_id, revision)
      ) STRICT;
      CREATE TABLE leases (
        resource TEXT PRIMARY KEY, token TEXT NOT NULL, generation INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE steps (
        id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), stage TEXT NOT NULL,
        scene_id TEXT NOT NULL, input_hash TEXT NOT NULL, output_hash TEXT,
        status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed','abandoned')),
        attempts INTEGER NOT NULL, output TEXT, error_code TEXT, error_stage TEXT, error_scene_id TEXT,
        started_at INTEGER NOT NULL, finished_at INTEGER, worker_version TEXT NOT NULL,
        UNIQUE(job_id, stage, scene_id, input_hash)
      ) STRICT;
      CREATE INDEX steps_job_status ON steps(job_id, status);
      CREATE TABLE assets (
        sha256 TEXT PRIMARY KEY, bytes INTEGER NOT NULL, path TEXT NOT NULL
      ) STRICT;
      CREATE TABLE cache_entries (
        input_hash TEXT PRIMARY KEY, output_hash TEXT NOT NULL, files TEXT NOT NULL
      ) STRICT;
      CREATE TABLE renders (
        job_id TEXT NOT NULL REFERENCES jobs(id), revision INTEGER NOT NULL,
        input_hash TEXT NOT NULL, manifest_sha256 TEXT NOT NULL, video_sha256 TEXT NOT NULL,
        path TEXT NOT NULL, approved_for_release INTEGER NOT NULL DEFAULT 0 CHECK(approved_for_release=0),
        PRIMARY KEY(job_id, revision),
        FOREIGN KEY(job_id, revision) REFERENCES script_revisions(job_id, revision)
      ) STRICT;
      CREATE TABLE ai_usage (
        job_id TEXT NOT NULL REFERENCES jobs(id), request_hash TEXT NOT NULL,
        receipt_hash TEXT NOT NULL, record TEXT NOT NULL,
        PRIMARY KEY(job_id, request_hash, receipt_hash)
      ) STRICT;
      PRAGMA user_version=1;
    `);
    if (version < 2)
      db.exec(`
        CREATE TABLE releases (
          id TEXT PRIMARY KEY, subject TEXT NOT NULL, manifest TEXT NOT NULL,
          created_at INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE release_reviews (
          id INTEGER PRIMARY KEY, release_id TEXT NOT NULL REFERENCES releases(id),
          subject TEXT NOT NULL, gate TEXT NOT NULL CHECK(gate IN ('facts','rights','video','publish')),
          dependency TEXT NOT NULL, record TEXT NOT NULL
        ) STRICT;
        CREATE INDEX review_dependency ON release_reviews(subject,gate,dependency,id);
        CREATE TABLE release_audit (
          id INTEGER PRIMARY KEY, release_id TEXT NOT NULL REFERENCES releases(id),
          event TEXT NOT NULL, record TEXT NOT NULL
        ) STRICT;
        CREATE TRIGGER immutable_release_update BEFORE UPDATE ON releases BEGIN SELECT RAISE(ABORT,'immutable release'); END;
        CREATE TRIGGER immutable_release_delete BEFORE DELETE ON releases BEGIN SELECT RAISE(ABORT,'immutable release'); END;
        CREATE TRIGGER immutable_review_update BEFORE UPDATE ON release_reviews BEGIN SELECT RAISE(ABORT,'append-only reviews'); END;
        CREATE TRIGGER immutable_review_delete BEFORE DELETE ON release_reviews BEGIN SELECT RAISE(ABORT,'append-only reviews'); END;
        CREATE TRIGGER immutable_audit_update BEFORE UPDATE ON release_audit BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
        CREATE TRIGGER immutable_audit_delete BEFORE DELETE ON release_audit BEGIN SELECT RAISE(ABORT,'append-only audit'); END;
        PRAGMA user_version=2;
      `);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
