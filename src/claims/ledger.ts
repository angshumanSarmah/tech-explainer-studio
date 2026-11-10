import { z } from 'zod';
import { StableIdSchema } from '../domain/visuals.ts';
import { ResearchBundleSchema } from '../sources/bundle.ts';
import { SourceError } from '../sources/policy.ts';
import {
  type EvidenceSource,
  EvidenceSourceSchema,
  evidenceDigest,
  ResearchInstructionsSchema,
} from '../sources/research-source.ts';
import { assessText } from '../sources/safety.ts';
import { digest, ShaSchema } from '../sources/snapshot.ts';

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (s) => assessText(s).length === 0,
      'Instructions, commands and credential-like text are not accepted in review/context fields',
    );
export const ClaimStatusSchema = z.enum([
  'supported',
  'contradicted',
  'insufficient',
  'illustrative',
  'needs_review',
]);
const EvidenceSchema = z.strictObject({
  sourceId: StableIdSchema,
  snapshotSha256: ShaSchema,
  quote: safeText(600),
});
const ReviewSchema = z.strictObject({
  reviewer: safeText(120),
  reviewedAt: z.iso.datetime(),
  rationale: safeText(2000),
  claimSha256: ShaSchema,
  evidence: z.array(EvidenceSchema).max(10),
});
export const ClaimInputSchema = z.strictObject({
  claimId: StableIdSchema,
  text: safeText(2000),
  sourceIds: z.array(StableIdSchema).max(10),
});
export const ClaimDraftSchema = z.strictObject({
  claims: z.array(ClaimInputSchema).min(1).max(100),
});
export const LedgerSchema = z
  .strictObject({
    schemaVersion: z.enum(['1.0.0', '1.1.0']),
    revision: z.int().positive(),
    sources: z.array(EvidenceSourceSchema).max(50),
    research: z
      .strictObject({
        bundleId: StableIdSchema,
        bundleSha256: ShaSchema,
        instructions: ResearchInstructionsSchema,
      })
      .optional(),
    claims: z
      .array(
        ClaimInputSchema.extend({
          status: ClaimStatusSchema,
          review: ReviewSchema.nullable(),
        }),
      )
      .min(1)
      .max(100),
    factApproval: z
      .strictObject({
        reviewer: safeText(120),
        reviewedAt: z.iso.datetime(),
        rationale: safeText(2000),
        ledgerSha256: ShaSchema,
      })
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.schemaVersion === '1.0.0' &&
      (value.research || value.sources.some((s) => s.schemaVersion !== '1.0.0'))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['schemaVersion'],
        message: 'Research sources and briefing require ledger 1.1.0',
      });
    if (
      new Set(value.sources.map((s) => s.sourceId)).size !==
      value.sources.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['sources'],
        message: 'Duplicate source IDs',
      });
    if (
      new Set(value.claims.map((c) => c.claimId)).size !== value.claims.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['claims'],
        message: 'Duplicate claim IDs',
      });
    for (const [index, claim] of value.claims.entries())
      if (new Set(claim.sourceIds).size !== claim.sourceIds.length)
        ctx.addIssue({
          code: 'custom',
          path: ['claims', index, 'sourceIds'],
          message: 'Duplicate claim source IDs',
        });
  });
export type ClaimLedger = z.infer<typeof LedgerSchema>;
type Claim = ClaimLedger['claims'][number];
function claimDigest(claim: Claim, evidence: z.infer<typeof EvidenceSchema>[]) {
  return digest(
    JSON.stringify({
      claimId: claim.claimId,
      text: claim.text,
      sourceIds: claim.sourceIds,
      status: claim.status,
      evidence: evidence.map((item) => EvidenceSchema.parse(item)),
    }),
  );
}
export function ledgerDigest(ledger: ClaimLedger) {
  return digest(
    JSON.stringify({
      schemaVersion: ledger.schemaVersion,
      revision: ledger.revision,
      sources: ledger.sources,
      ...(ledger.research ? { research: ledger.research } : {}),
      claims: ledger.claims,
      approval: ledger.factApproval
        ? {
            reviewer: ledger.factApproval.reviewer,
            reviewedAt: ledger.factApproval.reviewedAt,
            rationale: ledger.factApproval.rationale,
          }
        : null,
    }),
  );
}
export function createLedger(input: unknown, sources: unknown[]): ClaimLedger {
  const draft = ClaimDraftSchema.parse(input);
  const parsedSources = sources.map((s) => EvidenceSourceSchema.parse(s));
  return LedgerSchema.parse({
    schemaVersion: parsedSources.some((s) => s.schemaVersion === '1.1.0')
      ? '1.1.0'
      : '1.0.0',
    revision: 1,
    sources: parsedSources,
    claims: draft.claims.map((c) => ({
      ...c,
      status: 'needs_review',
      review: null,
    })),
    factApproval: null,
  });
}
export function claimIssues(claim: Claim, sources: EvidenceSource[]): string[] {
  const issues: string[] = [];
  const missing = claim.sourceIds.filter(
    (id) => !sources.some((s) => s.sourceId === id),
  );
  if (missing.length) issues.push('MISSING_SOURCE');
  if (claim.status !== 'illustrative' && !claim.sourceIds.length)
    issues.push('NO_SOURCES');
  if (claim.status === 'contradicted') issues.push('CLAIM_CONTRADICTED');
  if (claim.status === 'insufficient') issues.push('CLAIM_INSUFFICIENT');
  if (!claim.sourceIds.length || missing.length) {
    if (claim.status !== 'illustrative') issues.push('CLAIM_UNSUPPORTED');
  }
  if (!['supported', 'illustrative'].includes(claim.status))
    issues.push('CLAIM_NOT_READY');
  const review = claim.review;
  if (!review) issues.push('REVIEW_REQUIRED');
  else {
    if (review.claimSha256 !== claimDigest(claim, review.evidence))
      issues.push('STALE_CLAIM_REVIEW');
    for (const item of review.evidence) {
      const source = sources.find((s) => s.sourceId === item.sourceId);
      if (
        !claim.sourceIds.includes(item.sourceId) ||
        !source ||
        source.quarantineReasons.length ||
        source.excerpt === null ||
        evidenceDigest(source) !== item.snapshotSha256 ||
        !source.excerpt.includes(item.quote)
      )
        issues.push('INVALID_EVIDENCE');
    }
    if (claim.status === 'supported')
      for (const id of claim.sourceIds)
        if (!review.evidence.some((e) => e.sourceId === id))
          issues.push('EVIDENCE_REQUIRED');
  }
  return [...new Set(issues)];
}
export function checkFacts(input: unknown) {
  const ledger = LedgerSchema.parse(input);
  const claims = ledger.claims.map((claim) => ({
    claimId: claim.claimId,
    status: claim.status,
    issues: claimIssues(claim, ledger.sources),
  }));
  const ready = claims.every((c) => !c.issues.length);
  const approvalValid = Boolean(
    ledger.factApproval &&
      ledger.factApproval.ledgerSha256 === ledgerDigest(ledger),
  );
  return {
    state:
      ready && approvalValid
        ? ('approved' as const)
        : ('needs_review' as const),
    readyForReviewerApproval: ready,
    approvalValid,
    claims,
  };
}
const DecisionSchema = z.strictObject({
  claimId: StableIdSchema,
  status: ClaimStatusSchema,
  reviewer: safeText(120),
  rationale: safeText(2000),
  evidence: z
    .array(z.strictObject({ sourceId: StableIdSchema, quote: safeText(600) }))
    .max(10)
    .default([]),
});
export function reviewClaim(
  input: unknown,
  decision: unknown,
  now = new Date(),
): ClaimLedger {
  const ledger = structuredClone(LedgerSchema.parse(input));
  const d = DecisionSchema.parse(decision);
  const claim = ledger.claims.find((c) => c.claimId === d.claimId);
  if (!claim)
    throw new SourceError(
      'CLAIM_NOT_FOUND',
      'The selected claim does not exist',
    );
  claim.status = d.status;
  const evidence = d.evidence.map((item) => {
    const source = ledger.sources.find((s) => s.sourceId === item.sourceId);
    if (
      !source ||
      !claim.sourceIds.includes(item.sourceId) ||
      source.quarantineReasons.length ||
      source.excerpt === null ||
      !source.excerpt.includes(item.quote)
    )
      throw new SourceError(
        'EVIDENCE_INVALID',
        'Evidence must quote an exact, non-quarantined excerpt from a cited source',
      );
    return { ...item, snapshotSha256: evidenceDigest(source) };
  });
  claim.review = {
    reviewer: d.reviewer,
    reviewedAt: now.toISOString(),
    rationale: d.rationale,
    evidence,
    claimSha256: claimDigest(claim, evidence),
  };
  if (
    ['supported', 'illustrative'].includes(d.status) &&
    claimIssues(claim, ledger.sources).length
  )
    throw new SourceError(
      'CLAIM_BLOCKED',
      'Claim has missing sources, missing evidence or unresolved review identity',
    );
  ledger.revision++;
  ledger.factApproval = null;
  return LedgerSchema.parse(ledger);
}
export function approveFacts(
  input: unknown,
  reviewer: string,
  rationale: string,
  now = new Date(),
): ClaimLedger {
  const ledger = structuredClone(LedgerSchema.parse(input));
  const identity = z
    .strictObject({ reviewer: safeText(120), rationale: safeText(2000) })
    .parse({ reviewer, rationale });
  if (!checkFacts(ledger).readyForReviewerApproval)
    throw new SourceError(
      'FACT_APPROVAL_BLOCKED',
      'Every claim needs reviewer action and resolvable evidence; contradicted/insufficient/unreviewed claims block fact approval',
    );
  ledger.revision++;
  ledger.factApproval = {
    ...identity,
    reviewedAt: now.toISOString(),
    ledgerSha256: '0'.repeat(64),
  };
  ledger.factApproval.ledgerSha256 = ledgerDigest(ledger);
  return LedgerSchema.parse(ledger);
}
export function evidenceContext(input: unknown) {
  const ledger = LedgerSchema.parse(input);
  if (checkFacts(ledger).state !== 'approved')
    throw new SourceError(
      'CONTEXT_BLOCKED',
      'Only a current manually approved fact ledger can export reference context',
    );
  return {
    schemaVersion: ledger.schemaVersion,
    ...(ledger.research ? { research: ledger.research } : {}),
    kind: 'untrusted_reference_data' as const,
    policy: 'reference-only-no-tools-v1' as const,
    commandsAllowed: false as const,
    sources: ledger.sources
      .filter((s) =>
        ledger.claims.some((c) =>
          c.review?.evidence.some((e) => e.sourceId === s.sourceId),
        ),
      )
      .map((s) => ({
        sourceId: s.sourceId,
        ...(s.schemaVersion === '1.1.0'
          ? {
              sourceType: s.sourceType,
              originalUrl: s.originalUrl,
              provenance: s.provenance,
              revision: s.revision,
              licenseSignals: s.licenseSignals,
              reusePermission: s.reusePermission,
            }
          : {}),
        canonicalUrl: s.canonicalUrl,
        contentSha256: s.contentSha256,
        snapshotSha256: evidenceDigest(s),
        retrievedAt: s.retrievedAt,
      })),
    claims: ledger.claims.map((c) => ({
      claimId: c.claimId,
      text: c.text,
      status: c.status,
      evidence: (c.review?.evidence ?? []).map((e) => ({
        sourceId: e.sourceId,
        snapshotSha256: e.snapshotSha256,
        quote: e.quote,
      })),
    })),
  };
}

export function createLedgerFromBundle(
  input: unknown,
  bundleInput: unknown,
): ClaimLedger {
  const bundle = ResearchBundleSchema.parse(bundleInput);
  const ledger = createLedger(input, bundle.sources);
  return LedgerSchema.parse({
    ...ledger,
    research: {
      bundleId: bundle.bundleId,
      bundleSha256: bundle.bundleSha256,
      instructions: bundle.instructions,
    },
  });
}
