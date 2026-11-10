import { z } from 'zod';
export interface GenerationRequest {
  system: string;
  data: unknown;
  signal: AbortSignal;
}
export interface UsageEntry {
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  reservedUsd: number;
  outcome: 'success' | 'uncertain';
}
export interface GenerationResponse {
  text: string;
  model?: string;
}
export const CostPolicySchema = z.strictObject({
  maxApiUsd: z.number().positive(),
  inputUsdPerMillion: z.number().positive(),
  outputUsdPerMillion: z.number().positive(),
  pricingReviewedAt: z.iso.datetime(),
});
export type CostPolicy = z.infer<typeof CostPolicySchema>;
export interface LLMProvider {
  readonly budget: CostPolicy | null;
  readonly id: string;
  readonly model: string;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  accounting(): UsageEntry[];
}
export class LLMError extends Error {
  readonly code: string;
  constructor(code: string, reason: string) {
    super(reason);
    this.code = code;
  }
}
export class MockLLMProvider implements LLMProvider {
  readonly id = 'mock' as const;
  readonly budget = null;
  readonly model = 'local-fixture-v1';
  #responses: string[];
  #calls = 0;
  constructor(responses: string[]) {
    this.#responses = [...responses];
  }
  async generate(request: GenerationRequest) {
    request.signal.throwIfAborted();
    const text =
      this.#responses[Math.min(this.#calls++, this.#responses.length - 1)];
    if (text === undefined)
      throw new LLMError('MOCK_EMPTY', 'Supply a local mock response');
    return { text };
  }
  accounting(): UsageEntry[] {
    return Array.from({ length: this.#calls }, () => ({
      inputTokens: 0,
      outputTokens: 0,
      estimatedUsd: 0,
      reservedUsd: 0,
      outcome: 'success',
    }));
  }
}

export const UsageEntrySchema = z.strictObject({
  inputTokens: z.int().nonnegative(),
  outputTokens: z.int().nonnegative(),
  estimatedUsd: z.number().nonnegative(),
  reservedUsd: z.number().nonnegative(),
  outcome: z.enum(['success', 'uncertain']),
});

export const ProviderIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{0,31}$/)
  .refine((id) => id !== 'manual', 'manual is reserved for keyless imports');
