import { z } from 'zod';
import { brandIdentity } from '../branding/identity.ts';
import { resolveBrand } from '../branding/profile.ts';
import {
  checkFacts,
  evidenceContext,
  LedgerSchema,
  ledgerDigest,
} from '../claims/ledger.ts';
import {
  parseVideoScriptJson,
  ScriptValidationError,
  type ValidationIssue,
} from '../domain/validation.ts';
import { VideoScriptSchema } from '../domain/videoscript.ts';
import {
  CostPolicySchema,
  LLMError,
  type LLMProvider,
  ProviderIdSchema,
  UsageEntrySchema,
} from '../llm/provider.ts';
import { ResearchBundleSchema } from '../sources/bundle.ts';
import { abortable, canonicalUrl } from '../sources/policy.ts';
import { editorialText, evidenceDigest } from '../sources/research-source.ts';
import { assessText, hasUnsafeJson } from '../sources/safety.ts';
import { digest } from '../sources/snapshot.ts';
import {
  DirectorBriefSchema,
  directorContract,
  validateStoryboard,
} from './contracts.ts';
import {
  PROMPT_VERSION,
  PROMPTS,
  promptHash,
  SYSTEM_PROMPT,
} from './prompts.ts';

export class DirectorError extends Error {
  readonly code: string;
  readonly issues: { path: string; reason: string }[];
  constructor(
    code: string,
    reason: string,
    issues: { path: string; reason: string }[] = [],
  ) {
    super(reason);
    this.code = code;
    this.issues = issues;
  }
}
export function reviewedResearch(bundleInput: unknown, ledgerInput: unknown) {
  const bundle = ResearchBundleSchema.parse(bundleInput);
  const ledger = LedgerSchema.parse(ledgerInput);
  if (checkFacts(ledger).state !== 'approved')
    throw new DirectorError(
      'FACTS_NOT_APPROVED',
      'Resolve missing, contradicted, insufficient or unreviewed claims through the existing manual ledger workflow',
    );
  if (
    ledger.research?.bundleSha256 !== bundle.bundleSha256 ||
    ledger.research.bundleId !== bundle.bundleId ||
    JSON.stringify(ledger.research.instructions) !==
      JSON.stringify(bundle.instructions) ||
    ledger.sources.length !== bundle.sources.length ||
    ledger.sources.some(
      (s) =>
        !bundle.sources.some(
          (b) =>
            b.sourceId === s.sourceId &&
            evidenceDigest(b) === evidenceDigest(s),
        ),
    )
  )
    throw new DirectorError(
      'RESEARCH_MISMATCH',
      'Ledger must bind this exact ResearchBundle, instructions and snapshots',
    );
  return { bundle, ledger, context: evidenceContext(ledger) };
}
export function makeRequest(
  bundleInput: unknown,
  ledgerInput: unknown,
  briefInput: unknown,
  example: unknown,
) {
  const research = reviewedResearch(bundleInput, ledgerInput);
  const brief = DirectorBriefSchema.parse(
    briefInput ?? research.bundle.instructions,
  );
  const { schema: _legacySchema, ...contract } = directorContract(example); // Generation needs one current schema, not duplicate legacy branches.
  const data = {
    brief,
    research: research.context,
    sourceRecords: research.bundle.sources.map((s) => ({
      source_id: s.sourceId,
      url: s.canonicalUrl,
      title: s.provenance.title,
      retrieved_at: s.retrievedAt,
      source_kind: s.sourceType,
      license_review: 'reference_only_no_reuse_grant',
      revision: s.revision.commit,
      content_sha256: s.contentSha256,
    })),
    claims: research.ledger.claims.map((c) => ({
      claim_id: c.claimId,
      text: c.text,
      source_ids: c.sourceIds,
      status: c.status,
      scope: 'Reviewed ledger scope; human script review still required',
    })),
    contract,
  };
  if (Buffer.byteLength(JSON.stringify(data)) > 98304)
    throw new DirectorError(
      'CONTEXT_LIMIT',
      'Selected research/contract exceeds 96 KiB; create a smaller reviewed research bundle',
    );
  return { system: SYSTEM_PROMPT, data };
}
export const DirectorDraftSchema = z.strictObject({
  schemaVersion: z.literal('1.0.0'),
  origin: z.union([z.literal('manual'), ProviderIdSchema]),
  script: VideoScriptSchema,
  scriptSha256: z.string().regex(/^[a-f0-9]{64}$/),
  brand: z.strictObject({
    id: z.literal('tech-explainer'),
    version: z.literal('1.0.0'),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  researchBinding: z
    .strictObject({
      bundleSha256: z.string().regex(/^[a-f0-9]{64}$/),
      ledgerSha256: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .nullable(),
  reviewIssues: z.array(editorialText(200)).max(20),
  requiresHumanReview: z.literal(true),
  requiresTimingReview: z.literal(true),
  approvedForRelease: z.literal(false),
  prompt: z.strictObject({
    version: z.literal(PROMPT_VERSION),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  generation: z
    .strictObject({
      model: editorialText(120),
      budget: CostPolicySchema.nullable(),
      brief: DirectorBriefSchema,
      requestSha256: z.string().regex(/^[a-f0-9]{64}$/),
      attempts: z.int().min(1).max(2),
      usage: z.array(UsageEntrySchema).max(6),
    })
    .nullable(),
  review: z
    .strictObject({
      reviewer: editorialText(120),
      rationale: editorialText(2000),
      reviewedAt: z.iso.datetime(),
      draftSha256: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .nullable(),
});
export type DirectorDraft = z.infer<typeof DirectorDraftSchema>;
export function importDraft(
  text: string,
  options: {
    origin?: DirectorDraft['origin'];
    bundle?: unknown;
    ledger?: unknown;
    generation?: unknown;
  } = {},
): DirectorDraft {
  if (Buffer.byteLength(text) > 2097152)
    throw new DirectorError('SCRIPT_LIMIT', 'Script JSON exceeds 2 MiB');
  if (assessText(text).length)
    throw new DirectorError(
      'UNSAFE_SCRIPT',
      'Script contains known instructions, commands, hidden controls or credential-like text',
    );
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    /* The domain parser emits a safe malformed-JSON diagnostic. */
  }
  if (envelope !== undefined && hasUnsafeJson(envelope))
    throw new DirectorError(
      'UNSAFE_SCRIPT',
      'Decoded JSON contains known instructions, commands, hidden controls or credential-like text',
    );
  if (
    envelope &&
    typeof envelope === 'object' &&
    'status' in envelope &&
    ['unsupported_visual', 'needs_review'].includes(String(envelope.status))
  ) {
    const limitation = z
      .strictObject({
        status: z.enum(['unsupported_visual', 'needs_review']),
        reason: editorialText(1000),
      })
      .safeParse(envelope);
    throw new DirectorError(
      String(envelope.status).toUpperCase(),
      'Director reported unsupported visuals or unresolved research; human revision required',
      limitation.success
        ? [{ path: '$.status', reason: limitation.data.reason }]
        : [],
    );
  }
  const script = parseVideoScriptJson(text);
  for (const [index, source] of script.sources.entries()) {
    if (source.url === null) continue;
    try {
      canonicalUrl(source.url);
    } catch {
      throw new DirectorError(
        'SOURCE_URL_INVALID',
        'Source URLs must satisfy the existing public-document policy',
        [
          {
            path: `$.sources[${index}].url`,
            reason:
              'Use a credential-free public HTTP(S) document URL on its default port',
          },
        ],
      );
    }
  }
  resolveBrand('brand' in script ? script.brand : undefined);
  try {
    validateStoryboard(script);
  } catch (error) {
    const issue = error as { path?: string; message?: string };
    throw new DirectorError(
      'UNSUPPORTED_STORYBOARD',
      'Storyboard is not executable by the current producer',
      [
        {
          path: issue.path ?? '$.scenes',
          reason: issue.message ?? 'Unsupported narration/visual timing',
        },
      ],
    );
  }
  if (
    script.scenes.length >= 3 &&
    script.scenes.every((s) => s.visual.type === 'title-card')
  )
    throw new DirectorError(
      'NEEDS_REVIEW',
      'All-title-card explainer needs a mechanism storyboard; choose a registered animation or return unsupported_visual',
      [
        {
          path: '$.scenes',
          reason:
            'Show the mechanism using the exported catalog; title cards may frame a story but cannot replace its behavior',
        },
      ],
    );
  const reviewIssues = [
    'NARRATION_AND_STORYBOARD_NEED_HUMAN_REVIEW',
    'FACTS_RIGHTS_TIMING_AND_RELEASE_REVIEW_SEPARATE',
  ];
  let binding: DirectorDraft['researchBinding'] = null;
  if (options.bundle !== undefined || options.ledger !== undefined) {
    const { bundle, ledger } = reviewedResearch(options.bundle, options.ledger);
    const errors: { path: string; reason: string }[] = [];
    for (const [i, source] of script.sources.entries()) {
      const expected = bundle.sources.find(
        (s) => s.sourceId === source.source_id,
      );
      if (
        !expected ||
        source.url !== expected.canonicalUrl ||
        source.content_sha256 !== expected.contentSha256 ||
        source.retrieved_at !== expected.retrievedAt ||
        source.revision !== expected.revision.commit ||
        source.title !== expected.provenance.title ||
        source.license_review !== 'reference_only_no_reuse_grant' ||
        ('sourceType' in expected && source.source_kind !== expected.sourceType)
      )
        errors.push({
          path: `$.sources[${i}]`,
          reason:
            'Source must match exact bundle ID, URL/type, timestamp, revision and content hash',
        });
    }
    for (const [i, claim] of script.claims.entries()) {
      const expected = ledger.claims.find((c) => c.claimId === claim.claim_id);
      if (
        !expected ||
        claim.text !== expected.text ||
        claim.status !== expected.status ||
        JSON.stringify([...claim.source_ids].sort()) !==
          JSON.stringify([...(expected?.sourceIds ?? [])].sort())
      )
        errors.push({
          path: `$.claims[${i}]`,
          reason:
            'Claim must preserve exact reviewed text, source IDs and status',
        });
    }
    for (const [i, scene] of script.scenes.entries())
      if (!scene.claim_ids.length)
        errors.push({
          path: `$.scenes[${i}].claim_ids`,
          reason:
            'Director scenes require reviewed claim references, including explicit illustrative transitions',
        });
    if (errors.length)
      throw new DirectorError(
        'EVIDENCE_BINDING_INVALID',
        'Script does not preserve reviewed research',
        errors,
      );
    binding = {
      bundleSha256: bundle.bundleSha256,
      ledgerSha256: ledgerDigest(ledger),
    };
  } else
    reviewIssues.push(
      'MISSING_RESEARCH_PROVENANCE',
      'SCRIPT_CLAIM_STATUS_IS_NOT_FACT_APPROVAL',
    );
  if (
    script.scenes.some(
      (s) =>
        (s.visual.type === 'tech-animation' ||
          s.visual.type === 'registered-animation') &&
        s.visual.cues.some((c) => c.trigger.kind === 'phrase'),
    )
  )
    reviewIssues.push('REQUIRES_REVIEWED_WORD_ALIGNMENT');
  return DirectorDraftSchema.parse({
    schemaVersion: '1.0.0',
    origin: options.origin ?? 'manual',
    script,
    scriptSha256: digest(JSON.stringify(script)),
    brand: brandIdentity('brand' in script ? script.brand : undefined),
    researchBinding: binding,
    reviewIssues,
    requiresHumanReview: true,
    requiresTimingReview: true,
    approvedForRelease: false,
    prompt: { version: PROMPT_VERSION, sha256: promptHash },
    generation:
      options.generation === undefined
        ? null
        : DirectorDraftSchema.shape.generation.parse(options.generation),
    review: null,
  });
}
export function draftDigest(draft: DirectorDraft) {
  const { review: _review, ...body } = draft;
  return digest(JSON.stringify(body));
}
export function reviewDraft(
  input: unknown,
  reviewer: string,
  rationale: string,
  evidence: { bundle?: unknown; ledger?: unknown } = {},
) {
  const original = DirectorDraftSchema.parse(input);
  const validated = importDraft(
    JSON.stringify(original.script),
    original.researchBinding ? evidence : {},
  );
  if (
    original.scriptSha256 !== validated.scriptSha256 ||
    JSON.stringify(original.brand) !== JSON.stringify(validated.brand) ||
    JSON.stringify(original.researchBinding) !==
      JSON.stringify(validated.researchBinding) ||
    JSON.stringify(original.reviewIssues) !==
      JSON.stringify(validated.reviewIssues)
  )
    throw new DirectorError(
      'STALE_DRAFT',
      'Script, research, review flags or brand changed; import and review again',
    );
  const identity = z
    .strictObject({
      reviewer: editorialText(120),
      rationale: editorialText(2000),
    })
    .parse({ reviewer, rationale });
  return DirectorDraftSchema.parse({
    ...original,
    review: {
      ...identity,
      reviewedAt: new Date().toISOString(),
      draftSha256: draftDigest(original),
    },
  });
}
export async function generateDraft(
  provider: LLMProvider,
  bundle: unknown,
  ledger: unknown,
  brief: unknown,
  example: unknown,
  options: {
    maxRepairs?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
) {
  ProviderIdSchema.parse(provider.id);
  const timeoutMs = z
    .int()
    .min(50)
    .max(120000)
    .parse(options.timeoutMs ?? 120000);
  const repairs = z
    .int()
    .min(0)
    .max(1)
    .parse(options.maxRepairs ?? 1);
  const request = makeRequest(bundle, ledger, brief, example);
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  let diagnostics: { path: string; reason: string }[] = [];
  for (let attempt = 0; attempt <= repairs; attempt++) {
    signal.throwIfAborted();
    let response: Awaited<ReturnType<LLMProvider['generate']>>;
    try {
      response = await abortable(
        provider.generate({
          system: attempt
            ? `${request.system}\n\n${PROMPTS.repair}`
            : request.system,
          data: {
            ...request.data,
            ...(attempt ? { repairDiagnostics: diagnostics } : {}),
          },
          signal,
        }),
        signal,
      );
    } catch (error) {
      if (signal.aborted)
        throw new LLMError(
          'GENERATION_CANCELLED',
          'Director generation was cancelled or exceeded its total deadline',
        );
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        'PROVIDER_FAILURE',
        'Provider generation failed; raw provider errors are not logged',
      );
    }
    try {
      return importDraft(response.text, {
        origin: provider.id,
        bundle,
        ledger,
        generation: {
          model: response.model ?? provider.model,
          budget: provider.budget,
          brief: request.data.brief,
          requestSha256: digest(JSON.stringify(request)),
          attempts: attempt + 1,
          usage: provider.accounting(),
        },
      });
    } catch (error) {
      if (
        error instanceof DirectorError &&
        [
          'UNSAFE_SCRIPT',
          'EVIDENCE_BINDING_INVALID',
          'UNSUPPORTED_VISUAL',
          'NEEDS_REVIEW',
        ].includes(error.code)
      )
        throw error;
      if (
        !(
          error instanceof DirectorError ||
          error instanceof ScriptValidationError
        )
      )
        throw error;
      diagnostics = error.issues.map(
        (issue: ValidationIssue | { path: string; reason: string }) => ({
          path: issue.path,
          reason: issue.reason,
        }),
      );
      if (attempt === repairs)
        throw new DirectorError(
          'GENERATION_INVALID',
          'Generation remains invalid after bounded repair',
          diagnostics,
        );
    }
  }
  throw new DirectorError('GENERATION_INVALID', 'No valid draft');
}
