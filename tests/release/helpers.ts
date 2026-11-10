import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  approveFacts,
  createLedgerFromBundle,
  reviewClaim,
} from '../../src/claims/ledger.ts';
import { VideoScriptSchema } from '../../src/domain/videoscript.ts';
import type { GateName, RightsLedger } from '../../src/release/model.ts';
import { ReleaseService, reviewRecord } from '../../src/release/service.ts';
import { ReleaseStore } from '../../src/release/store.ts';
import { hash } from '../../src/render-manifest/manifest.ts';
import { ingestResearchBundle } from '../../src/sources/bundle.ts';
import { Repository } from '../../src/storage/repository.ts';
import { fixture } from '../helpers/fixture.ts';
import { dependencies } from '../sources/helpers.ts';

export const checks = {
  playback: true,
  pronunciation: true,
  subtitles: true,
  pacing: true,
  timingWarnings: true,
  metadata: true,
};
export const json = (file: string, value: unknown) =>
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
export async function setup(
  origin: 'manual_import' | 'deepseek' = 'manual_import',
) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'studio-release-'))),
    render = join(root, 'render');
  await mkdir(join(render, 'visuals'), { recursive: true });
  const bundle = await ingestResearchBundle(
    {
      schemaVersion: '1.0.0',
      instructions: { topic: 'HTTP', targetAudience: 'Developers' },
      sources: [
        {
          inputId: 'doc',
          kind: 'url',
          url: 'https://docs.example.org/http',
          publicConfirmed: true,
          title: 'HTTP example',
        },
      ],
    },
    dependencies(),
  );
  const source = bundle.sources[0];
  if (!source) throw new Error('missing test source');
  let ledger = createLedgerFromBundle(
    {
      claims: [
        {
          claimId: 'http-flow',
          text: 'HTTP uses a request-response model.',
          sourceIds: [source.sourceId],
        },
      ],
    },
    bundle,
  );
  ledger = reviewClaim(ledger, {
    claimId: 'http-flow',
    status: 'supported',
    reviewer: 'fact-reviewer',
    rationale: 'Exact mock document quotation',
    evidence: [
      {
        sourceId: source.sourceId,
        quote: 'HTTP uses a request-response model.',
      },
    ],
  });
  ledger = approveFacts(ledger, 'fact-reviewer', 'Reviewed fixture facts');
  let script = fixture();
  script.scenes = script.scenes.slice(0, 1);
  script.sources = [
    {
      source_id: source.sourceId,
      url: source.canonicalUrl ?? '',
      title: source.provenance.title,
      retrieved_at: source.retrievedAt,
      revision: source.revision.commit,
      content_sha256: source.contentSha256,
      source_kind: source.sourceType,
      license_review: 'reference_only_no_reuse_grant',
    },
  ];
  script.claims = [
    {
      claim_id: 'http-flow',
      text: ledger.claims[0]?.text ?? '',
      source_ids: [source.sourceId],
      status: 'supported',
      scope: 'Mock fixture',
    },
  ];
  const scene = script.scenes[0];
  if (!scene) throw new Error('missing test scene');
  scene.claim_ids = ['http-flow'];
  script = VideoScriptSchema.parse(script) as typeof script;
  const video = Buffer.from(
    'SYNTHETIC UNIT TEST VIDEO; never production media',
  );
  const cover = join(root, 'cover.png');
  await writeFile(cover, 'SYNTHETIC TEST COVER');
  const image = join(root, 'image.png');
  await writeFile(image, 'original fixture image bytes');
  const font = join(root, 'font.woff2');
  await writeFile(font, 'test font');
  const preview = {
    kind: 'narrated-preview',
    scriptSha256: hash(JSON.stringify(script)),
    scriptRevision: script.revision,
    videoSha256: hash(video),
    isMock: false,
    width: 1080,
    height: 1920,
    fps: 30,
    durationFrames: 30,
    requiresTimingReview: true,
    brand: { id: 'tech-explainer', version: '1.0.0', sha256: 'b'.repeat(64) },
    visuals: { tools: { fontSha256: hash('test font') } },
    narration: [],
  };
  await json(join(render, 'videoscript.json'), script);
  await json(join(render, 'render-manifest.json'), preview);
  await writeFile(join(render, 'video.mp4'), video);
  await writeFile(join(render, 'captions.srt'), 'test captions');
  await json(join(render, 'timeline.json'), { testOnly: true });
  await json(join(render, 'qc-report.json'), { testOnly: true });
  await writeFile(join(render, 'visuals', 'frame.png'), 'test pixels');
  const asset = (
    assetId: string,
    kind: RightsLedger['assets'][number]['kind'],
    sha256: string,
    path: string | null,
  ) => ({
    assetId,
    kind,
    path,
    sha256,
    origin: 'Original synthetic test fixture',
    provider: 'Test fixture',
    creator: 'test-author',
    usage: 'Testing only',
    rights:
      kind === 'source' ? ('reference-only' as const) : ('original' as const),
    licenseEvidence: 'Original test fixture; no external media',
    attribution: { required: false, text: null },
    review: {
      reviewer: 'rights-reviewer',
      reviewedAt: new Date().toISOString(),
      rationale: 'Reviewed exact fixture',
      assetSha256: sha256,
    },
  });
  const rights: RightsLedger = {
    schemaVersion: '1.0.0',
    assets: [
      asset(source.sourceId, 'source', source.contentSha256, null),
      asset(
        'visuals',
        'original-visual',
        hash(JSON.stringify(script.scenes.map((s) => s.visual))),
        null,
      ),
      asset('cover', 'cover', hash('SYNTHETIC TEST COVER'), cover),
      asset('font', 'font', hash('test font'), font),
      asset(
        'imported-image',
        'image',
        hash('original fixture image bytes'),
        image,
      ),
    ],
  };
  const metadata = {
    title: 'How HTTP works',
    description: 'Original technical explanation',
    tags: ['HTTP'],
    destination: 'youtube',
    privacy: 'private',
    madeForKids: false,
    containsSyntheticMedia: true,
  };
  await json(join(root, 'bundle.json'), bundle);
  await json(join(root, 'ledger.json'), ledger);
  await json(join(root, 'rights.json'), rights);
  await json(join(root, 'metadata.json'), metadata);
  const repo = new Repository(join(root, 'studio.sqlite'));
  // Test-only media inspector. Real FFmpeg rejection and actual Kokoro media are checked separately.
  const service = new ReleaseService(
    new ReleaseStore(repo),
    async () => undefined,
  );
  const options = {
    render,
    bundle: join(root, 'bundle.json'),
    ledger: join(root, 'ledger.json'),
    rights: join(root, 'rights.json'),
    metadata: join(root, 'metadata.json'),
    cover,
    author: 'script-author',
    origin,
  };
  return {
    root,
    render,
    repo,
    service,
    options,
    bundle,
    ledger,
    script,
    rights,
    metadata,
    preview,
    image,
  };
}
export async function approve(
  service: ReleaseService,
  id: string,
  gate: GateName,
) {
  return service.review(
    id,
    gate,
    reviewRecord(
      `${gate}-reviewer`,
      'Explicit synthetic fixture review',
      'approve',
      checks,
    ),
  );
}
