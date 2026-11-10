import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { MediaError } from '../media/error.ts';
import { evidenceKey } from '../workflow/dependencies.ts';
import { importSnapshot } from '../workflow/import.ts';
import { WorkflowError } from '../workflow/model.ts';
import { JobRunner } from '../workflow/runner.ts';
import type { CliOutput } from './run.ts';

const HELP = `Usage:
  studio jobs create --script <script.json> | --draft <draft.json> --narration <saved-dir> | --config <local-config.json> [--key <idempotency-key>] [--allow-caption-fallback]
  studio jobs list [--data <directory>]
  studio jobs inspect <job-id> [--data <directory>]
  studio jobs resume <job-id> [--allow-local-synthesis] [--browser <executable>]
  studio jobs revise <job-id> --script <script.json> | --draft <draft.json> [--narration <saved-dir> | --config <config.json>] [--expected-version <number>]
  studio jobs pause <job-id>
  studio jobs continue <job-id>
  studio render --job <job-id> --scene <scene-id> [--data <directory>] [--browser <executable>]

Common: --data <directory> (default data), --output-root <directory> (default output/jobs).
Bound drafts also require --bundle <bundle.json> --ledger <ledger.json> to verify saved research/reviews.
Optional --alignment <reviewed-words.json>, --allow-caption-fallback, --strict are saved with each revision.
Resume uses local saved data only. Missing speech requires explicit --allow-local-synthesis; no research, Director, paid provider, approval or publishing runs.
Paused jobs stay paused; source/claim changes require a newly reviewed bound draft before continuing.
Scene-only mode renders one silent captioned clip in its measured whole-video context; all scene WAVs must already be saved/cached.
A failed input gets at most two attempts (including interrupted attempts); repair inputs/dependencies after the limit.
`;
export async function runJobsCli(
  args: string[],
  output: CliOutput,
  sceneRender = false,
): Promise<number> {
  let runner: JobRunner | undefined;
  try {
    const { values: v, positionals: p } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        data: { type: 'string' },
        'output-root': { type: 'string' },
        script: { type: 'string' },
        draft: { type: 'string' },
        config: { type: 'string' },
        narration: { type: 'string' },
        bundle: { type: 'string' },
        ledger: { type: 'string' },
        alignment: { type: 'string' },
        key: { type: 'string' },
        browser: { type: 'string' },
        job: { type: 'string' },
        scene: { type: 'string' },
        'expected-version': { type: 'string' },
        'allow-local-synthesis': { type: 'boolean' },
        'allow-caption-fallback': { type: 'boolean' },
        strict: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (v.help || !args.length) {
      output.stdout(HELP);
      return 0;
    }
    const action = sceneRender ? 'resume' : p[0];
    const id = sceneRender ? v.job : p[1];
    const allowed: Record<string, string[]> = {
      list: [],
      inspect: [],
      pause: ['expected-version'],
      continue: ['expected-version'],
      resume: [
        'browser',
        'allow-local-synthesis',
        ...(sceneRender ? ['job', 'scene'] : []),
      ],
      create: [
        'script',
        'draft',
        'config',
        'narration',
        'bundle',
        'ledger',
        'alignment',
        'key',
        'allow-caption-fallback',
        'strict',
      ],
      revise: [
        'script',
        'draft',
        'config',
        'narration',
        'bundle',
        'ledger',
        'alignment',
        'expected-version',
        'allow-caption-fallback',
        'strict',
      ],
    };
    if (
      !action ||
      !Object.hasOwn(allowed, action) ||
      p.length !==
        (sceneRender ? 0 : ['create', 'list'].includes(action) ? 1 : 2) ||
      (!['list', 'create'].includes(action) && !id) ||
      (sceneRender && !v.scene) ||
      Object.keys(v).some(
        (key) =>
          !['data', 'output-root', ...(allowed[action] ?? [])].includes(key),
      )
    )
      throw new WorkflowError(
        'CLI_USAGE_ERROR',
        'input',
        'Invalid job command or options; use jobs --help',
      );
    runner = new JobRunner(v.data, v['output-root']);
    const repo = runner.repo;
    let result: unknown;
    if (action === 'list') result = repo.list();
    else if (action === 'create') {
      const snapshot = await importSnapshot(
        {
          ...v,
          ...(v['allow-caption-fallback'] === undefined
            ? {}
            : { allowFallback: v['allow-caption-fallback'] }),
        },
        runner.cache,
      );
      result = repo.create(snapshot, v.key);
    } else if (id) {
      if (action === 'inspect')
        result = {
          job: repo.get(id),
          snapshot: repo.snapshot(id),
          steps: repo.steps(id),
          render: repo.render(id),
          providerUsage: repo.usage(id),
          diagnosticsDirectory: join(runner.dataDir, 'work', id),
          approvedForRelease: false,
        };
      else if (action === 'resume')
        result = await runner.resume(id, {
          ...(v.browser ? { browserExecutable: v.browser } : {}),
          ...(v['allow-local-synthesis'] ? { allowLocalSynthesis: true } : {}),
          ...(sceneRender && v.scene ? { sceneId: v.scene } : {}),
        });
      else {
        const job = repo.get(id);
        const leases = repo.acquire(id);
        try {
          const expected =
            v['expected-version'] === undefined
              ? job.version
              : Number(v['expected-version']);
          if (!Number.isSafeInteger(expected) || expected < 0)
            throw new WorkflowError(
              'CLI_USAGE_ERROR',
              'input',
              'Expected version must be a nonnegative integer',
            );
          if (action === 'revise') {
            const previous = repo.snapshot(id);
            const snapshot = await importSnapshot(
              {
                ...v,
                ...(v['allow-caption-fallback'] === undefined
                  ? {}
                  : { allowFallback: v['allow-caption-fallback'] }),
              },
              runner.cache,
              previous,
            );
            result = repo.revise(
              id,
              snapshot,
              leases,
              expected,
              evidenceKey(previous) !== evidenceKey(snapshot),
              Boolean(
                snapshot.provenance.draftReview && snapshot.provenance.research,
              ),
            );
          } else
            result = repo.transition(
              id,
              action === 'pause' ? 'paused' : 'queued',
              leases,
              expected,
            );
        } finally {
          repo.release(leases);
        }
      }
    }
    output.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    const failure =
      error instanceof MediaError
        ? new WorkflowError(
            error.code,
            error.stage,
            error.message,
            error.sceneId,
          )
        : error instanceof WorkflowError
          ? error
          : new WorkflowError(
              'JOB_INPUT_ERROR',
              'input',
              'Invalid JSON, local file, schema or options; input values and raw errors are not echoed',
            );
    output.stderr(
      `${JSON.stringify({ error: { code: failure.code, stage: failure.stage, sceneId: failure.sceneId, reason: failure.message } })}\n`,
    );
    return ['input', 'configuration'].includes(failure.stage)
      ? 2
      : failure.stage === 'review'
        ? 6
        : 5;
  } finally {
    runner?.close();
  }
}
