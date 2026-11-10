import { z } from 'zod';
import { StableIdSchema } from '../domain/visuals.ts';
import {
  ingestSource,
  licenseSignals,
  type SourceDependencies,
} from './ingest.ts';
import {
  canonicalUrl,
  FetchLimitOverridesSchema,
  FetchLimitsSchema,
  SourceError,
} from './policy.ts';
import {
  classifyUrl,
  editorialText,
  OriginalUrlSchema,
  ResearchInstructionsSchema,
  type ResearchSource,
  ResearchSourceSchema,
  SelectionSchema,
} from './research-source.ts';
import { assessText, documentText } from './safety.ts';
import { digest, ShaSchema, sourceId } from './snapshot.ts';
import { requestDocument } from './transport.ts';

const fields = {
  inputId: StableIdSchema,
  publicConfirmed: z.literal(true),
  title: editorialText(200),
  licenseNote: editorialText(300).nullable().default(null),
  sections: SelectionSchema.optional(),
  limits: FetchLimitOverridesSchema.optional(),
};
const UrlInputSchema = z.strictObject({
  ...fields,
  kind: z.literal('url'),
  url: z
    .string()
    .max(2048)
    .refine((value) => {
      try {
        return Boolean(canonicalUrl(value));
      } catch {
        return false;
      }
    }, 'Expected a safe public document URL'),
  allowedHosts: z
    .array(
      z
        .string()
        .max(253)
        .refine((host) => {
          try {
            const u = canonicalUrl(`https://${host}/`);
            return u.hostname === host.toLowerCase() && u.pathname === '/';
          } catch {
            return false;
          }
        }, 'Expected a bare public hostname'),
    )
    .max(10)
    .default([]),
});
const NoteInputSchema = z.strictObject({
  ...fields,
  kind: z.literal('pasted_text'),
  text: z.string().min(1).max(2097152),
});
export const BundleLimitsSchema = z.strictObject({
  maxSources: z.int().min(1).max(50).default(20),
  maxTotalBytes: z.int().min(256).max(8388608).default(4194304),
  timeoutMs: z.int().min(50).max(120000).default(30000),
  maxRequests: z.int().min(1).max(300).default(60),
  perSource: FetchLimitsSchema.default({
    maxBytes: 524288,
    timeoutMs: 10000,
    maxRedirects: 3,
  }),
});
export const ResearchBundleInputSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0.0'),
    instructions: ResearchInstructionsSchema,
    sources: z
      .array(z.discriminatedUnion('kind', [UrlInputSchema, NoteInputSchema]))
      .min(1)
      .max(50),
    limits: BundleLimitsSchema.prefault({}),
  })
  .superRefine((b, ctx) => {
    if (
      b.sources.length > b.limits.maxSources ||
      new Set(b.sources.map((s) => s.inputId)).size !== b.sources.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['sources'],
        message: 'Source count exceeds limit or input IDs repeat',
      });
    for (const [i, s] of b.sources.entries())
      if (
        s.kind === 'pasted_text' &&
        Buffer.byteLength(s.text) >
          Math.min(
            s.limits?.maxBytes ?? b.limits.perSource.maxBytes,
            b.limits.perSource.maxBytes,
          )
      )
        ctx.addIssue({
          code: 'custom',
          path: ['sources', i],
          message: 'Pasted text exceeds per-source byte limit',
        });
  });
const AssignmentSchema = z.strictObject({
  inputId: StableIdSchema,
  sourceId: z.string().regex(/^source-[a-f0-9]{24}$/),
  originalUrl: OriginalUrlSchema.nullable(),
  title: editorialText(200),
  licenseNote: editorialText(300).nullable(),
});
export const ResearchBundleSchema = z
  .strictObject({
    schemaVersion: z.literal('1.0.0'),
    bundleId: z.string().regex(/^research-[a-f0-9]{24}$/),
    createdAt: z.iso.datetime(),
    instructions: ResearchInstructionsSchema,
    sources: z.array(ResearchSourceSchema).min(1).max(50),
    assignments: z.array(AssignmentSchema).min(1).max(50),
    limits: BundleLimitsSchema,
    usage: z.strictObject({
      totalBytes: z.int().positive().max(8388608),
      requests: z.int().nonnegative().max(300),
    }),
    bundleSha256: ShaSchema,
    trust: z.literal('untrusted_reference'),
    contextBlocked: z.literal(true),
  })
  .superRefine((b, ctx) => {
    if (
      new Set(b.sources.map((s) => s.sourceId)).size !== b.sources.length ||
      new Set(b.assignments.map((a) => a.inputId)).size !==
        b.assignments.length ||
      b.assignments.length > b.limits.maxSources
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate identities or source count exceeds limit',
      });
    if (
      b.assignments.some(
        (a) => !b.sources.some((s) => s.sourceId === a.sourceId),
      ) ||
      b.sources.some(
        (s) => !b.assignments.some((a) => a.sourceId === s.sourceId),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Bundle source mappings are incomplete',
      });
    if (
      b.usage.totalBytes > b.limits.maxTotalBytes ||
      b.usage.requests > b.limits.maxRequests ||
      b.sources.reduce((n, s) => n + s.bytes, 0) > b.usage.totalBytes ||
      b.sources.some((s) => s.bytes > b.limits.perSource.maxBytes)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Bundle aggregate limits/usage invalid',
      });
    const hash = bundleDigest(b);
    if (
      b.bundleSha256 !== hash ||
      b.bundleId !== `research-${hash.slice(0, 24)}`
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Bundle identity/hash does not match its contents',
      });
  });
export type ResearchBundle = z.infer<typeof ResearchBundleSchema>;
export function bundleDigest(
  b: Omit<ResearchBundle, 'bundleId' | 'bundleSha256'>,
) {
  // Explicit field order, independent of input JSON key order.
  return digest(
    JSON.stringify({
      schemaVersion: b.schemaVersion,
      createdAt: b.createdAt,
      instructions: b.instructions,
      sources: b.sources,
      assignments: b.assignments,
      limits: b.limits,
      usage: b.usage,
      trust: b.trust,
      contextBlocked: b.contextBlocked,
    }),
  );
}
export async function ingestResearchBundle(
  input: unknown,
  deps: SourceDependencies = {},
): Promise<ResearchBundle> {
  const started = performance.now();
  const b = ResearchBundleInputSchema.parse(input); // Validate *all* approvals/URLs before any I/O.
  const controller = new AbortController();
  const signal = deps.signal
    ? AbortSignal.any([controller.signal, deps.signal])
    : controller.signal;
  const timer = setTimeout(
    () => controller.abort(),
    Math.max(0, b.limits.timeoutMs - (performance.now() - started)),
  );
  const usage = { totalBytes: 0, requests: 0 };
  const deadline = () => {
    if (performance.now() - started >= b.limits.timeoutMs) controller.abort();
    signal.throwIfAborted();
  };
  const account = (n: number) => {
    usage.totalBytes += n;
    if (usage.totalBytes > b.limits.maxTotalBytes)
      throw new SourceError(
        'BUNDLE_BYTES',
        'Research bundle exceeded its aggregate byte limit',
      );
  };
  const sources: ResearchSource[] = [];
  const assignments: z.infer<typeof AssignmentSchema>[] = [];
  const seen = new Map<string, ResearchSource>();
  let activeInputId = 'bundle';
  try {
    for (const entry of b.sources) {
      activeInputId = entry.inputId;
      deadline();
      const limits = {
        maxBytes: Math.min(
          b.limits.perSource.maxBytes,
          entry.limits?.maxBytes ?? b.limits.perSource.maxBytes,
        ),
        timeoutMs: Math.min(
          b.limits.perSource.timeoutMs,
          entry.limits?.timeoutMs ?? b.limits.perSource.timeoutMs,
        ),
        maxRedirects: Math.min(
          b.limits.perSource.maxRedirects,
          entry.limits?.maxRedirects ?? b.limits.perSource.maxRedirects,
        ),
      };
      const originalUrl =
        entry.kind === 'url' ? (entry.url.split('#')[0] ?? '') : null;
      // Match fetch policy as well as selection: dedup must not broaden redirect approval/limits.
      const key = JSON.stringify({
        kind: entry.kind,
        content:
          entry.kind === 'url'
            ? canonicalUrl(entry.url).href
            : digest(entry.text),
        sections: entry.sections ?? [],
        allowedHosts:
          entry.kind === 'url' ? [...entry.allowedHosts].sort() : [],
        limits,
      });
      let source = seen.get(key);
      if (!source) {
        const provenance = {
          method: entry.kind === 'url' ? 'http_fetch' : 'manual_paste',
          title: entry.title,
          licenseNote: entry.licenseNote,
        };
        if (entry.kind === 'url') {
          const snapshot = await ingestSource(
            entry.url,
            {
              publicConfirmed: true,
              allowedHosts: entry.allowedHosts,
              limits,
              ...(entry.sections ? { sections: entry.sections } : {}),
            },
            {
              ...deps,
              signal,
              request: async (job) => {
                deadline();
                if (++usage.requests > b.limits.maxRequests)
                  throw new SourceError(
                    'BUNDLE_REQUESTS',
                    'Research bundle exceeded its request/redirect budget',
                  );
                let observed = 0;
                const remaining = b.limits.maxTotalBytes - usage.totalBytes;
                if (remaining <= 0)
                  throw new SourceError(
                    'BUNDLE_BYTES',
                    'Research bundle byte budget is exhausted',
                  );
                try {
                  const res = await (deps.request ?? requestDocument)({
                    ...job,
                    limits: {
                      ...job.limits,
                      maxBytes: Math.min(job.limits.maxBytes, remaining),
                    },
                    onBytes: (n) => {
                      observed += n;
                      account(n);
                    },
                  });
                  // Trusted mock transports may return buffers without emitting streamed-byte events.
                  if (res.body.length > observed)
                    account(res.body.length - observed);
                  return res;
                } catch (error) {
                  if (
                    error instanceof SourceError &&
                    error.code === 'CONTENT_TOO_LARGE' &&
                    remaining < job.limits.maxBytes
                  )
                    throw new SourceError(
                      'BUNDLE_BYTES',
                      'Source response exceeds remaining aggregate byte budget',
                    );
                  throw error;
                }
              },
            },
          );
          source = ResearchSourceSchema.parse({
            ...snapshot,
            schemaVersion: '1.1.0',
            sourceType: classifyUrl(snapshot.requestedUrl),
            originalUrl,
            provenance,
            selectedSections: snapshot.quarantineReasons.length
              ? []
              : (entry.sections ?? []),
          });
        } else {
          account(Buffer.byteLength(entry.text));
          const text = documentText(entry.text, false);
          if (!text)
            throw new SourceError(
              'TEXT_EMPTY',
              'Pasted source has no extractable text',
            );
          if (entry.sections?.some((section) => !text.includes(section)))
            throw new SourceError(
              'EXCERPT_NOT_FOUND',
              'Selected literal section was not found in pasted text',
            );
          const quarantineReasons = [
            ...new Set([...assessText(entry.text), ...assessText(text)]),
          ];
          const excerpt = quarantineReasons.length
            ? null
            : entry.sections
              ? entry.sections.join('\n\n')
              : text.slice(0, 1200);
          const contentSha256 = digest(entry.text);
          source = ResearchSourceSchema.parse({
            schemaVersion: '1.1.0',
            sourceId: sourceId('pasted_text', contentSha256, excerpt),
            sourceType: 'pasted_text',
            originalUrl: null,
            requestedUrl: null,
            canonicalUrl: null,
            origin: null,
            resolvedAddress: null,
            retrievedAt: (deps.now?.() ?? new Date()).toISOString(),
            contentSha256,
            bytes: Buffer.byteLength(entry.text),
            mediaType: 'text/plain',
            excerpt,
            excerptTruncated: !entry.sections && text.length > 1200,
            revision: { commit: null, etagSha256: null, lastModified: null },
            licenseSignals: licenseSignals(text),
            reusePermission: 'not_granted',
            trust: 'untrusted_reference',
            contextBlocked: true,
            quarantineReasons,
            redirects: [],
            authentication: 'none',
            publicConfirmed: true,
            provenance,
            selectedSections: quarantineReasons.length
              ? []
              : (entry.sections ?? []),
          });
        }
        deadline();
        // Different approved URLs may converge through redirects; retain every input mapping.
        source = sources.find((s) => s.sourceId === source?.sourceId) ?? source;
        if (!sources.some((s) => s.sourceId === source?.sourceId))
          sources.push(source);
        seen.set(key, source);
      }
      assignments.push({
        inputId: entry.inputId,
        sourceId: source.sourceId,
        originalUrl,
        title: entry.title,
        licenseNote: entry.licenseNote,
      });
    }
    deadline();
    const result = {
      schemaVersion: '1.0.0' as const,
      createdAt: (deps.now?.() ?? new Date()).toISOString(),
      instructions: b.instructions,
      sources,
      assignments,
      limits: b.limits,
      usage,
      trust: 'untrusted_reference' as const,
      contextBlocked: true as const,
    };
    const hash = bundleDigest(result);
    return ResearchBundleSchema.parse({
      ...result,
      bundleId: `research-${hash.slice(0, 24)}`,
      bundleSha256: hash,
    });
  } catch (error) {
    if (controller.signal.aborted)
      throw new SourceError(
        'BUNDLE_TIMEOUT',
        'Research bundle total deadline exceeded; no further sources were fetched',
      );
    if (deps.signal?.aborted)
      throw new SourceError('BUNDLE_ABORTED', 'Research bundle was cancelled');
    // Do not echo source text, URLs or third-party errors.
    if (error instanceof SourceError)
      throw new SourceError(
        error.code,
        `${error.message} (source inputId: ${activeInputId})`,
      );
    if (error instanceof z.ZodError) throw error;
    throw new SourceError(
      'BUNDLE_FAILED',
      'Research bundle failed; no completed bundle was saved',
    );
  } finally {
    clearTimeout(timer);
  }
}
