import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import {
  approveFacts,
  checkFacts,
  createLedger,
  createLedgerFromBundle,
  evidenceContext,
  reviewClaim,
} from '../claims/ledger.ts';
import { ingestResearchBundle } from '../sources/bundle.ts';
import { ingestSource, type SourceDependencies } from '../sources/ingest.ts';
import { SourceError } from '../sources/policy.ts';
import type { CliOutput } from './run.ts';

const HELP = `Usage:
  studio source ingest --url <public-document-url> --confirm-public --output <new-directory> [--allow-host <redirect-host>] [--excerpt <literal-text>] [--max-bytes <bytes>] [--timeout-ms <ms>]
  studio research ingest --file <bundle-input.json> --output <new-directory>
  studio claims init --bundle <research-bundle.json> --claims <draft.json> --output <new-ledger.json>
  studio claims init --claims <draft.json> [--source <snapshot.json> ...] --output <new-ledger.json>
  studio claims review --ledger <ledger.json> --decision <review.json> --output <new-ledger.json>
  studio claims approve --ledger <ledger.json> --reviewer <name> --rationale <text> --output <new-ledger.json>
  studio claims check --ledger <ledger.json>
  studio claims context --ledger <approved-ledger.json> --output <new-context.json>

Explicit public sources only; no credentials, crawls or automatic factual approval.
Review/approval writes a new JSON revision; existing files are protected.
Context is inert reviewed reference data, not a prompt or executable instructions.
Exits: 0 success/help; 2 usage/JSON/schema/file; 4 source policy/fetch/review blocked.
`;
async function loadJson(file: string | undefined) {
  if (!file)
    throw new SourceError(
      'INPUT_REQUIRED',
      'A local JSON input path is required',
    );
  const info = await stat(file);
  if (!info.isFile() || info.size > 2097152)
    throw new SourceError(
      'JSON_LIMIT',
      'Local evidence JSON must be a file at most 2 MiB',
    );
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
}
async function saveJson(file: string, value: unknown) {
  const absolute = resolve(file);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  return absolute;
}
export async function runEvidenceCli(
  group: 'source' | 'claims' | 'research',
  args: string[],
  output: CliOutput,
  deps: SourceDependencies = {},
): Promise<number> {
  try {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        url: { type: 'string' },
        file: { type: 'string' },
        bundle: { type: 'string' },
        output: { type: 'string' },
        'confirm-public': { type: 'boolean' },
        'allow-host': { type: 'string', multiple: true },
        excerpt: { type: 'string' },
        'max-bytes': { type: 'string' },
        'timeout-ms': { type: 'string' },
        claims: { type: 'string' },
        source: { type: 'string', multiple: true },
        ledger: { type: 'string' },
        decision: { type: 'string' },
        reviewer: { type: 'string' },
        rationale: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    const { values: v, positionals: p } = parsed;
    if (v.help || !args.length) {
      output.stdout(HELP);
      return 0;
    }
    if (p.length !== 1)
      throw new SourceError(
        'CLI_USAGE_ERROR',
        'Use source/research/claims --help for the supported commands',
      );
    const command = p[0];
    const allowed: Record<string, string[]> = {
      ingest:
        group === 'research'
          ? ['file', 'output']
          : [
              'url',
              'output',
              'confirm-public',
              'allow-host',
              'excerpt',
              'max-bytes',
              'timeout-ms',
            ],
      init: ['claims', 'source', 'bundle', 'output'],
      review: ['ledger', 'decision', 'output'],
      approve: ['ledger', 'reviewer', 'rationale', 'output'],
      check: ['ledger'],
      context: ['ledger', 'output'],
    };
    const keys = command ? allowed[command] : undefined;
    if (
      !keys ||
      Object.keys(v).some((key) => !keys.includes(key)) ||
      (group !== 'claims') !== (command === 'ingest')
    )
      throw new SourceError(
        'CLI_USAGE_ERROR',
        'Options do not match this source/claim command',
      );
    if (command === 'ingest' && group === 'research') {
      if (!v.output)
        throw new SourceError(
          'OUTPUT_REQUIRED',
          'Use a fresh output directory for research ingestion',
        );
      const bundle = await ingestResearchBundle(await loadJson(v.file), deps);
      const folder = resolve(v.output);
      await mkdir(dirname(folder), { recursive: true });
      await mkdir(folder);
      const file = await saveJson(join(folder, 'research-bundle.json'), bundle);
      output.stdout(
        `${JSON.stringify({ ingested: true, file, bundleId: bundle.bundleId, sourceCount: bundle.sources.length, assignments: bundle.assignments, usage: bundle.usage, contextBlocked: true })}\n`,
      );
      return 0;
    }
    if (command === 'ingest') {
      if (!v.url || !v.output || !v['confirm-public'])
        throw new SourceError(
          'PUBLIC_CONFIRMATION_REQUIRED',
          'Provide one explicit --url, --confirm-public and a fresh --output directory',
        );
      const snapshot = await ingestSource(
        v.url,
        {
          publicConfirmed: true,
          allowedHosts: v['allow-host'] ?? [],
          ...(v.excerpt ? { excerpt: v.excerpt } : {}),
          limits: {
            ...(v['max-bytes'] ? { maxBytes: Number(v['max-bytes']) } : {}),
            ...(v['timeout-ms'] ? { timeoutMs: Number(v['timeout-ms']) } : {}),
          },
        },
        deps,
      );
      const folder = resolve(v.output);
      await mkdir(dirname(folder), { recursive: true });
      await mkdir(folder);
      const file = await saveJson(join(folder, 'snapshot.json'), snapshot);
      output.stdout(
        `${JSON.stringify({ ingested: true, sourceId: snapshot.sourceId, file, quarantined: snapshot.quarantineReasons.length > 0, contextBlocked: true, reusePermission: snapshot.reusePermission })}\n`,
      );
      return 0;
    }
    if (command === 'check') {
      const check = checkFacts(await loadJson(v.ledger));
      output.stdout(`${JSON.stringify(check, null, 2)}\n`);
      return check.state === 'approved' ? 0 : 4;
    }
    if (!v.output)
      throw new SourceError(
        'OUTPUT_REQUIRED',
        'Use --output with a new JSON file for this evidence revision',
      );
    let result: unknown;
    if (command === 'init' && v.bundle) {
      if (v.source?.length)
        throw new SourceError(
          'CLI_USAGE_ERROR',
          'Use either --bundle or --source files for claim initialization',
        );
      result = createLedgerFromBundle(
        await loadJson(v.claims),
        await loadJson(v.bundle),
      );
    } else if (command === 'init')
      result = createLedger(
        await loadJson(v.claims),
        await Promise.all((v.source ?? []).map(loadJson)),
      );
    else if (command === 'review')
      result = reviewClaim(
        await loadJson(v.ledger),
        await loadJson(v.decision),
      );
    else if (command === 'approve') {
      if (!v.reviewer || !v.rationale)
        throw new SourceError(
          'REVIEWER_REQUIRED',
          'Fact approval requires an explicit reviewer and rationale',
        );
      result = approveFacts(await loadJson(v.ledger), v.reviewer, v.rationale);
    } else result = evidenceContext(await loadJson(v.ledger));
    const file = await saveJson(v.output, result);
    output.stdout(
      `${JSON.stringify({ saved: true, file, ...(command === 'context' ? { kind: 'untrusted_reference_data' } : { factCheck: checkFacts(result) }) })}\n`,
    );
    return 0;
  } catch (error) {
    const source = error instanceof SourceError;
    const code = source
      ? error.code
      : error instanceof z.ZodError
        ? 'EVIDENCE_SCHEMA_INVALID'
        : 'EVIDENCE_INPUT_ERROR';
    const reason = source
      ? error.message
      : 'Invalid options, JSON/schema or local file operation; inputs and retrieved content are not echoed';
    output.stderr(`${JSON.stringify({ error: { code, reason } })}\n`);
    return source &&
      ![
        'CLI_USAGE_ERROR',
        'INPUT_REQUIRED',
        'OUTPUT_REQUIRED',
        'REVIEWER_REQUIRED',
        'PUBLIC_CONFIRMATION_REQUIRED',
        'JSON_LIMIT',
      ].includes(code)
      ? 4
      : 2;
  }
}
