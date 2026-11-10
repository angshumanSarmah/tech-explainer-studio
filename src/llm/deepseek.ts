import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { abortable, canonicalUrl } from '../sources/policy.ts';
import { editorialText } from '../sources/research-source.ts';
import { hasCredentialLikeText, hasUnsafeJson } from '../sources/safety.ts';
import {
  type CostPolicy,
  type GenerationRequest,
  LLMError,
  type LLMProvider,
  type UsageEntry,
} from './provider.ts';
import { type LLMTransport, postJson } from './transport.ts';
export const DeepSeekConfigSchema = z.strictObject({
  model: editorialText(100),
  endpoint: z
    .string()
    .max(2048)
    .default('https://api.deepseek.com/chat/completions')
    .refine((value) => {
      try {
        const url = canonicalUrl(value);
        return url.protocol === 'https:' && !new URL(value).hash;
      } catch {
        return false;
      }
    }, 'Use a credential-free public HTTPS provider endpoint'),
  timeoutMs: z.int().min(50).max(120000).default(30000),
  retries: z.int().min(0).max(2).default(1),
  maxOutputTokens: z.int().min(128).max(16384).default(8192),
  maxApiUsd: z.number().positive().max(10),
  inputUsdPerMillion: z.number().positive().max(1000),
  outputUsdPerMillion: z.number().positive().max(1000),
  pricingReviewedAt: z.iso.datetime(),
});
const CompletionSchema = z.object({
  model: z.string().min(1).max(200),
  choices: z
    .array(
      z.object({
        finish_reason: z.literal('stop'),
        message: z.object({
          content: z.string().min(1).max(2097152),
          tool_calls: z.never().optional(),
        }),
      }),
    )
    .length(1),
  usage: z.object({
    prompt_tokens: z.int().nonnegative(),
    completion_tokens: z.int().nonnegative(),
  }),
});
export class DeepSeekProvider implements LLMProvider {
  readonly id = 'deepseek' as const;
  readonly model: string;
  readonly budget: CostPolicy;
  #config: z.infer<typeof DeepSeekConfigSchema>;
  #key: string;
  #transport: LLMTransport;
  #usage: UsageEntry[] = [];
  #attempts = 0;
  constructor(
    input: unknown,
    options: {
      allowPaid: boolean;
      env?: Record<string, string | undefined>;
      transport?: LLMTransport;
    },
  ) {
    this.#config = DeepSeekConfigSchema.parse(input);
    this.model = this.#config.model;
    this.budget = Object.freeze({
      maxApiUsd: this.#config.maxApiUsd,
      inputUsdPerMillion: this.#config.inputUsdPerMillion,
      outputUsdPerMillion: this.#config.outputUsdPerMillion,
      pricingReviewedAt: this.#config.pricingReviewedAt,
    });
    if (!options.allowPaid)
      throw new LLMError(
        'PAID_OPT_IN_REQUIRED',
        'Real DeepSeek requires --allow-paid with an explicit max-api-usd cap',
      );
    const key = (options.env ?? process.env).DEEPSEEK_API_KEY;
    if (!key || /\s/.test(key))
      throw new LLMError(
        'MISSING_CREDENTIALS',
        'Set DEEPSEEK_API_KEY only when selecting real DeepSeek generation',
      );
    this.#key = key;
    this.#transport = options.transport ?? postJson;
  }
  accounting() {
    return this.#usage.map((item) => ({ ...item }));
  }
  async generate(input: GenerationRequest) {
    const c = this.#config;
    const messages = [
      { role: 'system', content: input.system },
      { role: 'user', content: JSON.stringify(input.data) },
    ];
    const messageBytes = Buffer.byteLength(JSON.stringify(messages));
    if (messageBytes > 131072 || JSON.stringify(messages).includes(this.#key))
      throw new LLMError(
        'REQUEST_UNSAFE',
        'Request too large or contains the provider credential',
      );
    // Byte count plus framing allowance is a conservative tokenizer-independent estimate,
    // not a provider billing guarantee. Reserve full output including each uncertain retry.
    const inputUpper = messageBytes + 1024;
    const reserve =
      (inputUpper * c.inputUsdPerMillion +
        c.maxOutputTokens * c.outputUsdPerMillion) /
      1000000;
    for (let retry = 0; retry <= c.retries; retry++) {
      input.signal.throwIfAborted();
      const spent = this.#usage.reduce(
        (sum, item) => sum + item.estimatedUsd,
        0,
      );
      if (this.#attempts >= 6 || spent + reserve > c.maxApiUsd)
        throw new LLMError(
          'BUDGET_EXHAUSTED',
          'Budget cannot safely reserve another request or repair; estimates are not exact billing',
        );
      this.#attempts++;
      const entry: UsageEntry = {
        inputTokens: inputUpper,
        outputTokens: c.maxOutputTokens,
        estimatedUsd: reserve,
        reservedUsd: reserve,
        outcome: 'uncertain',
      };
      this.#usage.push(entry);
      const signal = AbortSignal.any([
        input.signal,
        AbortSignal.timeout(c.timeoutMs),
      ]);
      let retryMs = 250 * 2 ** retry;
      try {
        const result = await abortable(
          this.#transport({
            endpoint: new URL(c.endpoint),
            signal,
            headers: {
              Authorization: `Bearer ${this.#key}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'Accept-Encoding': 'identity',
            },
            body: JSON.stringify({
              model: c.model,
              messages,
              response_format: { type: 'json_object' },
              max_tokens: c.maxOutputTokens,
              thinking: { type: 'disabled' },
              stream: false,
              temperature: 0,
            }),
          }),
          signal,
        );
        if (result.status === 429 || result.status >= 500) {
          retryMs = Math.min(
            2000,
            Math.max(retryMs, Number(result.retryAfter) * 1000 || 0),
          );
          if (retry === c.retries)
            throw new LLMError(
              result.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_HTTP',
              'Provider retries exhausted; reserved spend retained',
            );
        } else {
          if (result.status !== 200)
            throw new LLMError(
              'PROVIDER_HTTP',
              `Provider rejected request (HTTP ${result.status}); check the configured model/endpoint/credentials; response body is not logged`,
            );
          if (
            Buffer.byteLength(result.body) > 2097152 ||
            result.body.includes(this.#key)
          )
            throw new LLMError(
              'PROVIDER_UNSAFE',
              'Provider returned excessive output or credential text',
            );
          let parsed: z.infer<typeof CompletionSchema>;
          try {
            const decoded: unknown = JSON.parse(result.body);
            if (hasUnsafeJson(decoded, this.#key))
              throw new LLMError(
                'PROVIDER_UNSAFE',
                'Provider returned credential text',
              );
            parsed = CompletionSchema.parse(decoded);
          } catch (error) {
            if (error instanceof LLMError) throw error;
            throw new LLMError(
              'PROVIDER_RESPONSE',
              'Provider returned invalid/truncated JSON, usage or tool output',
            );
          }
          const content = parsed.choices[0]?.message.content ?? '';
          if (!content.trim())
            throw new LLMError(
              'PROVIDER_EMPTY',
              'Provider JSON output was blank; no successful draft',
            );
          let decodedContent: unknown;
          try {
            decodedContent = JSON.parse(content);
          } catch {
            /* Invalid script JSON is handled by bounded Director repair. */
          }
          if (
            content.includes(this.#key) ||
            (decodedContent !== undefined &&
              hasUnsafeJson(decodedContent, this.#key))
          )
            throw new LLMError(
              'PROVIDER_UNSAFE',
              'Provider returned credential text',
            );
          if (hasCredentialLikeText(content))
            throw new LLMError(
              'PROVIDER_UNSAFE',
              'Provider output contains credential-like text',
            );
          if (
            parsed.usage.prompt_tokens > inputUpper ||
            parsed.usage.completion_tokens > c.maxOutputTokens
          )
            throw new LLMError(
              'USAGE_BOUND_EXCEEDED',
              'Provider usage exceeded reserved estimate; stop and review pricing/token assumptions',
            );
          entry.inputTokens = parsed.usage.prompt_tokens;
          entry.outputTokens = parsed.usage.completion_tokens;
          entry.estimatedUsd =
            (entry.inputTokens * c.inputUsdPerMillion +
              entry.outputTokens * c.outputUsdPerMillion) /
            1000000;
          entry.outcome = 'success';
          return { text: content, model: parsed.model };
        }
      } catch (error) {
        if (input.signal.aborted)
          throw new LLMError(
            'CANCELLED',
            'Generation cancelled; uncertain spend remains reserved',
          );
        if (error instanceof LLMError) throw error;
        if (retry === c.retries)
          throw new LLMError(
            signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK',
            'Provider request failed; uncertain spend remains reserved',
          );
      }
      try {
        await delay(retryMs, undefined, { signal: input.signal });
      } catch {
        throw new LLMError(
          'CANCELLED',
          'Generation cancelled during bounded retry delay',
        );
      }
    }
    throw new LLMError('PROVIDER_HTTP', 'No completion');
  }
}
