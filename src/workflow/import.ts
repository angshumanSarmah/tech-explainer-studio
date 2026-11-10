import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { brandIdentity } from '../branding/identity.ts';
import { loadNarrationConfig } from '../config/narration.ts';
import {
  DirectorDraftSchema,
  draftDigest,
  importDraft,
  reviewedResearch,
} from '../director/core.ts';
import { loadNarrationAsset } from '../media/narration-input.ts';
import { assessText, hasUnsafeJson } from '../sources/safety.ts';
import type { AssetCache } from '../storage/cache.ts';
import { evidenceKey, fingerprint, narratorConfig } from './dependencies.ts';
import { fail, type Snapshot, SnapshotSchema } from './model.ts';

export async function readJson(path: string): Promise<unknown> {
  const info = await lstat(path);
  if (!info.isFile() || info.size > 2097152)
    fail('INPUT_LIMIT', 'Use regular JSON files of at most 2 MiB');
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (hasUnsafeJson(parsed) || assessText(JSON.stringify(parsed)).length)
    fail(
      'UNSAFE_INPUT',
      'Known instructions, commands or credential-like text cannot be persisted',
    );
  return parsed;
}
export interface ImportOptions {
  script?: string;
  draft?: string;
  config?: string;
  narration?: string;
  bundle?: string;
  ledger?: string;
  alignment?: string;
  allowFallback?: boolean;
  strict?: boolean;
}
export async function importSnapshot(
  options: ImportOptions,
  cache: AssetCache,
  previous?: Snapshot,
): Promise<Snapshot> {
  if (Boolean(options.script) === Boolean(options.draft))
    fail('INPUT_REQUIRED', 'Provide exactly one --script or --draft');
  const draft = options.draft
    ? DirectorDraftSchema.parse(await readJson(options.draft))
    : null;
  const scriptInput = draft?.script ?? (await readJson(options.script ?? ''));
  const evidence =
    options.bundle || options.ledger
      ? {
          bundle: await readJson(options.bundle ?? ''),
          ledger: await readJson(options.ledger ?? ''),
        }
      : {};
  const validated = importDraft(JSON.stringify(scriptInput), evidence);
  if (
    draft &&
    (draft.scriptSha256 !== validated.scriptSha256 ||
      fingerprint(draft.brand) !== fingerprint(validated.brand) ||
      fingerprint(draft.researchBinding) !==
        fingerprint(validated.researchBinding) ||
      fingerprint(draft.reviewIssues) !== fingerprint(validated.reviewIssues))
  )
    fail(
      'STALE_DRAFT',
      'Saved draft must match its script, brand, review flags and exact reviewed research; supply --bundle and --ledger for a bound draft',
    );
  if (draft?.review && draft.review.draftSha256 !== draftDigest(draft))
    fail(
      'STALE_REVIEW',
      'Draft review hash no longer matches; review the revised draft explicitly',
    );
  const research =
    evidence.bundle && evidence.ledger
      ? reviewedResearch(evidence.bundle, evidence.ledger)
      : null;
  const script = validated.script;
  if (options.config) await readJson(options.config);
  const config = options.config
    ? await loadNarrationConfig(options.config)
    : (previous?.config ?? null);
  const sameNarrator =
    fingerprint(config && narratorConfig(config)) ===
    fingerprint((previous?.config && narratorConfig(previous.config)) || null);
  const snapshot: Snapshot = SnapshotSchema.parse({
    version: 1,
    script,
    provenance: {
      origin: draft
        ? draft.origin === 'manual'
          ? 'manual_import'
          : draft.origin
        : 'manual_import',
      brand: brandIdentity('brand' in script ? script.brand : undefined),
      research: research
        ? {
            bundleId: research.bundle.bundleId,
            bundleSha256: research.bundle.bundleSha256,
            bundleCreatedAt: research.bundle.createdAt,
            ledgerSha256: validated.researchBinding?.ledgerSha256,
            ledgerRevision: research.ledger.revision,
            factApproval: research.ledger.factApproval,
            sourceReferences: research.bundle.sources.map((s) => ({
              sourceId: s.sourceId,
              contentSha256: s.contentSha256,
              retrievedAt: s.retrievedAt,
              revision: s.revision,
            })),
            claimReviewReferences: research.ledger.claims.map((c) => ({
              claimId: c.claimId,
              status: c.status,
              sourceIds: c.sourceIds,
              review: c.review,
            })),
          }
        : null,
      draftSha256: draft ? draftDigest(draft) : null,
      draftReview: draft?.review
        ? {
            reviewer: draft.review.reviewer,
            reviewedAt: draft.review.reviewedAt,
            draftSha256: draft.review.draftSha256,
          }
        : null,
      usage: draft?.generation
        ? {
            provider: draft.origin,
            model: draft.generation.model,
            requestSha256: draft.generation.requestSha256,
            budget: draft.generation.budget,
            entries: draft.generation.usage,
          }
        : null,
    },
    config,
    savedAudio: {},
    alignment: options.alignment
      ? await readJson(options.alignment)
      : (previous?.alignment ?? null),
    allowFallback: options.allowFallback ?? previous?.allowFallback ?? false,
    strict: options.strict ?? previous?.strict ?? false,
    requiresEvidenceReview: false,
  });
  // Preserve exact references when importing an unchanged script without re-supplying its draft.
  if (
    previous &&
    !draft &&
    !options.bundle &&
    !options.ledger &&
    fingerprint({ sources: script.sources, claims: script.claims }) ===
      fingerprint({
        sources: previous.script.sources,
        claims: previous.script.claims,
      })
  )
    snapshot.provenance.research = previous.provenance.research;
  snapshot.requiresEvidenceReview = Boolean(
    previous &&
      (previous.requiresEvidenceReview ||
        evidenceKey(previous) !== evidenceKey(snapshot)) &&
      !(draft?.review && research),
  );
  if (options.narration) {
    let total = 0;
    for (const scene of script.scenes) {
      const asset = await loadNarrationAsset(
        scene,
        join(options.narration, scene.scene_id),
      );
      total += asset.samples;
      if (total > 108000 * 800)
        fail('AUDIO_LIMIT', 'Narration exceeds one hour');
      if (
        config &&
        (fingerprint(config.settings) !==
          fingerprint(asset.metadata.settings) ||
          config.provider !== asset.metadata.provider ||
          (config.provider === 'kokoro-onnx' &&
            (config.modelSha256 !== asset.metadata.identity.modelSha256 ||
              config.voicesSha256 !== asset.metadata.identity.voicesSha256)))
      )
        fail(
          'NARRATOR_MISMATCH',
          'Saved WAV settings/model do not match --config; use matching audio or explicitly synthesize the new narrator',
        );
      await mkdir(join(cache.root, 'tmp'), { recursive: true });
      const temp = await mkdtemp(join(cache.root, 'tmp', 'audio-'));
      try {
        await writeFile(
          join(temp, 'narration.json'),
          `${JSON.stringify({ ...asset.metadata, wavPath: `${scene.scene_id}.wav`, metadataPath: 'narration.json' }, null, 2)}\n`,
        );
        const checkedWav = join(temp, `${scene.scene_id}.wav`);
        await writeFile(checkedWav, asset.wavBytes, { flag: 'wx' });
        snapshot.savedAudio[scene.scene_id] = [
          await cache.putFile(checkedWav, `${scene.scene_id}.wav`),
          await cache.putFile(join(temp, 'narration.json'), 'narration.json'),
        ];
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    }
  } else if (previous && sameNarrator) {
    for (const scene of script.scenes) {
      const prior = previous.script.scenes.find(
        (s) => s.scene_id === scene.scene_id,
      );
      const saved = Object.hasOwn(previous.savedAudio, scene.scene_id)
        ? previous.savedAudio[scene.scene_id]
        : undefined;
      if (prior?.narration === scene.narration && saved)
        snapshot.savedAudio[scene.scene_id] = saved;
    }
  }
  if (
    !config &&
    script.scenes.some((s) => !Object.hasOwn(snapshot.savedAudio, s.scene_id))
  )
    fail(
      'AUDIO_INPUT_REQUIRED',
      'Provide saved narration for every scene or a non-secret local --config',
    );
  // Content hash is also validated again inside the normal producer before assembly.
  return SnapshotSchema.parse(snapshot);
}
