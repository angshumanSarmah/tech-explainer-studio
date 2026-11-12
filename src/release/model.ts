import { z } from 'zod';
import { editorialText } from '../sources/research-source.ts';
import { Sha } from '../workflow/model.ts';

export const Gate = z.enum(['facts', 'rights', 'video', 'publish']);
export type GateName = z.infer<typeof Gate>;
export const Identity = z.string().regex(/^[a-z0-9][a-z0-9_.@-]{1,119}$/);
export const MetadataSchema = z.strictObject({
  title: editorialText(100),
  description: editorialText(5000),
  tags: z.array(editorialText(100)).max(30),
  destination: z.literal('youtube'),
  privacy: z.literal('private'),
  madeForKids: z.boolean(),
  containsSyntheticMedia: z.boolean(),
});
export const AssetSchema = z.strictObject({
  assetId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  kind: z.enum([
    'source',
    'original-visual',
    'image',
    'layered-illustration',
    'stock-footage',
    'lottie',
    'rive',
    'font',
    'texture',
    'model-3d',
    'map-tiles',
    'ai-image',
    'voice-model',
    'audio',
    'cover',
  ]),
  // Null only for cited sources and authored/code-native work. Imported media needs a local file.
  path: z.string().min(1).max(4096).nullable(),
  sha256: Sha,
  origin: editorialText(1000),
  provider: editorialText(200),
  creator: editorialText(200).nullable(),
  usage: editorialText(1000),
  rights: z.enum(['unknown', 'permitted', 'original', 'reference-only']),
  licenseEvidence: editorialText(3000).nullable(),
  attribution: z.strictObject({
    required: z.boolean(),
    text: editorialText(1000).nullable(),
  }),
  review: z
    .strictObject({
      reviewer: Identity,
      reviewedAt: z.iso.datetime(),
      rationale: editorialText(2000),
      assetSha256: Sha,
    })
    .nullable(),
});
export const RightsSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0.0'),
    assets: z.array(AssetSchema).min(1).max(500),
  })
  .refine(
    (v) => new Set(v.assets.map((a) => a.assetId)).size === v.assets.length,
    'Duplicate asset IDs',
  );
export type RightsLedger = z.infer<typeof RightsSchema>;
export const FileBinding = z.strictObject({
  role: z.string().min(1).max(200),
  path: z.string().min(1).max(4096),
  sha256: Sha,
  bytes: z.int().positive().max(1073741824),
});
export const ManifestSchema = z.strictObject({
  schemaVersion: z.literal('1.0.0'),
  kind: z.literal('release-candidate'),
  subject: z.string().min(1).max(200),
  author: Identity,
  job: z
    .strictObject({
      id: z.uuid(),
      revision: z.int().positive(),
      snapshotSha256: Sha,
    })
    .nullable(),
  origin: z.enum(['manual_import', 'deepseek', 'ollama']),
  renderDir: z.string().min(1).max(4096),
  files: z.array(FileBinding).min(7).max(1500),
  dependencies: z.strictObject({
    facts: Sha,
    rights: Sha,
    video: Sha,
    publish: Sha,
  }),
});
export type ReleaseManifest = z.infer<typeof ManifestSchema>;
export const ReviewSchema = z.strictObject({
  reviewer: Identity,
  decision: z.enum(['approve', 'reject']),
  rationale: editorialText(2000),
  reviewedAt: z.iso.datetime(),
  boundaryPacing: z
    .strictObject({
      reportSha256: Sha,
      decisions: z
        .array(
          z.strictObject({
            id: z.string().min(1).max(260),
            classification: z.enum(['deliberate', 'unintended', 'unresolved']),
            rationale: editorialText(1000),
          }),
        )
        .max(100),
    })
    .optional(),
  checks: z.strictObject({
    playback: z.boolean().default(false),
    pronunciation: z.boolean().default(false),
    subtitles: z.boolean().default(false),
    pacing: z.boolean().default(false),
    timingWarnings: z.boolean().default(false),
    metadata: z.boolean().default(false),
  }),
});
export type Review = z.infer<typeof ReviewSchema>;
export class ReleaseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
export function block(code: string, message: string): never {
  throw new ReleaseError(code, message);
}
