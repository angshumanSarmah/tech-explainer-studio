import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { VideoScriptSchema } from '../domain/videoscript.ts';
import { MediaError } from '../media/error.ts';
import { bindFile } from '../release/files.ts';
import { PreviewSchema } from '../release/media.ts';
import { block, Gate, ReleaseError, RightsSchema } from '../release/model.ts';
import {
  ReleaseService,
  reviewRecord,
  unknownRightsAsset,
} from '../release/service.ts';
import { ReleaseStore } from '../release/store.ts';
import { hash } from '../render-manifest/manifest.ts';
import { ResearchBundleSchema } from '../sources/bundle.ts';
import { Repository } from '../storage/repository.ts';
import { readJson } from '../workflow/import.ts';
import type { CliOutput } from './run.ts';

export const RELEASE_HELP = `Usage:
  studio release inventory --render <render-directory> --bundle <bundle.json> --cover <cover.png> --output <new-rights.json>
  studio release prepare --render <render-directory> --bundle <bundle.json> --ledger <ledger.json> --rights <rights.json> --metadata <metadata.json> --cover <cover.png> --author <identity> --origin manual_import|deepseek|ollama [--job <id>]
  studio review facts|rights|video|publish --release <id> --reviewer <identity> --rationale <text> --decision approve|reject [--playback --pronunciation --subtitles --pacing --timing-warnings --metadata-reviewed]
  studio release check --release <id>
  studio release inspect --release <id>
  studio release audit --release <id>
  studio release package --release <id> --output <new-review.md>
Common: --data <directory> (default data). No network, OAuth or upload command exists.
Inventory starts UNKNOWN: edit each asset's license evidence, rights, attribution and human review in JSON before preparing a candidate.
Identities are lowercase local operator assertions; facts require a reviewer independent of the declared author.
All four gates bind exact dependencies. Publish approval is a separate explicit command; rendering cannot grant it.
Changed inputs require prepare again. Unchanged facts/rights/video reviews carry across candidates of the same subject; publish approval never does.
`;
export async function runReleaseCli(
  group: string,
  args: string[],
  output: CliOutput,
) {
  let repository: Repository | undefined;
  try {
    const { values: v, positionals: p } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        render: { type: 'string' },
        bundle: { type: 'string' },
        ledger: { type: 'string' },
        rights: { type: 'string' },
        metadata: { type: 'string' },
        cover: { type: 'string' },
        author: { type: 'string' },
        origin: { type: 'string' },
        job: { type: 'string' },
        data: { type: 'string' },
        output: { type: 'string' },
        release: { type: 'string' },
        reviewer: { type: 'string' },
        rationale: { type: 'string' },
        decision: { type: 'string' },
        playback: { type: 'boolean' },
        pronunciation: { type: 'boolean' },
        subtitles: { type: 'boolean' },
        pacing: { type: 'boolean' },
        'timing-warnings': { type: 'boolean' },
        'metadata-reviewed': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (v.help || !args.length) {
      output.stdout(RELEASE_HELP);
      return 0;
    }
    const action = p[0];
    const allowed: Record<string, string[]> =
      group === 'review'
        ? Object.fromEntries(
            Gate.options.map((g) => [
              g,
              [
                'release',
                'reviewer',
                'rationale',
                'decision',
                ...(g === 'video'
                  ? [
                      'playback',
                      'pronunciation',
                      'subtitles',
                      'pacing',
                      'timing-warnings',
                    ]
                  : []),
                ...(g === 'publish' ? ['metadata-reviewed'] : []),
              ],
            ]),
          )
        : {
            inventory: ['render', 'bundle', 'cover', 'output'],
            prepare: [
              'render',
              'bundle',
              'ledger',
              'rights',
              'metadata',
              'cover',
              'author',
              'origin',
              'job',
            ],
            check: ['release'],
            inspect: ['release'],
            audit: ['release'],
            package: ['release', 'output'],
          };
    if (
      p.length !== 1 ||
      !action ||
      !allowed[action] ||
      Object.keys(v).some((k) => k !== 'data' && !allowed[action]?.includes(k))
    )
      block('RELEASE_USAGE', 'Invalid command/options; use release --help');
    const requireValue = (key: keyof typeof v) => {
      const value = v[key];
      if (typeof value !== 'string' || !value.trim())
        block('RELEASE_USAGE', `Missing --${key}`);
      return value;
    };
    if (action === 'inventory') {
      const dir = requireValue('render'),
        bundle = ResearchBundleSchema.parse(
          await readJson(requireValue('bundle')),
        );
      const preview = PreviewSchema.parse(
        await readJson(join(dir, 'render-manifest.json')),
      );
      const script = VideoScriptSchema.parse(
        await readJson(join(dir, 'videoscript.json')),
      );
      const assets = bundle.sources.map((s) =>
        unknownRightsAsset({
          assetId: s.sourceId,
          kind: 'source',
          path: null,
          sha256: s.contentSha256,
          origin: s.canonicalUrl ?? 'User-supplied notes',
          provider: s.sourceType,
          creator: null,
          usage:
            'Reference for original narrative; no code or media reuse grant',
        }),
      );
      const cover = await bindFile('cover', requireValue('cover'));
      const font = await bindFile(
        'font',
        createRequire(import.meta.url).resolve(
          '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
        ),
      );
      for (const [assetId, kind, path, sha256] of [
        ['cover', 'cover', cover.path, cover.sha256],
        ['inter-font', 'font', font.path, preview.visuals.tools.fontSha256],
        [
          'authored-visuals',
          'original-visual',
          null,
          hash(JSON.stringify(script.scenes.map((s) => s.visual))),
        ],
      ] as const)
        assets.push(
          unknownRightsAsset({
            assetId,
            kind,
            path,
            sha256,
            origin: 'Local render input',
            provider: 'Local',
            creator: null,
            usage: 'Included in final video or cover',
          }),
        );
      for (const scene of script.scenes) {
        const raw = (await readJson(
          join(dir, 'narration', scene.scene_id, 'narration.json'),
        )) as { identity: Record<string, string | null> };
        for (const name of ['modelSha256', 'voicesSha256']) {
          const sha256 = raw.identity[name];
          if (
            sha256 &&
            !assets.some((a) => a.kind === 'voice-model' && a.sha256 === sha256)
          )
            assets.push(
              unknownRightsAsset({
                assetId: `voice-${name}`,
                kind: 'voice-model',
                path: null,
                sha256,
                origin: 'Recorded Kokoro identity',
                provider: 'Kokoro',
                creator: null,
                usage:
                  'Narration synthesis; review model, voices and runtime terms',
              }),
            );
        }
      }
      await writeFile(
        requireValue('output'),
        `${JSON.stringify(RightsSchema.parse({ schemaVersion: '1.0.0', assets }), null, 2)}\n`,
        { flag: 'wx', mode: 0o600 },
      );
      output.stdout(
        `${JSON.stringify({ inventory: resolve(requireValue('output')), approved: false })}\n`,
      );
      return 0;
    }
    const data = resolve(v.data ?? 'data');
    await mkdir(data, { recursive: true });
    repository = new Repository(join(data, 'studio.sqlite'));
    const service = new ReleaseService(new ReleaseStore(repository));
    let result: unknown;
    if (group === 'review') {
      const decision = requireValue('decision');
      if (!['approve', 'reject'].includes(decision))
        block('RELEASE_USAGE', 'Decision must be approve or reject');
      result = await service.review(
        requireValue('release'),
        action,
        reviewRecord(
          requireValue('reviewer'),
          requireValue('rationale'),
          decision as 'approve' | 'reject',
          {
            playback: v.playback ?? false,
            pronunciation: v.pronunciation ?? false,
            subtitles: v.subtitles ?? false,
            pacing: v.pacing ?? false,
            timingWarnings: v['timing-warnings'] ?? false,
            metadata: v['metadata-reviewed'] ?? false,
          },
        ),
      );
    } else if (action === 'prepare') {
      const origin = requireValue('origin');
      if (!['manual_import', 'deepseek', 'ollama'].includes(origin))
        block(
          'RELEASE_USAGE',
          'Declare manual_import, deepseek or ollama origin',
        );
      result = await service.prepare({
        render: requireValue('render'),
        bundle: requireValue('bundle'),
        ledger: requireValue('ledger'),
        rights: requireValue('rights'),
        metadata: requireValue('metadata'),
        cover: requireValue('cover'),
        author: requireValue('author'),
        origin: origin as 'manual_import' | 'deepseek' | 'ollama',
        ...(v.job ? { job: v.job } : {}),
      });
    } else {
      const id = requireValue('release');
      if (action === 'check') result = await service.check(id);
      else if (action === 'inspect') result = service.store.get(id);
      else if (action === 'audit') result = service.store.history(id);
      else {
        await service.package(id, requireValue('output'));
        result = { package: resolve(requireValue('output')) };
      }
    }
    output.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return action === 'check' && !(result as { eligible: boolean }).eligible
      ? 4
      : 0;
  } catch (error) {
    const known = error instanceof ReleaseError || error instanceof MediaError;
    output.stderr(
      `${JSON.stringify({ error: { code: known ? error.code : 'RELEASE_INPUT_ERROR', reason: known ? error.message : 'Invalid options, JSON, schema or local input file; private inputs are not echoed', ...(error instanceof MediaError ? { stage: error.stage, sceneId: error.sceneId } : {}) } })}\n`,
    );
    return 4;
  } finally {
    repository?.close();
  }
}
