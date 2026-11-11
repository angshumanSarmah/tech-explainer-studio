import { z } from 'zod';
import {
  displayText,
  ShaSchema,
  StableIdSchema,
} from '../domain/visual-common.ts';
export const VisualAssetSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0.0'),
    assetId: StableIdSchema,
    sha256: ShaSchema,
    mimeType: z.enum([
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
    ]),
    extension: z.enum(['png', 'jpg', 'webp', 'svg']),
    width: z.int().min(16).max(4096),
    height: z.int().min(16).max(4096),
    bytes: z
      .int()
      .positive()
      .max(8 * 1024 * 1024),
    originalSource: displayText(1000),
    originalSha256: ShaSchema,
    rights: z.enum(['unknown', 'permitted', 'original', 'reference-only']),
    licenseEvidence: displayText(2000).nullable(),
    attribution: z.strictObject({
      required: z.boolean(),
      text: displayText(500).nullable(),
    }),
    status: z.enum(['pending', 'approved', 'rejected']),
    review: z
      .strictObject({
        reviewer: displayText(80),
        rationale: displayText(500),
        reviewedAt: z.iso.datetime(),
        fileSha256: ShaSchema,
      })
      .nullable(),
    metadata: z.strictObject({
      title: displayText(80),
      description: displayText(500),
    }),
  })
  .superRefine((a, c) => {
    if (a.width * a.height > 12_000_000)
      c.addIssue({ code: 'custom', message: 'Image exceeds 12 megapixels' });
    if (
      a.status === 'approved' &&
      (!a.review ||
        a.review.fileSha256 !== a.sha256 ||
        !a.licenseEvidence ||
        !['original', 'permitted'].includes(a.rights) ||
        (a.attribution.required && !a.attribution.text))
    )
      c.addIssue({
        code: 'custom',
        message:
          'Approval requires hash-bound human rights evidence and attribution',
      });
  });
export type VisualAsset = z.infer<typeof VisualAssetSchema>;
export class VisualAssetError extends Error {
  readonly code = 'VISUAL_ASSET_INVALID';
  readonly sceneId: string | null;
  constructor(message: string, sceneId: string | null = null) {
    super(message);
    this.name = 'VisualAssetError';
    this.sceneId = sceneId;
  }
}
