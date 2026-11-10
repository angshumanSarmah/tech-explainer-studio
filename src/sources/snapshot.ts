import { createHash } from 'node:crypto';
import { z } from 'zod';
import { canonicalUrl, isPublicAddress } from './policy.ts';
import { assessText, SafetyCodes } from './safety.ts';
export const digest = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
export const ShaSchema = z.string().regex(/^[a-f0-9]{64}$/);
const safeUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      return canonicalUrl(value).href === value;
    } catch {
      return false;
    }
  }, 'Expected canonical public-document URL');
export const SnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0.0'),
    sourceId: z.string().regex(/^source-[a-f0-9]{24}$/),
    requestedUrl: safeUrl,
    canonicalUrl: safeUrl,
    origin: z.string().max(300),
    retrievedAt: z.iso.datetime(),
    contentSha256: ShaSchema,
    bytes: z.int().positive().max(2097152),
    mediaType: z.enum([
      'text/html',
      'application/xhtml+xml',
      'text/plain',
      'text/markdown',
    ]),
    excerpt: z.string().min(1).max(1200).nullable(),
    excerptTruncated: z.boolean(),
    revision: z.strictObject({
      commit: z
        .string()
        .regex(/^[a-f0-9]{40}$/)
        .nullable(),
      etagSha256: ShaSchema.nullable(),
      lastModified: z.iso.datetime().nullable(),
    }),
    licenseSignals: z
      .array(
        z.enum([
          'mentions:MIT',
          'mentions:Apache-2.0',
          'mentions:CC0',
          'mentions:CC-BY',
          'mentions:GPL',
        ]),
      )
      .max(5),
    reusePermission: z.literal('not_granted'),
    trust: z.literal('untrusted_reference'),
    contextBlocked: z.literal(true),
    quarantineReasons: z.array(z.enum(SafetyCodes)).max(4),
    resolvedAddress: z
      .string()
      .max(64)
      .refine(isPublicAddress, 'Expected a public unicast address'),
    redirects: z.array(safeUrl).max(5),
    authentication: z.literal('none'),
    publicConfirmed: z.literal(true),
  })
  .superRefine((s, ctx) => {
    if (s.sourceId !== sourceId(s.canonicalUrl, s.contentSha256, s.excerpt))
      ctx.addIssue({
        code: 'custom',
        path: ['sourceId'],
        message: 'Source identity differs from URL/content hash',
      });
    if (s.origin !== new URL(s.canonicalUrl).origin)
      ctx.addIssue({
        code: 'custom',
        path: ['origin'],
        message: 'Source origin differs from canonical URL',
      });
    if (
      s.quarantineReasons.length
        ? s.excerpt !== null
        : s.excerpt === null || assessText(s.excerpt).length > 0
    )
      ctx.addIssue({
        code: 'custom',
        path: ['excerpt'],
        message:
          'Unsafe text must be quarantined; clean snapshots need an inert excerpt',
      });
  });
export type SourceSnapshot = z.infer<typeof SnapshotSchema>;
export function sourceId(url: string, hash: string, excerpt: string | null) {
  return `source-${digest(`${url}\n${hash}\n${excerpt ?? ''}`).slice(0, 24)}`;
}
export function snapshotDigest(snapshot: SourceSnapshot) {
  return digest(JSON.stringify(SnapshotSchema.parse(snapshot)));
}
