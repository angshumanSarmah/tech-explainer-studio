import {
  approveFacts,
  createLedgerFromBundle,
  reviewClaim,
} from '../../src/claims/ledger.ts';
import { ingestResearchBundle } from '../../src/sources/bundle.ts';
import { fixture } from '../helpers/fixture.ts';
export async function researchFixture() {
  const quote = 'HTTP uses a request-response model.';
  const bundle = await ingestResearchBundle(
    {
      schemaVersion: '1.0.0',
      instructions: {
        topic: 'HTTP request handling',
        targetAudience: 'Beginners',
      },
      sources: [
        {
          inputId: 'doc',
          kind: 'url',
          url: 'https://docs.example.org/http',
          title: 'Synthetic documentation',
          publicConfirmed: true,
        },
        {
          inputId: 'notes',
          kind: 'pasted_text',
          text: `${quote} User-provided fixture notes.`,
          title: 'Synthetic user notes',
          publicConfirmed: true,
        },
      ],
    },
    {
      resolve: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => ({
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: Buffer.from(quote),
      }),
      now: () => new Date('2026-11-10T12:00:00Z'),
    },
  );
  const draft = createLedgerFromBundle(
    {
      claims: [
        {
          claimId: 'request-model',
          text: quote,
          sourceIds: bundle.sources.map((s) => s.sourceId),
        },
      ],
    },
    bundle,
  );
  const reviewed = reviewClaim(draft, {
    claimId: 'request-model',
    status: 'supported',
    reviewer: 'Synthetic test reviewer',
    rationale: 'Fixture-only exact quote review',
    evidence: bundle.sources.map((s) => ({ sourceId: s.sourceId, quote })),
  });
  const ledger = approveFacts(
    reviewed,
    'Synthetic test reviewer',
    'Fixture-only approval; not actual HTTP fact verification',
  );
  const script = {
    ...fixture(),
    schema_version: '1.1.0' as const,
    brand: { id: 'tech-explainer' as const, version: '1.0.0' as const },
    sources: bundle.sources.map((s) => ({
      source_id: s.sourceId,
      url: s.canonicalUrl,
      title: s.provenance.title,
      retrieved_at: s.retrievedAt,
      source_kind: s.sourceType,
      license_review: 'reference_only_no_reuse_grant',
      revision: s.revision.commit,
      content_sha256: s.contentSha256,
    })),
    claims: ledger.claims.map((c) => ({
      claim_id: c.claimId,
      text: c.text,
      source_ids: c.sourceIds,
      status: c.status,
      scope: 'Synthetic fixture only',
    })),
    scenes: fixture().scenes.map((s) => ({
      ...s,
      claim_ids: ['request-model'],
    })),
  };
  return { bundle, draft, ledger, script };
}
