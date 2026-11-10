import { z } from 'zod';
import { canonicalUrl } from './policy.ts';
import { assessText } from './safety.ts';
import { digest, SnapshotSchema, sourceId } from './snapshot.ts';

export const editorialText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (text) => !assessText(text).length,
      'Instructions, commands, hidden controls and credential-like text are not accepted',
    );
export const ResearchInstructionsSchema = z.strictObject({
  topic: editorialText(400),
  targetAudience: editorialText(400),
  emphasize: z.array(editorialText(200)).max(20).default([]),
  exclude: z.array(editorialText(200)).max(20).default([]),
});
export const SelectionSchema = z
  .array(editorialText(1200))
  .min(1)
  .max(10)
  .refine(
    (sections) =>
      sections.join('\n\n').length <= 1200 &&
      new Set(sections).size === sections.length,
    'Select distinct literal sections totaling at most 1200 characters',
  );
const provenance = z.strictObject({
  method: z.enum(['http_fetch', 'manual_paste']),
  title: editorialText(200),
  licenseNote: editorialText(300).nullable(),
});
export function classifyUrl(url: string) {
  const parsed = canonicalUrl(url);
  if (['github.com', 'raw.githubusercontent.com'].includes(parsed.hostname))
    return /\/readme(?:\.(?:md|markdown|rst|txt))?$/i.test(parsed.pathname)
      ? ('github_readme' as const)
      : ('github_document' as const);
  return 'http_document' as const;
}
export const OriginalUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      return !value.includes('#') && Boolean(canonicalUrl(value));
    } catch {
      return false;
    }
  }, 'Expected a safe original URL without a fragment');
const extra = {
  schemaVersion: z.literal('1.1.0'),
  provenance,
  selectedSections: SelectionSchema.or(z.tuple([])),
};
const WebSchema = z
  .strictObject({
    ...SnapshotSchema.shape,
    ...extra,
    sourceType: z.enum(['http_document', 'github_readme', 'github_document']),
    originalUrl: OriginalUrlSchema,
  })
  .superRefine((s, ctx) => {
    const { sourceType, originalUrl, provenance, selectedSections, ...legacy } =
      s;
    const parsed = SnapshotSchema.safeParse({
      ...legacy,
      schemaVersion: '1.0.0',
    });
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        ctx.addIssue({
          code: 'custom',
          path: issue.path,
          message: issue.message,
        });
    let originalMatches = false;
    try {
      originalMatches = canonicalUrl(originalUrl).href === s.requestedUrl;
    } catch {
      /* Invalid original URL already fails schema validation. */
    }
    if (
      !originalMatches ||
      sourceType !== (parsed.success ? classifyUrl(s.requestedUrl) : null) ||
      provenance.method !== 'http_fetch'
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Web source provenance differs from its original request',
      });
    if (s.quarantineReasons.length && selectedSections.length)
      ctx.addIssue({
        code: 'custom',
        path: ['selectedSections'],
        message: 'Quarantined sources retain no selected text',
      });
    if (
      selectedSections.length &&
      s.excerpt !== null &&
      s.excerpt !== selectedSections.join('\n\n')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['selectedSections'],
        message: 'Selection differs from stored excerpt',
      });
  });
const PastedSchema = z
  .strictObject({
    ...SnapshotSchema.shape,
    ...extra,
    sourceType: z.literal('pasted_text'),
    originalUrl: z.null(),
    requestedUrl: z.null(),
    canonicalUrl: z.null(),
    origin: z.null(),
    resolvedAddress: z.null(),
    redirects: z.tuple([]),
  })
  .superRefine((s, ctx) => {
    if (
      s.sourceId !== sourceId('pasted_text', s.contentSha256, s.excerpt) ||
      s.mediaType !== 'text/plain' ||
      s.provenance.method !== 'manual_paste' ||
      s.revision.commit ||
      s.revision.etagSha256 ||
      s.revision.lastModified
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid manual source identity/provenance',
      });
    if (
      s.quarantineReasons.length
        ? s.excerpt !== null
        : !s.excerpt || assessText(s.excerpt).length > 0
    )
      ctx.addIssue({
        code: 'custom',
        path: ['excerpt'],
        message: 'Unsafe manual text must remain quarantined',
      });
    if (s.quarantineReasons.length && s.selectedSections.length)
      ctx.addIssue({
        code: 'custom',
        path: ['selectedSections'],
        message: 'Quarantined sources retain no selected text',
      });
    if (
      s.selectedSections.length &&
      s.excerpt !== null &&
      s.excerpt !== s.selectedSections.join('\n\n')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['selectedSections'],
        message: 'Selection differs from stored excerpt',
      });
  });
export const ResearchSourceSchema = z.union([WebSchema, PastedSchema]);
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;
// Legacy snapshots keep their original schema and digest; existing reviews remain readable.
export const EvidenceSourceSchema = z.union([
  SnapshotSchema,
  ResearchSourceSchema,
]);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export function evidenceDigest(source: EvidenceSource) {
  return digest(JSON.stringify(EvidenceSourceSchema.parse(source)));
}
