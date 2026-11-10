import { z } from 'zod';
import {
  abortable,
  canonicalUrl,
  checkedAddresses,
  FetchLimitsSchema,
  type Resolver,
  resolveAddresses,
  SourceError,
} from './policy.ts';
import { assessText, documentText } from './safety.ts';
import {
  digest,
  SnapshotSchema,
  type SourceSnapshot,
  sourceId,
} from './snapshot.ts';
import { requestDocument, type Transport } from './transport.ts';

export const SourceOptionsSchema = z.strictObject({
  publicConfirmed: z.literal(true),
  limits: FetchLimitsSchema.default({
    maxBytes: 524288,
    timeoutMs: 10000,
    maxRedirects: 3,
  }),
  allowedHosts: z.array(z.string().min(1).max(253)).max(10).default([]),
  excerpt: z.string().trim().min(1).max(1200).optional(),
  sections: z
    .array(z.string().trim().min(1).max(1200))
    .min(1)
    .max(10)
    .optional(),
});
export interface SourceDependencies {
  resolve?: Resolver;
  request?: Transport;
  now?: () => Date;
  signal?: AbortSignal;
}
export async function ingestSource(
  rawUrl: string,
  input: unknown,
  deps: SourceDependencies = {},
): Promise<SourceSnapshot> {
  const options = SourceOptionsSchema.parse(input);
  if (options.excerpt && options.sections)
    throw new SourceError(
      'SELECTION_INVALID',
      'Use either excerpt or sections, not both',
    );
  const selections =
    options.sections ?? (options.excerpt ? [options.excerpt] : []);
  if (selections.join('\n\n').length > 1200)
    throw new SourceError(
      'SELECTION_INVALID',
      'Selected sections together must fit 1200 characters',
    );
  const requested = canonicalUrl(rawUrl);
  const hosts = new Set([requested.hostname]);
  for (const host of options.allowedHosts) {
    const parsed = canonicalUrl(`https://${host}/`);
    if (parsed.hostname !== host.toLowerCase() || parsed.pathname !== '/')
      throw new SourceError(
        'HOST_ALLOWLIST_INVALID',
        'Redirect allowlist entries must be bare public hostnames',
      );
    hosts.add(parsed.hostname);
  }
  if (selections.some((text) => assessText(text).length))
    throw new SourceError(
      'EXCERPT_UNSAFE',
      'Selected excerpt contains instructions, commands or credential-like text',
    );
  const started = performance.now();
  const controller = new AbortController();
  const signal = deps.signal
    ? AbortSignal.any([controller.signal, deps.signal])
    : controller.signal;
  const checkDeadline = () => {
    if (performance.now() - started >= options.limits.timeoutMs)
      controller.abort();
    signal.throwIfAborted();
  };
  const timer = setTimeout(() => controller.abort(), options.limits.timeoutMs);
  const resolve = deps.resolve ?? resolveAddresses;
  const request = deps.request ?? requestDocument;
  let current = requested;
  const redirects: string[] = [];
  try {
    while (true) {
      checkDeadline();
      const addresses = checkedAddresses(
        await abortable(resolve(current.hostname), signal),
      );
      const address = addresses[0];
      if (!address)
        throw new SourceError(
          'DNS_EMPTY',
          'No public DNS address is available',
        );
      checkDeadline();
      const response = await abortable(
        request({
          url: current,
          address,
          limits: options.limits,
          signal,
        }),
        signal,
      );
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects.length >= options.limits.maxRedirects)
          throw new SourceError(
            'REDIRECT_LIMIT',
            'Source exceeded maxRedirects',
          );
        const location = response.headers.location;
        if (!location)
          throw new SourceError(
            'REDIRECT_INVALID',
            'Redirect has no Location header',
          );
        let next: URL;
        try {
          next = canonicalUrl(new URL(location, current).href);
        } catch (error) {
          if (error instanceof SourceError) throw error;
          throw new SourceError('REDIRECT_INVALID', 'Invalid redirect target');
        }
        if (!hosts.has(next.hostname))
          throw new SourceError(
            'REDIRECT_HOST',
            'Redirect host requires an explicit --allow-host entry',
          );
        if (current.protocol === 'https:' && next.protocol === 'http:')
          throw new SourceError(
            'REDIRECT_DOWNGRADE',
            'HTTPS-to-HTTP redirect is not allowed',
          );
        if (next.href === requested.href || redirects.includes(next.href))
          throw new SourceError(
            'REDIRECT_LOOP',
            'Source redirect loop detected',
          );
        redirects.push(next.href);
        current = next;
        continue;
      }
      if (response.status !== 200)
        throw new SourceError(
          'HTTP_STATUS',
          `Public document returned HTTP ${response.status}; authentication/login/retry is not attempted`,
        );
      const declared = response.headers['content-length'];
      if (
        declared !== undefined &&
        (!/^\d+$/.test(declared) || Number(declared) > options.limits.maxBytes)
      )
        throw new SourceError(
          'CONTENT_TOO_LARGE',
          'Content-Length exceeds the bounded source limit or is invalid',
        );
      if (response.body.length > options.limits.maxBytes)
        throw new SourceError('CONTENT_TOO_LARGE', 'Source exceeds maxBytes');
      if (
        !response.body.length ||
        (declared !== undefined && response.body.length !== Number(declared))
      )
        throw new SourceError(
          'BODY_INCOMPLETE',
          'Source is empty or differs from its declared byte count',
        );
      if (
        response.headers['content-encoding'] &&
        response.headers['content-encoding'] !== 'identity'
      )
        throw new SourceError(
          'CONTENT_ENCODING',
          'Only identity-encoded source text is accepted',
        );
      const type = response.headers['content-type'] ?? '';
      const media = type.split(';')[0]?.trim().toLowerCase();
      if (
        ![
          'text/html',
          'application/xhtml+xml',
          'text/plain',
          'text/markdown',
        ].includes(media ?? '') ||
        /charset\s*=\s*["']?(?!utf-8\b|us-ascii\b)[\w-]+/i.test(type)
      )
        throw new SourceError(
          'CONTENT_TYPE',
          'Only UTF-8 HTML/plain/Markdown public documents are supported',
        );
      let raw: string;
      try {
        raw = new TextDecoder('utf-8', { fatal: true }).decode(response.body);
      } catch {
        throw new SourceError('TEXT_ENCODING', 'Source is not valid UTF-8');
      }
      const text = documentText(
        raw,
        media === 'text/html' || media === 'application/xhtml+xml',
      );
      if (!text)
        throw new SourceError(
          'TEXT_EMPTY',
          'Source has no extractable document text',
        );
      const reasons = [...new Set([...assessText(raw), ...assessText(text)])];
      if (selections.some((selection) => !text.includes(selection)))
        throw new SourceError(
          'EXCERPT_NOT_FOUND',
          'Selected literal excerpt was not found in the retrieved document',
        );
      const excerpt = reasons.length
        ? null
        : selections.length
          ? selections.join('\n\n')
          : text.slice(0, 1200);
      const contentSha256 = digest(response.body);
      const parts = current.pathname.split('/').filter(Boolean);
      const commit =
        (current.hostname === 'raw.githubusercontent.com'
          ? parts[2]
          : current.hostname === 'github.com' && parts[2] === 'blob'
            ? parts[3]
            : null) ?? null;
      const modified = response.headers['last-modified'];
      const date = modified ? new Date(modified) : null;
      checkDeadline();
      return SnapshotSchema.parse({
        schemaVersion: '1.0.0',
        sourceId: sourceId(current.href, contentSha256, excerpt),
        requestedUrl: requested.href,
        canonicalUrl: current.href,
        origin: current.origin,
        retrievedAt: (deps.now?.() ?? new Date()).toISOString(),
        contentSha256,
        bytes: response.body.length,
        mediaType: media,
        excerpt,
        excerptTruncated: !selections.length && text.length > 1200,
        revision: {
          commit: commit && /^[a-f0-9]{40}$/.test(commit) ? commit : null,
          etagSha256: response.headers.etag
            ? digest(response.headers.etag)
            : null,
          lastModified:
            date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
        },
        licenseSignals: licenseSignals(text),
        reusePermission: 'not_granted',
        trust: 'untrusted_reference',
        contextBlocked: true,
        quarantineReasons: reasons,
        resolvedAddress: address.address,
        redirects,
        authentication: 'none',
        publicConfirmed: true,
      });
    }
  } catch (error) {
    if (deps.signal?.aborted)
      throw new SourceError(
        'FETCH_ABORTED',
        'Source operation cancelled by its research bundle',
      );
    if (controller.signal.aborted)
      throw new SourceError(
        'FETCH_TIMEOUT',
        'Total source DNS/redirect/body deadline exceeded',
      );
    if (error instanceof SourceError || error instanceof z.ZodError)
      throw error;
    throw new SourceError(
      'FETCH_FAILED',
      'Public source request failed; check DNS, TLS, connectivity and configured limits',
    );
  } finally {
    clearTimeout(timer);
  }
}

export function licenseSignals(text: string): SourceSnapshot['licenseSignals'] {
  const licenseSignals: SourceSnapshot['licenseSignals'] = [];
  for (const [pattern, label] of [
    [/\bMIT License\b/i, 'mentions:MIT'],
    [
      /\bApache[ -](?:License[ ,]*(?:Version )?)?2\.0\b/i,
      'mentions:Apache-2.0',
    ],
    [/\bCC0\b/i, 'mentions:CC0'],
    [/\bCC[ -]BY\b/i, 'mentions:CC-BY'],
    [/\bGNU General Public License\b|\bGPL-[23]\.0\b/i, 'mentions:GPL'],
  ] as const)
    if (pattern.test(text)) licenseSignals.push(label);
  return licenseSignals;
}
