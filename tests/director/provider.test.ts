import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { generateDraft, makeRequest } from '../../src/director/core.ts';
import {
  DeepSeekConfigSchema,
  DeepSeekProvider,
} from '../../src/llm/deepseek.ts';
import { fixture } from '../helpers/fixture.ts';
import { researchFixture } from './helpers.ts';

const key = 'SYNTHETIC_DEEPSEEK_CREDENTIAL';
const config = {
  model: 'model-fixture',
  maxApiUsd: 0.1,
  inputUsdPerMillion: 1,
  outputUsdPerMillion: 1,
  pricingReviewedAt: '2026-11-10T12:00:00Z',
  maxOutputTokens: 512,
  retries: 0,
  timeoutMs: 50,
};
const request = {
  system: 'Return JSON only.',
  data: { topic: 'HTTP' },
  signal: new AbortController().signal,
};
const completion = (content = '{"ok":true}') => ({
  status: 200,
  retryAfter: undefined,
  body: JSON.stringify({
    model: 'resolved-fixture-model',
    choices: [{ finish_reason: 'stop', message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 20 },
  }),
});
const code = (value: string) => (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === value;
test('DeepSeek requires explicit paid authorization and credentials; configuration has no key field', () => {
  assert.throws(
    () => new DeepSeekProvider(config, { allowPaid: false, env: {} }),
    code('PAID_OPT_IN_REQUIRED'),
  );
  assert.throws(
    () => new DeepSeekProvider(config, { allowPaid: true, env: {} }),
    code('MISSING_CREDENTIALS'),
  );
  assert.equal(
    DeepSeekConfigSchema.safeParse({ ...config, apiKey: key }).success,
    false,
  );
  for (const endpoint of [
    'http://api.deepseek.com/chat/completions',
    'https://user:password@api.deepseek.com/x',
    'https://api.deepseek.com/x?token=y',
    'https://127.0.0.1/x',
  ])
    assert.equal(
      DeepSeekConfigSchema.safeParse({ ...config, endpoint }).success,
      false,
    );
});
test('DeepSeek request uses fixed roles, JSON output, disabled tools/thinking, and reports sanitized usage/model', async () => {
  const provider = new DeepSeekProvider(config, {
    allowPaid: true,
    env: { DEEPSEEK_API_KEY: key },
    transport: async (job) => {
      assert.equal(job.headers.Authorization, `Bearer ${key}`);
      const body = JSON.parse(job.body);
      assert.equal(body.response_format.type, 'json_object');
      assert.equal(body.thinking.type, 'disabled');
      assert.ok(!('tools' in body));
      assert.deepEqual(
        body.messages.map((m: { role: string }) => m.role),
        ['system', 'user'],
      );
      assert.ok(!job.body.includes(key));
      return completion();
    },
  });
  const result = await provider.generate(request);
  assert.equal(result.model, 'resolved-fixture-model');
  assert.equal(provider.accounting()[0]?.inputTokens, 10);
  assert.ok(!JSON.stringify(provider).includes(key));
  assert.ok(!JSON.stringify(provider.accounting()).includes(key));
});
test('429 retries are bounded, reserve uncertain charges and stop after retry exhaustion', async () => {
  let calls = 0;
  const provider = new DeepSeekProvider(
    { ...config, retries: 1 },
    {
      allowPaid: true,
      env: { DEEPSEEK_API_KEY: key },
      transport: async () =>
        ++calls === 1
          ? { status: 429, retryAfter: '0', body: 'not logged' }
          : completion(),
    },
  );
  await provider.generate(request);
  assert.equal(calls, 2);
  assert.equal(provider.accounting()[0]?.outcome, 'uncertain');
  assert.equal(provider.accounting()[1]?.outcome, 'success');
  const exhausted = new DeepSeekProvider(config, {
    allowPaid: true,
    env: { DEEPSEEK_API_KEY: key },
    transport: async () => ({ status: 429, retryAfter: undefined, body: key }),
  });
  await assert.rejects(
    exhausted.generate(request),
    code('PROVIDER_RATE_LIMIT'),
  );
  assert.equal(exhausted.accounting().length, 1);
});
test('timeout and cancellation report failure without logging provider content or credentials', async () => {
  const provider = new DeepSeekProvider(config, {
    allowPaid: true,
    env: { DEEPSEEK_API_KEY: key },
    transport: async () => {
      await delay(90);
      return completion();
    },
  });
  await assert.rejects(provider.generate(request), code('PROVIDER_TIMEOUT'));
  assert.equal(provider.accounting()[0]?.outcome, 'uncertain');
  const cancel = new DeepSeekProvider(config, {
    allowPaid: true,
    env: { DEEPSEEK_API_KEY: key },
    transport: async () => {
      assert.fail('Pre-aborted call must not run');
    },
  });
  await assert.rejects(
    cancel.generate({ ...request, signal: AbortSignal.abort() }),
  );
  assert.equal(cancel.accounting().length, 0);
});
test('budget exhaustion blocks requests and repairs before transport', async () => {
  let calls = 0;
  const provider = new DeepSeekProvider(
    { ...config, maxApiUsd: 0.0000001 },
    {
      allowPaid: true,
      env: { DEEPSEEK_API_KEY: key },
      transport: async () => {
        calls++;
        return completion();
      },
    },
  );
  await assert.rejects(provider.generate(request), code('BUDGET_EXHAUSTED'));
  assert.equal(calls, 0);
  const { bundle, ledger } = await researchFixture();
  const prepared = makeRequest(bundle, ledger, undefined, fixture());
  const upper =
    Buffer.byteLength(
      JSON.stringify([
        { role: 'system', content: prepared.system },
        { role: 'user', content: JSON.stringify({ ...prepared.data }) },
      ]),
    ) + 1024;
  const oneCall = new DeepSeekProvider(
    { ...config, maxApiUsd: (upper + 512) / 1000000 },
    {
      allowPaid: true,
      env: { DEEPSEEK_API_KEY: key },
      transport: async () => {
        calls++;
        return completion('{invalid');
      },
    },
  );
  await assert.rejects(
    generateDraft(oneCall, bundle, ledger, undefined, fixture()),
    code('BUDGET_EXHAUSTED'),
  );
  assert.equal(calls, 1);
});
test('invalid/truncated/blank and credential-bearing responses cannot become drafts', async () => {
  for (const [response, expected] of [
    [completion('   '), 'PROVIDER_EMPTY'],
    [
      { status: 200, retryAfter: undefined, body: '{invalid' },
      'PROVIDER_RESPONSE',
    ],
    [completion(key), 'PROVIDER_UNSAFE'],
    [
      completion('Authorization: Bearer SYNTHETIC_TEST_ONLY_123456789'),
      'PROVIDER_UNSAFE',
    ],
    [
      {
        ...completion(),
        body: completion().body.replace('"stop"', '"length"'),
      },
      'PROVIDER_RESPONSE',
    ],
  ] as const) {
    const provider = new DeepSeekProvider(config, {
      allowPaid: true,
      env: { DEEPSEEK_API_KEY: key },
      transport: async () => response,
    });
    await assert.rejects(
      provider.generate(request),
      (error) => code(expected)(error) && !String(error).includes(key),
    );
  }
});

test('encoded credentials in envelope or nested script JSON cannot bypass output secret checks', async () => {
  const encoded = [...key]
    .map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('');
  for (const response of [
    { ...completion(key), body: completion(key).body.replace(key, encoded) },
    completion(`{"field":"${encoded}"}`),
  ]) {
    const provider = new DeepSeekProvider(config, {
      allowPaid: true,
      env: { DEEPSEEK_API_KEY: key },
      transport: async () => response,
    });
    await assert.rejects(
      provider.generate(request),
      (error) => code('PROVIDER_UNSAFE')(error) && !String(error).includes(key),
    );
  }
});
