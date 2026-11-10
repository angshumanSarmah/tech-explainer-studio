import { z } from 'zod';
import { LedgerSchema } from '../claims/ledger.ts';
import { NarrationConfigSchema } from '../config/narration.ts';
import { VideoScriptSchema } from '../domain/videoscript.ts';
import { StableIdSchema } from '../domain/visuals.ts';
import { CostPolicySchema, UsageEntrySchema } from '../llm/provider.ts';
import { SnapshotSchema as SourceSnapshotSchema } from '../sources/snapshot.ts';
import { AlignmentSchema } from '../timing/timeline.ts';

export const Sha = z.string().regex(/^[a-f0-9]{64}$/);
export const FileSchema = z.strictObject({
  file: z
    .string()
    .max(4096)
    .regex(/^[A-Za-z0-9_-][A-Za-z0-9_./-]*$/)
    .refine((v) => !v.split('/').some((p) => p === '..' || p === '.' || !p)),
  sha256: Sha,
  bytes: z.int().positive().max(1073741824),
});
export const GroupSchema = z.array(FileSchema).min(1).max(1000);
export type FileGroup = z.infer<typeof GroupSchema>;
export const ProvenanceSchema = z.strictObject({
  origin: z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/),
  brand: z.strictObject({
    id: z.string().min(1),
    version: z.string().min(1),
    sha256: Sha,
  }),
  research: z
    .strictObject({
      bundleId: z.string().min(1).max(128),
      bundleSha256: Sha,
      ledgerSha256: Sha,
      bundleCreatedAt: z.iso.datetime(),
      sourceReferences: z
        .array(
          z.strictObject({
            sourceId: StableIdSchema,
            contentSha256: Sha,
            retrievedAt: z.iso.datetime(),
            revision: SourceSnapshotSchema.shape.revision,
          }),
        )
        .max(50),
      claimReviewReferences: z
        .array(LedgerSchema.shape.claims.element.omit({ text: true }))
        .max(100),
      ledgerRevision: z.int().positive(),
      factApproval: LedgerSchema.shape.factApproval,
    })
    .nullable(),
  draftSha256: Sha.nullable(),
  draftReview: z
    .strictObject({
      reviewer: z.string().max(120),
      reviewedAt: z.iso.datetime(),
      draftSha256: Sha,
    })
    .nullable(),
  usage: z
    .strictObject({
      provider: z.string().max(32),
      model: z.string().max(120),
      requestSha256: Sha,
      budget: CostPolicySchema.nullable(),
      entries: z.array(UsageEntrySchema).max(6),
    })
    .nullable(),
});
export const SnapshotSchema = z.strictObject({
  version: z.literal(1),
  requiresEvidenceReview: z.boolean(),
  script: VideoScriptSchema,
  provenance: ProvenanceSchema,
  config: NarrationConfigSchema.nullable(),
  // Saved WAVs are immutable snapshots, not mutable external path references.
  savedAudio: z.record(z.string(), GroupSchema),
  alignment: AlignmentSchema.nullable(),
  allowFallback: z.boolean(),
  strict: z.boolean(),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
export const JobState = z.enum([
  'queued',
  'running',
  'failed',
  'paused',
  'needs_review',
  'review_ready',
]);
export type JobStatus = z.infer<typeof JobState>;
export const JobSchema = z.strictObject({
  id: z.uuid(),
  requestKey: z.string().min(1).max(200),
  status: JobState,
  revision: z.int().positive(),
  version: z.int().nonnegative(),
  createdAt: z.int().nonnegative(),
  updatedAt: z.int().nonnegative(),
});
export type Job = z.infer<typeof JobSchema>;
export const StepSchema = z.strictObject({
  id: z.int().positive(),
  jobId: z.uuid(),
  stage: z.enum(['audio', 'scene', 'assembly']),
  sceneId: z.string().max(128),
  inputHash: Sha,
  outputHash: Sha.nullable(),
  status: z.enum(['running', 'succeeded', 'failed', 'abandoned']),
  attempts: z.int().positive(),
  output: GroupSchema.nullable(),
  errorCode: z.string().max(80).nullable(),
  errorStage: z.string().max(80).nullable(),
  errorSceneId: z.string().max(128).nullable(),
  startedAt: z.int(),
  finishedAt: z.int().nullable(),
  workerVersion: z.string(),
});
export type Step = z.infer<typeof StepSchema>;
export class WorkflowError extends Error {
  readonly code: string;
  readonly stage: string;
  readonly sceneId: string | null;
  constructor(
    code: string,
    stage: string,
    reason: string,
    sceneId: string | null = null,
  ) {
    super(reason);
    this.code = code;
    this.stage = stage;
    this.sceneId = sceneId;
  }
}
export function fail(code: string, reason: string): never {
  throw new WorkflowError(code, 'storage', reason);
}

export const RenderRecordSchema = z.strictObject({
  job_id: z.uuid(),
  revision: z.int().positive(),
  input_hash: Sha,
  manifest_sha256: Sha,
  video_sha256: Sha,
  path: z.string().min(1).max(4096),
  approved_for_release: z.literal(0),
});
