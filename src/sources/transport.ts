import {
  type ClientRequest,
  request as httpRequest,
  type IncomingMessage,
  type RequestOptions,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { Address, FetchLimits } from './policy.ts';
import { normalizedAddress, SourceError } from './policy.ts';

export interface FetchResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}
export interface RequestJob {
  url: URL;
  address: Address;
  limits: FetchLimits;
  signal: AbortSignal;
  onBytes?: (bytes: number) => void;
}
export type Transport = (job: RequestJob) => Promise<FetchResponse>;
export function pinnedOptions(job: RequestJob) {
  return {
    method: 'GET',
    agent: false as const,
    family: job.address.family,
    autoSelectFamily: false,
    maxHeaderSize: 16384,
    signal: job.signal,
    headers: {
      Accept: 'text/html, text/plain, text/markdown, application/xhtml+xml',
      'Accept-Encoding': 'identity',
      'User-Agent': 'TechExplainerStudio/0.1 source-review',
    },
    lookup: (
      _host: string,
      options: { all?: boolean | undefined },
      callback: (
        error: NodeJS.ErrnoException | null,
        address: string | Address[],
        family?: number,
      ) => void,
    ) => {
      if (options.all) callback(null, [job.address]);
      else callback(null, job.address.address, job.address.family);
    },
  };
}
export type RequestFactory = (
  url: URL,
  options: RequestOptions,
  listener: (response: IncomingMessage) => void,
) => ClientRequest;
export function createTransport(factory?: RequestFactory): Transport {
  return (job) =>
    new Promise((resolve, reject) => {
      const request =
        factory ?? (job.url.protocol === 'https:' ? httpsRequest : httpRequest);
      const req = request(job.url, pinnedOptions(job), (res) => {
        const headers: Record<string, string> = {};
        for (const key of [
          'location',
          'content-type',
          'content-length',
          'content-encoding',
          'etag',
          'last-modified',
        ]) {
          const value = res.headers[key];
          if (typeof value === 'string') headers[key] = value;
        }
        const status = res.statusCode ?? 0;
        if (status !== 200) {
          resolve({ status, headers, body: Buffer.alloc(0) });
          res.destroy();
          return;
        }
        const declared = headers['content-length'];
        if (
          declared !== undefined &&
          (!/^\d+$/.test(declared) || Number(declared) > job.limits.maxBytes)
        ) {
          reject(
            new SourceError(
              'CONTENT_TOO_LARGE',
              'Source Content-Length exceeds maxBytes or is invalid',
            ),
          );
          res.destroy();
          return;
        }
        if (
          headers['content-encoding'] &&
          headers['content-encoding'] !== 'identity'
        ) {
          reject(
            new SourceError(
              'CONTENT_ENCODING',
              'Compressed source responses are not accepted; identity encoding is required',
            ),
          );
          res.destroy();
          return;
        }
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          try {
            job.onBytes?.(chunk.length);
          } catch (error) {
            reject(error);
            res.destroy();
            return;
          }
          bytes += chunk.length;
          if (bytes > job.limits.maxBytes) {
            reject(
              new SourceError(
                'CONTENT_TOO_LARGE',
                'Streaming source exceeded maxBytes',
              ),
            );
            res.destroy();
          } else chunks.push(chunk);
        });
        res.once('error', reject);
        res.once('aborted', () =>
          reject(
            new SourceError('BODY_INCOMPLETE', 'Source response was truncated'),
          ),
        );
        res.once('end', () => {
          if (declared !== undefined && bytes !== Number(declared)) {
            reject(
              new SourceError(
                'BODY_INCOMPLETE',
                'Source byte count differs from Content-Length',
              ),
            );
            return;
          }
          resolve({ status, headers, body: Buffer.concat(chunks) });
        });
      });
      req.once('socket', (socket) => {
        socket.once('connect', () => {
          const peer = socket.remoteAddress;
          // IPv4 sockets may be presented as IPv4-mapped addresses by the OS.
          const actual = peer
            ? normalizedAddress(peer.replace(/^::ffff:/i, ''))
            : undefined;
          if (!actual || actual !== normalizedAddress(job.address.address))
            req.destroy(
              new SourceError(
                'PEER_MISMATCH',
                'Connected peer differs from the validated pinned IP',
              ),
            );
        });
      });
      req.once('error', reject);
      req.end();
    });
}
export const requestDocument = createTransport();
