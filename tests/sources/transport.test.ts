import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { FetchLimitsSchema } from '../../src/sources/policy.ts';
import {
  createTransport,
  pinnedOptions,
  type RequestFactory,
  type RequestJob,
} from '../../src/sources/transport.ts';
import { hasCode, publicAddress, url } from './helpers.ts';

const job = (): RequestJob => ({
  url: new URL(url),
  address: publicAddress,
  limits: FetchLimitsSchema.parse({ maxBytes: 256 }),
  signal: new AbortController().signal,
});
function fakeFactory(
  headers: Record<string, string> = {},
  chunks: Buffer[] = [Buffer.from('HTTP')],
  peer = publicAddress.address,
  status = 200,
): RequestFactory {
  return (_url, options, listener) => {
    assert.equal(options.agent, false);
    assert.equal(options.family, 4);
    let destroyed = false;
    const req = Object.assign(new EventEmitter(), {
      destroy(error: Error) {
        destroyed = true;
        req.emit('error', error);
        return req;
      },
      end() {
        queueMicrotask(() => {
          const socket = Object.assign(new EventEmitter(), {
            remoteAddress: peer,
          });
          req.emit('socket', socket);
          socket.emit('connect');
          if (destroyed) return;
          const res = Object.assign(Readable.from(chunks), {
            headers,
            statusCode: status,
          });
          listener(res as IncomingMessage);
        });
        return req;
      },
    });
    return req as ClientRequest;
  };
}
test('native request pins validated DNS address and emits only fixed unauthenticated headers', () => {
  const options = pinnedOptions(job());
  assert.equal(options.agent, false);
  assert.equal(options.autoSelectFamily, false);
  assert.equal(options.maxHeaderSize, 16384);
  assert.deepEqual(Object.keys(options.headers).sort(), [
    'Accept',
    'Accept-Encoding',
    'User-Agent',
  ]);
  options.lookup('untrusted-host', { all: true }, (err, address) => {
    assert.equal(err, null);
    assert.deepEqual(address, [publicAddress]);
  });
  options.lookup('untrusted-host', {}, (err, address, family) => {
    assert.equal(err, null);
    assert.equal(address, publicAddress.address);
    assert.equal(family, 4);
  });
});
test('native bounded stream collects valid bytes and accepts IPv4 mapped socket representation', async () => {
  const result = await createTransport(
    fakeFactory(
      { 'content-length': '4' },
      [Buffer.from('HT'), Buffer.from('TP')],
      '::ffff:93.184.216.34',
    ),
  )(job());
  assert.equal(result.body.toString(), 'HTTP');
});
test('native stream rejects peer mismatch before accepting a response', async () => {
  await assert.rejects(
    createTransport(fakeFactory({}, undefined, '127.0.0.1'))(job()),
    hasCode('PEER_MISMATCH'),
  );
});
test('native streaming and declared byte limits, compression and truncation fail', async () => {
  for (const [headers, chunks, code] of [
    [{ 'content-length': '257' }, [Buffer.from('x')], 'CONTENT_TOO_LARGE'],
    [{ 'content-length': 'invalid' }, [Buffer.from('x')], 'CONTENT_TOO_LARGE'],
    [{}, [Buffer.alloc(200), Buffer.alloc(200)], 'CONTENT_TOO_LARGE'],
    [{ 'content-length': '10' }, [Buffer.from('x')], 'BODY_INCOMPLETE'],
    [{ 'content-encoding': 'gzip' }, [Buffer.from('x')], 'CONTENT_ENCODING'],
  ] as [Record<string, string>, Buffer[], string][])
    await assert.rejects(
      createTransport(fakeFactory(headers, chunks))(job()),
      hasCode(code),
    );
});
test('redirect responses do not retain or consume their body as document content', async () => {
  const res = await createTransport(
    fakeFactory({ location: '/next' }, [Buffer.alloc(9999)], undefined, 302),
  )(job());
  assert.equal(res.status, 302);
  assert.equal(res.body.length, 0);
  assert.equal(res.headers.location, '/next');
});

test('native stream propagates bundle accounting failure without accepting excess chunks', async () => {
  const requestJob = job();
  let observed = 0;
  requestJob.onBytes = (n) => {
    observed += n;
    throw new Error('Test aggregate budget exhausted');
  };
  await assert.rejects(
    createTransport(fakeFactory({}, [Buffer.from('HTTP')]))(requestJob),
    /Test aggregate budget exhausted/,
  );
  assert.equal(observed, 4);
});
