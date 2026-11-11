import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { VisualAssetSchema } from '../visual-assets/model.ts';
import {
  approveVisualAsset,
  importVisualAsset,
  resolveVisualAsset,
} from '../visual-assets/store.ts';
import type { CliOutput } from './run.ts';
export async function runAssetsCli(args: string[], out: CliOutput) {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        file: { type: 'string' },
        metadata: { type: 'string' },
        ref: { type: 'string' },
        review: { type: 'string' },
        root: { type: 'string' },
        help: { type: 'boolean' },
      },
    });
    if (values.help || !positionals.length) {
      out.stdout(
        'studio assets import --file <image> --metadata <source-title-description.json> [--root data/visual-assets]\nstudio assets inspect --ref <asset-reference.json> [--root ...]\nstudio assets review --ref <asset-reference.json> --review <human-rights-review.json> [--root ...]\nImport is pending; a separate explicit review records rights approval. Output includes immutable ref and record.\n',
      );
      return 0;
    }
    const json = async (path: string | undefined) => {
      if (!path) throw new Error('Required file option missing');
      return JSON.parse(await readFile(path, 'utf8')) as unknown;
    };
    let result: unknown;
    if (positionals[0] === 'import' && values.file) {
      const metadata = z
        .strictObject({
          originalSource: VisualAssetSchema.shape.originalSource,
          metadata: VisualAssetSchema.shape.metadata,
        })
        .parse(await json(values.metadata));
      result = await importVisualAsset(values.file, metadata, values.root);
    } else if (positionals[0] === 'inspect') {
      const { record, ref } = await resolveVisualAsset(
        await json(values.ref),
        values.root,
        false,
      );
      result = { record, ref };
    } else if (positionals[0] === 'review') {
      const review = z
        .strictObject({
          reviewer: z.string().min(1).max(80),
          rationale: z.string().min(1).max(500),
          rights: VisualAssetSchema.shape.rights,
          licenseEvidence: VisualAssetSchema.shape.licenseEvidence,
          attribution: VisualAssetSchema.shape.attribution,
        })
        .parse(await json(values.review));
      const { reviewer, rationale, ...rights } = review;
      result = await approveVisualAsset(
        await json(values.ref),
        { reviewer, rationale },
        rights,
        values.root,
      );
    } else throw new Error('Use assets --help');
    out.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    out.stderr(
      `${JSON.stringify({ error: { code: 'VISUAL_ASSET_INVALID', message: error instanceof Error ? error.message : 'Asset import failed' } })}\n`,
    );
    return 2;
  }
}
