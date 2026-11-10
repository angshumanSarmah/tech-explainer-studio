import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hash } from '../render-manifest/manifest.ts';
import {
  type FileGroup,
  fail,
  GroupSchema,
  JobSchema,
  type JobStatus,
  ProvenanceSchema,
  RenderRecordSchema,
  type Snapshot,
  SnapshotSchema,
  StepSchema,
  WorkflowError,
} from '../workflow/model.ts';
import { migrate } from './migrations.ts';

export interface Lease {
  resource: string;
  token: string;
  generation: number;
}
const transitions: Record<JobStatus, readonly JobStatus[]> = {
  queued: ['running', 'paused', 'needs_review'],
  running: ['failed', 'review_ready', 'queued'],
  failed: ['running', 'paused', 'needs_review'],
  paused: ['queued', 'needs_review'],
  needs_review: ['paused'],
  review_ready: ['running', 'paused', 'needs_review'],
};
export class Repository {
  readonly db: DatabaseSync;
  readonly now: () => number;
  constructor(path: string, now: () => number = Date.now) {
    mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 3000 });
    this.now = now;
    try {
      migrate(this.db);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  close() {
    this.db.close();
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  get(id: string) {
    const row = this.db
      .prepare(`SELECT id, request_key AS requestKey, status, revision, version,
      created_at AS createdAt, updated_at AS updatedAt FROM jobs WHERE id=?`)
      .get(id);
    if (!row) fail('JOB_NOT_FOUND', 'No saved job has this ID');
    return JobSchema.parse(row);
  }
  list() {
    return this.db
      .prepare('SELECT id FROM jobs ORDER BY created_at DESC, id')
      .all()
      .map((row) => this.get(String(row.id)));
  }
  snapshot(id: string, revision = this.get(id).revision) {
    const row = this.db
      .prepare(
        'SELECT snapshot,input_hash,script_hash FROM script_revisions WHERE job_id=? AND revision=?',
      )
      .get(id, revision);
    if (!row) fail('REVISION_NOT_FOUND', 'No saved script revision');
    const text = String(row.snapshot);
    const snapshot = SnapshotSchema.parse(JSON.parse(text));
    if (
      hash(text) !== row.input_hash ||
      hash(JSON.stringify(snapshot.script)) !== row.script_hash
    )
      fail(
        'SNAPSHOT_CORRUPT',
        'Saved revision hashes no longer match; recover the original database/snapshot rather than editing it in place',
      );
    return snapshot;
  }
  private insertRevision(id: string, revision: number, snapshot: Snapshot) {
    const text = JSON.stringify(SnapshotSchema.parse(snapshot));
    if (Buffer.byteLength(text) > 2097152)
      fail('SNAPSHOT_LIMIT', 'Job snapshot exceeds 2 MiB');
    this.db
      .prepare('INSERT INTO script_revisions VALUES(?,?,?,?,?,?)')
      .run(
        id,
        revision,
        hash(text),
        hash(JSON.stringify(snapshot.script)),
        text,
        this.now(),
      );
    const usage = snapshot.provenance.usage;
    if (usage) {
      const receipt = hash(
        JSON.stringify({ draft: snapshot.provenance.draftSha256, usage }),
      );
      this.db
        .prepare('INSERT OR IGNORE INTO ai_usage VALUES(?,?,?,?)')
        .run(id, usage.requestSha256, receipt, JSON.stringify(usage));
    }
  }
  create(snapshot: Snapshot, requestKey = hash(JSON.stringify(snapshot))) {
    if (!requestKey.trim() || requestKey.length > 200)
      fail(
        'REQUEST_KEY',
        'Use a nonempty idempotency key of at most 200 characters',
      );
    return this.transaction(() => {
      const inputHash = hash(JSON.stringify(SnapshotSchema.parse(snapshot)));
      const existing = this.db
        .prepare('SELECT id, initial_hash FROM jobs WHERE request_key=?')
        .get(requestKey);
      if (existing) {
        if (existing.initial_hash !== inputHash)
          fail(
            'IDEMPOTENCY_CONFLICT',
            'This request key already belongs to different inputs',
          );
        return this.get(String(existing.id));
      }
      const id = randomUUID();
      const now = this.now();
      this.db
        .prepare('INSERT INTO jobs VALUES(?,?,?,?,1,0,?,?)')
        .run(id, requestKey, inputHash, 'queued', now, now);
      this.insertRevision(id, 1, snapshot);
      return this.get(id);
    });
  }
  acquire(id: string, ttlMs = 120000, producer = false): Lease[] {
    return this.transaction(() => {
      this.get(id);
      const leases: Lease[] = [];
      for (const resource of [`job:${id}`, ...(producer ? ['producer'] : [])]) {
        const row = this.db
          .prepare('SELECT * FROM leases WHERE resource=?')
          .get(resource);
        if (row && Number(row.expires_at) > this.now())
          fail(
            'LEASE_BUSY',
            'Another worker owns this job or the local video producer; retry after it finishes or the lease expires',
          );
        const lease = {
          resource,
          token: randomUUID(),
          generation: Number(row?.generation ?? 0) + 1,
        };
        this.db
          .prepare(`INSERT INTO leases VALUES(?,?,?,?) ON CONFLICT(resource) DO UPDATE SET
          token=excluded.token, generation=excluded.generation, expires_at=excluded.expires_at`)
          .run(resource, lease.token, lease.generation, this.now() + ttlMs);
        leases.push(lease);
      }
      // A new job owner fences previous workers before recovering their unfinished steps.
      this.db
        .prepare(
          "UPDATE steps SET status='abandoned', error_code='WORKER_INTERRUPTED', error_stage=stage, error_scene_id=NULLIF(scene_id,''), finished_at=? WHERE job_id=? AND status='running'",
        )
        .run(this.now(), id);
      if (this.get(id).status === 'running')
        this.db
          .prepare(
            "UPDATE jobs SET status='queued', version=version+1, updated_at=? WHERE id=?",
          )
          .run(this.now(), id);
      return leases;
    });
  }
  assertLeases(leases: Lease[]) {
    if (!leases.length)
      fail('LEASE_REQUIRED', 'Mutation requires a current job lease');
    for (const lease of leases) {
      const row = this.db
        .prepare(
          'SELECT token, generation, expires_at FROM leases WHERE resource=?',
        )
        .get(lease.resource);
      if (
        !row ||
        row.token !== lease.token ||
        row.generation !== lease.generation ||
        Number(row.expires_at) <= this.now()
      )
        fail(
          'LEASE_LOST',
          'Worker lease expired or was replaced; stale worker cannot publish outputs',
        );
    }
  }
  guard(id: string, leases: Lease[]) {
    this.assertLeases(leases);
    if (!leases.some((l) => l.resource === `job:${id}`))
      fail('LEASE_REQUIRED', 'Lease does not own this job');
  }
  heartbeat(leases: Lease[], ttlMs = 120000) {
    this.transaction(() => {
      this.assertLeases(leases);
      for (const l of leases)
        this.db
          .prepare(
            'UPDATE leases SET expires_at=? WHERE resource=? AND token=?',
          )
          .run(this.now() + ttlMs, l.resource, l.token);
    });
  }
  release(leases: Lease[]) {
    this.transaction(() => {
      for (const l of leases)
        this.db
          .prepare(
            'UPDATE leases SET expires_at=0 WHERE resource=? AND token=? AND generation=?',
          )
          .run(l.resource, l.token, l.generation);
    });
  }
  transition(
    id: string,
    status: JobStatus,
    leases: Lease[],
    expectedVersion = this.get(id).version,
  ) {
    return this.transaction(() => {
      this.guard(id, leases);
      const old = this.get(id);
      if (old.version !== expectedVersion)
        fail('VERSION_CONFLICT', 'Job changed since it was inspected');
      if (
        old.status === 'paused' &&
        status === 'queued' &&
        this.snapshot(id).requiresEvidenceReview
      )
        fail(
          'EVIDENCE_REVIEW_REQUIRED',
          'Reimport a reviewed draft with matching research before continuing',
        );
      if (!transitions[old.status].includes(status))
        fail('INVALID_TRANSITION', `Cannot move ${old.status} to ${status}`);
      this.db
        .prepare(
          'UPDATE jobs SET status=?, version=version+1, updated_at=? WHERE id=? AND version=?',
        )
        .run(status, this.now(), id, expectedVersion);
      return this.get(id);
    });
  }
  revise(
    id: string,
    snapshot: Snapshot,
    leases: Lease[],
    expectedVersion: number,
    evidenceChanged: boolean,
    reviewed: boolean,
  ) {
    return this.transaction(() => {
      this.guard(id, leases);
      const job = this.get(id);
      if (job.version !== expectedVersion)
        fail('VERSION_CONFLICT', 'Job changed since it was inspected');
      if (job.status === 'running')
        fail('INVALID_TRANSITION', 'Cannot revise a running job');
      const previous = this.snapshot(id);
      evidenceChanged ||=
        hash(
          JSON.stringify({
            sources: previous.script.sources,
            claims: previous.script.claims,
            research: previous.provenance.research,
          }),
        ) !==
        hash(
          JSON.stringify({
            sources: snapshot.script.sources,
            claims: snapshot.script.claims,
            research: snapshot.provenance.research,
          }),
        );
      reviewed =
        reviewed &&
        Boolean(
          snapshot.provenance.research &&
            snapshot.provenance.draftReview &&
            snapshot.provenance.draftReview.draftSha256 ===
              snapshot.provenance.draftSha256,
        );
      snapshot = SnapshotSchema.parse({
        ...snapshot,
        requiresEvidenceReview:
          (evidenceChanged || this.snapshot(id).requiresEvidenceReview) &&
          !reviewed,
      });
      const status =
        job.status === 'paused'
          ? 'paused'
          : (evidenceChanged || job.status === 'needs_review') && !reviewed
            ? 'needs_review'
            : 'queued';
      this.insertRevision(id, job.revision + 1, snapshot);
      this.db
        .prepare(
          'UPDATE jobs SET revision=revision+1, version=version+1, status=?, updated_at=? WHERE id=?',
        )
        .run(status, this.now(), id);
      return this.get(id);
    });
  }
  steps(id: string) {
    return this.db
      .prepare(`SELECT id, job_id AS jobId, stage, scene_id AS sceneId, input_hash AS inputHash,
      output_hash AS outputHash, status, attempts, output, error_code AS errorCode, error_stage AS errorStage,
      error_scene_id AS errorSceneId, started_at AS startedAt, finished_at AS finishedAt, worker_version AS workerVersion
      FROM steps WHERE job_id=? ORDER BY id`)
      .all(id)
      .map((row) =>
        StepSchema.parse({
          ...row,
          output: row.output ? JSON.parse(String(row.output)) : null,
        }),
      );
  }
  beginStep(
    id: string,
    stage: 'audio' | 'scene' | 'assembly',
    sceneId: string,
    inputHash: string,
    leases: Lease[],
  ) {
    return this.transaction(() => {
      this.guard(id, leases);
      if (this.get(id).status !== 'running')
        fail('INVALID_TRANSITION', 'Steps require a running job');
      const old = this.steps(id).find(
        (s) =>
          s.stage === stage &&
          s.sceneId === sceneId &&
          s.inputHash === inputHash,
      );
      if (old && old.status !== 'succeeded' && old.attempts >= 2)
        throw new WorkflowError(
          'RETRY_LIMIT',
          stage,
          'This input failed twice; inspect diagnostics and explicitly repair the scene or its dependencies',
          sceneId || null,
        );
      this.db
        .prepare(`INSERT INTO steps(job_id,stage,scene_id,input_hash,status,attempts,started_at,worker_version)
        VALUES(?,?,?,?,'running',1,?,'workflow-v1') ON CONFLICT(job_id,stage,scene_id,input_hash) DO UPDATE SET
        status='running', attempts=steps.attempts+1, output=NULL, output_hash=NULL, error_code=NULL,
        error_stage=NULL, error_scene_id=NULL, started_at=excluded.started_at, finished_at=NULL`)
        .run(id, stage, sceneId, inputHash, this.now());
      const row = this.db
        .prepare(
          'SELECT id FROM steps WHERE job_id=? AND stage=? AND scene_id=? AND input_hash=?',
        )
        .get(id, stage, sceneId, inputHash);
      return Number(row?.id);
    });
  }
  completeStep(
    id: string,
    step: number,
    inputHash: string,
    files: FileGroup,
    leases: Lease[],
  ) {
    this.transaction(() => {
      this.guard(id, leases);
      const group = GroupSchema.parse(files);
      const outputHash = hash(JSON.stringify(group));
      const updated = this.db
        .prepare(
          "UPDATE steps SET status='succeeded', output=?, output_hash=?, finished_at=? WHERE id=? AND job_id=? AND input_hash=? AND status='running'",
        )
        .run(
          JSON.stringify(group),
          outputHash,
          this.now(),
          step,
          id,
          inputHash,
        );
      if (!updated.changes)
        fail('STEP_CONFLICT', 'Step no longer belongs to this running attempt');
      this.db
        .prepare('INSERT OR REPLACE INTO cache_entries VALUES(?,?,?)')
        .run(inputHash, outputHash, JSON.stringify(group));
    });
  }
  failStep(
    id: string,
    step: number,
    code: string,
    stage: string,
    scene: string | null,
    leases: Lease[],
  ) {
    this.transaction(() => {
      this.guard(id, leases);
      this.db
        .prepare(
          "UPDATE steps SET status='failed', error_code=?, error_stage=?, error_scene_id=?, finished_at=? WHERE id=? AND job_id=? AND status='running'",
        )
        .run(
          code.slice(0, 80),
          stage.slice(0, 80),
          scene,
          this.now(),
          step,
          id,
        );
    });
  }
  cache(key: string): FileGroup | null {
    const row = this.db
      .prepare('SELECT * FROM cache_entries WHERE input_hash=?')
      .get(key);
    if (!row) return null;
    const group = GroupSchema.parse(JSON.parse(String(row.files)));
    if (hash(JSON.stringify(group)) !== row.output_hash) return null;
    return group;
  }
  render(id: string) {
    const row = this.db
      .prepare('SELECT * FROM renders WHERE job_id=? AND revision=?')
      .get(id, this.get(id).revision);
    return row ? RenderRecordSchema.parse(row) : null;
  }
  saveRender(
    id: string,
    key: string,
    dir: string,
    files: FileGroup,
    leases: Lease[],
  ) {
    this.transaction(() => {
      this.guard(id, leases);
      const job = this.get(id);
      const manifest = files.find((f) => f.file === 'job-manifest.json');
      const video = files.find((f) => f.file === 'video.mp4');
      if (!manifest || !video)
        fail('MANIFEST_MISSING', 'Final output lacks video or job manifest');
      this.db
        .prepare('INSERT OR REPLACE INTO renders VALUES(?,?,?,?,?,?,0)')
        .run(id, job.revision, key, manifest.sha256, video.sha256, dir);
    });
  }
  usage(id: string) {
    return this.db
      .prepare('SELECT record FROM ai_usage WHERE job_id=?')
      .all(id)
      .map((row) =>
        ProvenanceSchema.shape.usage
          .unwrap()
          .parse(JSON.parse(String(row.record))),
      );
  }
}
