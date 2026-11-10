import { readFile } from 'node:fs/promises';
import {
  ingestSource,
  type SourceDependencies,
} from '../../src/sources/ingest.ts';
import type { FetchResponse } from '../../src/sources/transport.ts';
export const url = 'https://docs.example.org/http';
export const now = new Date('2026-11-10T09:00:00.000Z');
export const publicAddress = { address: '93.184.216.34', family: 4 as const };
export const response = (
  body = 'HTTP uses a request-response model.',
  headers: Record<string, string> = {},
): FetchResponse => ({
  status: 200,
  headers: { 'content-type': 'text/plain; charset=utf-8', ...headers },
  body: Buffer.from(body),
});
export const dependencies = (
  overrides: SourceDependencies = {},
): SourceDependencies => ({
  resolve: async () => [publicAddress],
  request: async () => response(),
  now: () => now,
  ...overrides,
});
export const fixture = (name: string) =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
export async function snapshot() {
  return ingestSource(
    url,
    { publicConfirmed: true },
    dependencies({
      request: async () =>
        response(await fixture('http.html'), { 'content-type': 'text/html' }),
    }),
  );
}
export const hasCode = (code: string) => (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === code;
