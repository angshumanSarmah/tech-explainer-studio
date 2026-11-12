import { readFile, realpath, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { checkFacts, LedgerSchema } from '../claims/ledger.ts';
import { importDraft } from '../director/core.ts';
import { VideoScriptSchema } from '../domain/videoscript.ts';
import { componentRegistry } from '../domain/visuals.ts';
import { hash, NarrationArtifactSchema } from '../render-manifest/manifest.ts';
import { ResearchBundleSchema } from '../sources/bundle.ts';
import { preflightVisualAssets } from '../visual-assets/store.ts';
import { readJson } from '../workflow/import.ts';
import { bindFile, renderFiles, verifyFiles } from './files.ts';
import { inspectReleaseMedia, PreviewSchema } from './media.ts';
import {
  block,
  Gate,
  type GateName,
  Identity,
  MetadataSchema,
  ReleaseError,
  type ReleaseManifest,
  type Review,
  ReviewSchema,
  type RightsLedger,
  RightsSchema,
} from './model.ts';
import type { ReleaseStore } from './store.ts';

const fingerprint = (value: unknown) => hash(JSON.stringify(value));
async function voiceLicenses(dir: string) {
  const root = z
    .object({
      narration: z.array(z.object({ metadata: NarrationArtifactSchema })),
    })
    .parse(await readJson(join(dir, 'render-manifest.json')));
  return [
    ...new Set(
      root.narration.flatMap((item) =>
        ['modelSha256', 'voicesSha256']
          .map((name) => item.metadata.identity[name])
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  ].sort();
}

export interface PrepareOptions {
  render: string;
  bundle: string;
  ledger: string;
  rights: string;
  metadata: string;
  cover: string;
  author: string;
  origin: 'manual_import' | 'deepseek' | 'ollama';
  job?: string;
}
export class ReleaseService {
  readonly store: ReleaseStore;
  readonly inspectMedia: (dir: string) => Promise<unknown>;
  constructor(
    store: ReleaseStore,
    inspectMedia: (dir: string) => Promise<unknown> = inspectReleaseMedia,
  ) {
    this.store = store;
    this.inspectMedia = inspectMedia;
  }
  async prepare(options: PrepareOptions) {
    const renderDir = await realpath(resolve(options.render));
    const files = await renderFiles(renderDir);
    for (const role of [
      'bundle',
      'ledger',
      'rights',
      'metadata',
      'cover',
    ] as const)
      files.push(await bindFile(role, options[role]));
    const script = VideoScriptSchema.parse(
      await readJson(join(renderDir, 'videoscript.json')),
    );
    const preview = PreviewSchema.parse(
      await readJson(join(renderDir, 'render-manifest.json')),
    );
    const rights = RightsSchema.parse(await readJson(options.rights));
    // Optional imported media is never fetched or decoded here. Bind every declared local asset.
    for (const asset of rights.assets)
      if (asset.path) {
        const file = await bindFile(`asset:${asset.assetId}`, asset.path);
        if (file.sha256 !== asset.sha256)
          block(
            'ASSET_HASH_MISMATCH',
            'Asset changed; update its hash and obtain a new rights review',
          );
        files.push(file);
      }
    MetadataSchema.parse(await readJson(options.metadata));
    ResearchBundleSchema.parse(await readJson(options.bundle));
    LedgerSchema.parse(await readJson(options.ledger));
    if (
      preview.scriptSha256 !== fingerprint(script) ||
      preview.scriptRevision !== script.revision ||
      preview.videoSha256 !==
        files.find((f) => f.role === 'render:video.mp4')?.sha256
    )
      block(
        'RENDER_BINDING_INVALID',
        'Final script or MP4 differs from its render manifest; rerender explicitly',
      );
    const author = Identity.parse(options.author);
    const fileHash = (role: string) => {
      const value = files.find((f) => f.role === role)?.sha256;
      if (!value)
        block('RELEASE_INPUT_MISSING', 'Missing required release artifact');
      return value;
    };
    const factualScript = {
      topic: script.topic,
      sources: script.sources,
      claims: script.claims,
      scenes: script.scenes.map((s, i) => ({
        narration: s.narration,
        educational_goal: s.educational_goal,
        claim_ids: s.claim_ids,
        ...(s.visual.type === 'composed' ||
        ('transition' in s && s.transition && s.transition.kind !== 'cut')
          ? {
              semanticVisual: s.visual,
              boundary: ('transition' in s ? s.transition : null) ?? null,
              previousVisual: i > 0 ? script.scenes[i - 1]?.visual : null,
            }
          : {}),
      })),
    };
    const metadata = MetadataSchema.parse(await readJson(options.metadata));
    const dependencies = {
      facts: fingerprint({
        author,
        script: factualScript,
        bundle: fileHash('bundle'),
        ledger: fileHash('ledger'),
      }),
      rights: fingerprint({
        rights: fileHash('rights'),
        assets: files
          .filter((f) => f.role.startsWith('asset:'))
          .map((f) => [f.role, f.sha256]),
        sources: script.sources,
        visuals: script.scenes.map((s) => s.visual),
        font: preview.visuals.tools.fontSha256,
        voiceLicenses: await voiceLicenses(renderDir),
        cover: fileHash('cover'),
        attributions: rights.assets
          .filter((a) => a.attribution.required)
          .map((a) => ({
            assetId: a.assetId,
            text: a.attribution.text,
            present: Boolean(
              a.attribution.text &&
                metadata.description.includes(a.attribution.text),
            ),
          })),
      }),
      video: fingerprint({
        files: files
          .filter(
            (f) =>
              f.role.startsWith('render:') ||
              f.role.startsWith('asset:') ||
              f.role === 'cover',
          )
          .map((f) => [f.role, f.sha256]),
      }),
      publish: fingerprint(files.map((f) => [f.role, f.sha256])),
    };
    let job: ReleaseManifest['job'] = null;
    if (options.job) {
      const repo = this.store.repository,
        current = repo.get(options.job),
        snapshot = repo.snapshot(options.job);
      const render = repo.render(options.job);
      if (
        current.status !== 'review_ready' ||
        snapshot.requiresEvidenceReview ||
        !render ||
        fingerprint(snapshot.script) !== fingerprint(script) ||
        render.video_sha256 !== fileHash('render:video.mp4') ||
        render.manifest_sha256 !== fileHash('render:render-manifest.json') ||
        (await realpath(render.path)) !== renderDir ||
        snapshot.provenance.origin !== options.origin
      )
        block(
          'JOB_RELEASE_MISMATCH',
          'Job must be review_ready and bind this render, script, origin and reviewed evidence',
        );
      job = {
        id: current.id,
        revision: current.revision,
        snapshotSha256: fingerprint(snapshot),
      };
    }
    const manifest: ReleaseManifest = {
      schemaVersion: '1.0.0',
      kind: 'release-candidate',
      subject: options.job ?? script.script_id,
      author,
      origin: options.origin,
      job,
      renderDir,
      files,
      dependencies,
    };
    await verifyFiles(manifest);
    const id = this.store.save(manifest, () => this.assertJob(manifest));
    return {
      releaseId: id,
      manifest: this.store.get(id),
      approvedForRelease: false as const,
    };
  }
  assertJob(manifest: ReleaseManifest) {
    if (manifest.job) {
      const repo = this.store.repository,
        job = repo.get(manifest.job.id);
      if (
        job.revision !== manifest.job.revision ||
        job.status !== 'review_ready' ||
        fingerprint(repo.snapshot(job.id)) !== manifest.job.snapshotSha256
      )
        block('STALE_JOB', 'Job revision or review state changed');
    }
  }
  async inputs(id: string) {
    const manifest = this.store.get(id);
    await verifyFiles(manifest);
    this.assertJob(manifest);
    const path = (role: string) => {
      const file = manifest.files.find((f) => f.role === role);
      if (!file)
        block('RELEASE_INPUT_MISSING', 'Missing required release input');
      return file.path;
    };
    return {
      manifest,
      script: VideoScriptSchema.parse(
        await readJson(path('render:videoscript.json')),
      ),
      bundle: ResearchBundleSchema.parse(await readJson(path('bundle'))),
      ledger: LedgerSchema.parse(await readJson(path('ledger'))),
      rights: RightsSchema.parse(await readJson(path('rights'))),
      metadata: MetadataSchema.parse(await readJson(path('metadata'))),
      preview: PreviewSchema.parse(
        await readJson(path('render:render-manifest.json')),
      ),
    };
  }
  async blockers(id: string, gate: GateName) {
    const input = await this.inputs(id),
      { manifest, script, bundle, ledger, rights, metadata, preview } = input;
    const issues: string[] = [];
    if (gate === 'facts') {
      if (checkFacts(ledger).state !== 'approved')
        issues.push('CLAIM_LEDGER_NOT_APPROVED');
      if (
        ledger.factApproval?.reviewer.toLowerCase() === manifest.author ||
        ledger.claims.some(
          (c) => c.review?.reviewer.toLowerCase() === manifest.author,
        )
      )
        issues.push('FACT_REVIEW_NOT_INDEPENDENT');
      try {
        importDraft(JSON.stringify(script), { bundle, ledger });
      } catch {
        issues.push('SCRIPT_EVIDENCE_MISMATCH');
      }
    }
    if (gate === 'rights') {
      const imported = await preflightVisualAssets(
        script,
        join(manifest.renderDir, 'visual-assets'),
      );
      const required = [
        ...imported.map((a) => ({
          assetId: a.record.assetId,
          kind: 'image',
          sha256: a.record.sha256,
        })),
        ...bundle.sources.map((s) => ({
          assetId: s.sourceId,
          kind: 'source',
          sha256: s.contentSha256,
        })),
        {
          kind: 'original-visual',
          sha256: fingerprint(script.scenes.map((s) => s.visual)),
        },
        { kind: 'font', sha256: preview.visuals.tools.fontSha256 },
        {
          kind: 'cover',
          sha256: manifest.files.find((f) => f.role === 'cover')?.sha256,
        },
      ];
      for (const sha256 of await voiceLicenses(manifest.renderDir))
        required.push({ kind: 'voice-model', sha256 });
      for (const item of required)
        if (
          !rights.assets.some(
            (a) =>
              a.kind === item.kind &&
              a.sha256 === item.sha256 &&
              (!('assetId' in item) || a.assetId === item.assetId),
          )
        )
          issues.push(`RIGHTS_INVENTORY_MISSING:${item.kind}`);
      for (const a of imported)
        if (
          a.record.attribution.required &&
          (!a.record.attribution.text ||
            !metadata.description.includes(a.record.attribution.text))
        )
          issues.push(`ATTRIBUTION_MISSING:${a.record.assetId}`);
      for (const asset of rights.assets) {
        if (
          !asset.review ||
          asset.review.assetSha256 !== asset.sha256 ||
          asset.rights === 'unknown' ||
          !asset.licenseEvidence
        )
          issues.push(`ASSET_RIGHTS_UNREVIEWED:${asset.assetId}`);
        if (
          !asset.path &&
          !['source', 'original-visual', 'voice-model'].includes(asset.kind)
        )
          issues.push(`ASSET_FILE_REQUIRED:${asset.assetId}`);
        if (asset.rights === 'reference-only' && asset.kind !== 'source')
          issues.push(`ASSET_REUSE_NOT_GRANTED:${asset.assetId}`);
        if (
          asset.attribution.required &&
          (!asset.attribution.text ||
            !metadata.description.includes(asset.attribution.text))
        )
          issues.push(`ATTRIBUTION_MISSING:${asset.assetId}`);
      }
    }
    if (gate === 'video') {
      for (const scene of script.scenes)
        if (
          scene.visual.type === 'cache-aside-proof' &&
          componentRegistry.CacheAsideProof.previewOnly
        )
          issues.push(`PREVIEW_ONLY_COMPONENT:${scene.scene_id}`);
      await this.inspectMedia(manifest.renderDir);
    }
    return [...new Set(issues)];
  }
  approvals(id: string, manifest: ReleaseManifest) {
    return Object.fromEntries(
      Gate.options.map((gate) => [gate, this.store.latest(manifest, id, gate)]),
    ) as Record<GateName, (Review & { id: number }) | null>;
  }
  async check(id: string) {
    try {
      const result = await this.checkCurrent(id);
      this.store.audit(id, 'eligibility', {
        eligible: result.eligible,
        issues: result.issues,
      });
      return result;
    } catch (error) {
      this.store.get(id);
      this.store.audit(id, 'eligibility-denied', {
        code: error instanceof ReleaseError ? error.code : 'VALIDATION_FAILED',
      });
      throw error;
    }
  }
  private async checkCurrent(id: string) {
    const { manifest } = await this.inputs(id);
    const issues: string[] = [];
    for (const gate of ['facts', 'rights', 'video'] as const)
      issues.push(...(await this.blockers(id, gate)));
    const approvals = this.approvals(id, manifest);
    for (const gate of Gate.options)
      if (approvals[gate]?.decision !== 'approve')
        issues.push(`APPROVAL_REQUIRED:${gate}`);
    const publish = approvals.publish;
    if (publish?.decision === 'approve') {
      const binding = this.store.repository.db
        .prepare(
          'SELECT record FROM release_audit WHERE release_id=? AND event=? ORDER BY id DESC LIMIT 1',
        )
        .get(id, 'publish-dependencies');
      const recorded = binding
        ? JSON.parse(String(binding.record)).record
        : null;
      if (
        fingerprint(recorded) !==
        fingerprint(
          ['facts', 'rights', 'video'].map(
            (g) => approvals[g as GateName]?.id ?? null,
          ),
        )
      )
        issues.push('STALE_PUBLISH_DEPENDENCIES');
    }
    // Rehash after subprocesses/async reads. Never persist a cached eligibility pass.
    await verifyFiles(manifest);
    this.assertJob(manifest);
    if (fingerprint(this.approvals(id, manifest)) !== fingerprint(approvals))
      issues.push('REVIEWS_CHANGED_DURING_CHECK');
    return {
      releaseId: id,
      eligible: issues.length === 0,
      issues,
      approvals,
      privacy: 'private' as const,
    };
  }
  async review(id: string, gateInput: unknown, input: unknown) {
    try {
      return await this.reviewCurrent(id, gateInput, input);
    } catch (error) {
      this.store.get(id);
      this.store.audit(id, 'review-denied', {
        gate: Gate.safeParse(gateInput).data ?? 'unknown',
        code: error instanceof ReleaseError ? error.code : 'VALIDATION_FAILED',
      });
      throw error;
    }
  }
  private async reviewCurrent(id: string, gateInput: unknown, input: unknown) {
    const gate = Gate.parse(gateInput),
      record = ReviewSchema.parse(input),
      { manifest, preview, script } = await this.inputs(id);
    if (record.decision === 'approve') {
      if (gate === 'facts' && record.reviewer === manifest.author)
        block(
          'INDEPENDENT_REVIEW_REQUIRED',
          'Fact reviewer must differ from the declared script author',
        );
      const issues = await this.blockers(id, gate);
      if (issues.length) block('REVIEW_BLOCKED', issues.join(', '));
      if (
        gate === 'video' &&
        (!record.checks.playback ||
          !record.checks.pronunciation ||
          !record.checks.subtitles ||
          !record.checks.pacing ||
          (preview.requiresTimingReview && !record.checks.timingWarnings))
      )
        block(
          'PLAYBACK_REVIEW_REQUIRED',
          'Confirm playback, pronunciation, subtitles, pacing and any timing warnings explicitly',
        );
      if (gate === 'video' && script.schema_version === '1.2.0') {
        const binding = manifest.files.find(
          (f) => f.role === 'render:boundary-pacing.json',
        );
        if (!binding)
          block('PACING_REPORT_REQUIRED', 'Missing measured boundary report');
        const report = z
          .object({
            boundaries: z.array(
              z.object({ id: z.string(), requiresHumanReview: z.boolean() }),
            ),
          })
          .parse(await readJson(binding.path));
        const flagged = report.boundaries.filter((b) => b.requiresHumanReview);
        const supplied = record.boundaryPacing;
        if (
          flagged.length &&
          (!supplied ||
            supplied.reportSha256 !== binding.sha256 ||
            new Set(supplied.decisions.map((d) => d.id)).size !==
              supplied.decisions.length ||
            flagged.some(
              (b) =>
                !supplied.decisions.some(
                  (d) => d.id === b.id && d.classification === 'deliberate',
                ),
            ))
        )
          block(
            'BOUNDARY_PACING_REVIEW_REQUIRED',
            'Listen to each flagged boundary and record a deliberate pause decision/rationale bound to the exact pacing report; unintended or unresolved pacing needs an explicit repair',
          );
      }
      if (gate === 'publish') {
        if (!record.checks.metadata)
          block(
            'METADATA_REVIEW_REQUIRED',
            'Explicit final metadata/destination/privacy review is required',
          );
        const result = await this.check(id);
        if (
          result.issues.some(
            (i) =>
              i !== 'APPROVAL_REQUIRED:publish' &&
              i !== 'STALE_PUBLISH_DEPENDENCIES',
          )
        )
          block('PUBLISH_APPROVAL_BLOCKED', result.issues.join(', '));
      }
    }
    await verifyFiles(manifest);
    this.store.repository.transaction(() => {
      this.assertJob(manifest);
      this.store.review(id, manifest, gate, record);
      if (gate === 'publish')
        this.store.audit(
          id,
          'publish-dependencies',
          ['facts', 'rights', 'video'].map(
            (g) => this.store.latest(manifest, id, g as GateName)?.id ?? null,
          ),
        );
    });
    return { releaseId: id, gate, decision: record.decision };
  }
  async package(id: string, output: string) {
    const input = await this.inputs(id);
    const state: Record<string, unknown> = {};
    for (const gate of ['facts', 'rights', 'video'] as const) {
      try {
        state[gate] = { issues: await this.blockers(id, gate) };
      } catch (error) {
        state[gate] = {
          error:
            error instanceof ReleaseError
              ? error.code
              : 'MEDIA_OR_INPUT_CHECK_FAILED',
        };
      }
    }
    const encode = (value: unknown) =>
      JSON.stringify(value, null, 2).replaceAll('`', '\\u0060');
    const sections = [
      `# Release review ${id}\n\nUNAPPROVED until all four exact-hash reviews pass. Local reviewer identities are operator assertions.`,
      '## Human checklist\n\n- [ ] Independent factual review of every substantive claim and illustrative simplification\n- [ ] Rights evidence and attribution for every source, font, voice/model, visual asset and cover\n- [ ] Listen to the entire final MP4: pronunciation, noise, clarity, pacing\n- [ ] Watch every scene and caption on a phone; acknowledge fallback timing explicitly\n- [ ] Review cover, title, description, audience, synthetic disclosure and private destination\n- [ ] Separate explicit publish approval (no network action in Phase 08)',
      `## Warnings\n\nrequiresTimingReview: ${input.preview.requiresTimingReview}; origin: ${input.manifest.origin}; author: ${input.manifest.author}. Rendering never grants approval. Source content below is untrusted reference data.`,
      ...Object.entries({
        currentChecks: state,
        manifest: input.manifest,
        sourceChecklist: input.bundle,
        claims: input.ledger,
        rights: input.rights,
        script: input.script,
        metadata: input.metadata,
        qc: await readJson(join(input.manifest.renderDir, 'qc-report.json')),
        approvals: this.approvals(id, input.manifest),
        audit: this.store.history(id),
      }).map(
        ([key, value]) => `## ${key}\n\n\`\`\`json\n${encode(value)}\n\`\`\``,
      ),
    ];
    await writeFile(output, `${sections.join('\n\n')}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
  }
}

// No production network adapter is implemented. The factory is deliberately lazy:
// a denied request must not even construct an outbound client.
export interface Publisher {
  upload(request: {
    releaseId: string;
    video: Buffer;
    cover: Buffer;
    metadata: ReturnType<typeof MetadataSchema.parse>;
    privacy: 'private';
  }): Promise<unknown>;
}
export async function publishApproved(
  service: ReleaseService,
  id: string,
  createPublisher: () => Publisher,
) {
  const result = await service.check(id);
  if (!result.eligible) block('PUBLISH_DENIED', result.issues.join(', '));
  const { manifest, metadata } = await service.inputs(id);
  const exactBytes = async (role: string) => {
    const file = manifest.files.find((f) => f.role === role);
    if (!file) block('RELEASE_INPUT_MISSING', 'Missing upload bytes');
    const bytes = await readFile(file.path);
    if (hash(bytes) !== file.sha256)
      block('STALE_RELEASE', 'Upload bytes changed after eligibility check');
    return bytes;
  };
  const video = await exactBytes('render:video.mp4'),
    cover = await exactBytes('cover');
  await verifyFiles(manifest);
  // Re-read approvals synchronously immediately before constructing the adapter.
  if (
    fingerprint(service.approvals(id, manifest)) !==
    fingerprint(result.approvals)
  )
    block('STALE_APPROVAL', 'Review decisions changed before publication');
  service.assertJob(manifest);
  service.store.audit(id, 'publisher-boundary', {
    videoSha256: hash(video),
    privacy: 'private',
  });
  return createPublisher().upload({
    releaseId: id,
    video,
    cover,
    metadata,
    privacy: 'private',
  });
}
export function reviewRecord(
  reviewer: string,
  rationale: string,
  decision: 'approve' | 'reject',
  checks: Review['checks'],
) {
  return ReviewSchema.parse({
    reviewer,
    rationale,
    decision,
    checks,
    reviewedAt: new Date().toISOString(),
  });
}
export function unknownRightsAsset(
  asset: Omit<
    RightsLedger['assets'][number],
    'rights' | 'licenseEvidence' | 'attribution' | 'review'
  >,
) {
  return {
    ...asset,
    rights: 'unknown' as const,
    licenseEvidence: null,
    attribution: { required: false, text: null },
    review: null,
  };
}
