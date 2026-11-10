import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { z } from 'zod';
import { hasCredentialLikeText } from './safety.ts';

export class SourceError extends Error {
  readonly code: string;
  constructor(code: string, reason: string) {
    super(reason);
    this.name = 'SourceError';
    this.code = code;
  }
}
export const FetchLimitsSchema = z.strictObject({
  maxBytes: z.int().min(256).max(2097152).default(524288),
  timeoutMs: z.int().min(50).max(30000).default(10000),
  maxRedirects: z.int().min(0).max(5).default(3),
});
export const FetchLimitOverridesSchema = z.strictObject({
  maxBytes: FetchLimitsSchema.shape.maxBytes.removeDefault().optional(),
  timeoutMs: FetchLimitsSchema.shape.timeoutMs.removeDefault().optional(),
  maxRedirects: FetchLimitsSchema.shape.maxRedirects.removeDefault().optional(),
});
export type FetchLimits = z.infer<typeof FetchLimitsSchema>;
const denied4 = new BlockList();
for (const [ip, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  denied4.addSubnet(ip, prefix, 'ipv4');
const global6 = new BlockList();
global6.addSubnet('2000::', 3, 'ipv6');
const denied6 = new BlockList();
for (const [ip, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3ffe::', 16],
  ['3fff::', 20],
] as const)
  denied6.addSubnet(ip, prefix, 'ipv6');
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !denied4.check(address, 'ipv4');
  if (family === 6)
    return global6.check(address, 'ipv6') && !denied6.check(address, 'ipv6');
  return false;
}
export function canonicalUrl(raw: string): URL {
  if (raw.length > 2048 || /[\s\\]|\p{Cc}/u.test(raw))
    throw new SourceError(
      'URL_INVALID',
      'Use an absolute HTTP(S) document URL without whitespace or backslashes',
    );
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SourceError(
      'URL_INVALID',
      'Use an absolute HTTP(S) document URL',
    );
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.port
  )
    throw new SourceError(
      'URL_POLICY',
      'Only HTTP(S), default ports and credential/query-free document URLs are supported',
    );
  const host = url.hostname.toLowerCase();
  if (
    host.endsWith('.') ||
    isIP(host.replace(/^\[|\]$/g, '')) ||
    !host.includes('.') ||
    /(?:^|\.)(?:localhost|local|internal|lan|home|onion|test|invalid|example)$/i.test(
      host,
    ) ||
    host.endsWith('.atlassian.net') ||
    host.startsWith('jira.') ||
    host.endsWith('.sharepoint.com')
  )
    throw new SourceError(
      'HOST_BLOCKED',
      'Use a public documentation hostname; IP literals and local/private-service hostnames are not supported',
    );
  const decodedPath = decodeURIComponentSafe(url.pathname);
  if (
    hasCredentialLikeText(decodedPath) ||
    /(?:sk-[\w-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|(?:token|password|secret|api[_-]?key)[=:])/i.test(
      decodedPath,
    )
  )
    throw new SourceError(
      'URL_SECRET',
      'Credential-like URL content is not allowed',
    );
  url.hash = '';
  url.search = '';
  return url;
}
function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new SourceError(
      'URL_INVALID',
      'URL contains invalid percent encoding',
    );
  }
}
export type Address = { address: string; family: 4 | 6 };
export type Resolver = (hostname: string) => Promise<Address[]>;
export const resolveAddresses: Resolver = async (hostname) => {
  const rows = await lookup(hostname, { all: true, verbatim: true });
  return rows.map((row) => ({
    address: row.address,
    family: row.family === 6 ? 6 : 4,
  }));
};
export function checkedAddresses(rows: Address[]): Address[] {
  if (
    !rows.length ||
    rows.length > 32 ||
    rows.some(
      (row) =>
        !isPublicAddress(row.address) || isIP(row.address) !== row.family,
    )
  )
    throw new SourceError(
      'ADDRESS_BLOCKED',
      'DNS must resolve exclusively to bounded public unicast addresses; private/special ranges are blocked',
    );
  return rows
    .map((row) => ({ ...row, address: normalizedAddress(row.address) }))
    .sort((a, b) => a.family - b.family);
}
export async function abortable<T>(
  task: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(
        new SourceError(
          'FETCH_TIMEOUT',
          'Source operation exceeded the total DNS/redirect/body deadline',
        ),
      );
    signal.addEventListener('abort', abort, { once: true });
    task
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}

export function normalizedAddress(address: string) {
  if (isIP(address) !== 6) return address;
  try {
    return new URL(`http://[${address}]/`).hostname.slice(1, -1);
  } catch {
    return address;
  }
}
