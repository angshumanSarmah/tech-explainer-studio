import { request } from 'node:https';
import {
  abortable,
  checkedAddresses,
  resolveAddresses,
} from '../sources/policy.ts';
import { pinnedOptions } from '../sources/transport.ts';
import { LLMError } from './provider.ts';
export interface PostRequest {
  endpoint: URL;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
}
export interface PostResponse {
  status: number;
  retryAfter: string | undefined;
  body: string;
}
export type LLMTransport = (input: PostRequest) => Promise<PostResponse>;
export const postJson: LLMTransport = async (input) => {
  const rows = checkedAddresses(
    await abortable(resolveAddresses(input.endpoint.hostname), input.signal),
  );
  const address = rows[0];
  if (!address) throw new LLMError('DNS_FAILED', 'No public provider address');
  input.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const req = request(
      input.endpoint,
      {
        ...pinnedOptions({
          url: input.endpoint,
          address,
          limits: { maxBytes: 2097152, timeoutMs: 30000, maxRedirects: 0 },
          signal: input.signal,
        }),
        method: 'POST',
        headers: input.headers,
      },
      (res) => {
        if (
          res.headers['content-encoding'] &&
          res.headers['content-encoding'] !== 'identity'
        ) {
          res.destroy();
          reject(
            new LLMError(
              'PROVIDER_ENCODING',
              'Provider returned unsupported compressed content',
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 2097152) {
            res.destroy();
            reject(
              new LLMError('PROVIDER_SIZE', 'Provider response exceeded 2 MiB'),
            );
          } else chunks.push(chunk);
        });
        res.once('aborted', () =>
          reject(
            new LLMError(
              'PROVIDER_TRUNCATED',
              'Provider response was truncated',
            ),
          ),
        );
        res.once('error', reject);
        res.once('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            retryAfter:
              typeof res.headers['retry-after'] === 'string'
                ? res.headers['retry-after']
                : undefined,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.once('error', reject);
    req.end(input.body);
  });
};
