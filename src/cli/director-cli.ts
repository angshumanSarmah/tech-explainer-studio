import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import {
  DirectorBriefSchema,
  directorContract,
} from '../director/contracts.ts';
import {
  type DirectorDraft,
  DirectorError,
  generateDraft,
  importDraft,
  makeRequest,
  reviewDraft,
} from '../director/core.ts';
import {
  externalPrompt,
  PROMPT_VERSION,
  PROMPTS,
  promptHash,
} from '../director/prompts.ts';
import { ScriptValidationError } from '../domain/validation.ts';
import { DeepSeekConfigSchema, DeepSeekProvider } from '../llm/deepseek.ts';
import {
  LLMError,
  type LLMProvider,
  MockLLMProvider,
} from '../llm/provider.ts';
import { digest } from '../sources/snapshot.ts';
import type { CliOutput } from './run.ts';

const HELP = `Usage:
  studio director export --output <new-directory> [--bundle <bundle.json> --ledger <approved-ledger.json>] [--brief <brief.json>]
  studio director import --file <videoscript.json> --output <new-directory> [--bundle <bundle.json> --ledger <approved-ledger.json>]
  studio director validate --file <videoscript.json> [--bundle <bundle.json> --ledger <approved-ledger.json>]
  studio director review --draft <draft.json> --reviewer <name> --rationale <text> --output <new-directory> [--bundle <bundle.json> --ledger <approved-ledger.json>]
  studio plan --bundle <bundle.json> --ledger <approved-ledger.json> --output <new-directory> [--brief <brief.json>] [--topic <topic>] --provider mock --mock-script <local-response.json> [--max-repairs 0|1]
  studio plan --bundle <bundle.json> --ledger <approved-ledger.json> --output <new-directory> --provider deepseek --config <llm-config.json> --max-api-usd <cap> --allow-paid
  studio plan --bundle <bundle.json> --ledger <approved-ledger.json> --output <new-directory> --dry-run

No provider/key for manual commands. DeepSeek is opt-in usage-priced. Dry-run exports the request without calling a model.
Drafts and reviewed previews never grant fact, timing, rights or release approval. Renderer uses saved videoscript.json.
Exit: 0 success; 2 input/usage/schema; 4 research/review/policy; 7 provider/budget.
`;
async function text(file: string) {
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size > 2097152)
      throw new DirectorError(
        'INPUT_LIMIT',
        'Local JSON must be a file at most 2 MiB',
      );
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error instanceof DirectorError) throw error;
    const missing =
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      ['ENOENT', 'ENOTDIR'].includes(String(error.code));
    throw new DirectorError(
      missing ? 'INPUT_NOT_FOUND' : 'INPUT_READ_FAILED',
      missing
        ? 'Local input file not found. Supply an existing JSON file. For the included HTTP example, run npm run demo:manual-http.'
        : 'Cannot read the local input file. Check its path and read permissions.',
    );
  }
}
async function json(file: string | undefined) {
  if (!file) return undefined;
  try {
    return JSON.parse(await text(file)) as unknown;
  } catch (error) {
    if (error instanceof DirectorError) throw error;
    throw new DirectorError(
      'JSON_INPUT',
      'Provide readable complete JSON; inputs are not echoed',
    );
  }
}
async function folder(path: string | undefined) {
  if (!path)
    throw new DirectorError('OUTPUT_REQUIRED', 'Use a fresh output directory');
  const out = resolve(path);
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out);
  return out;
}
async function save(out: string, name: string, value: unknown) {
  await writeFile(
    join(out, name),
    typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
    { flag: 'wx', mode: 0o600 },
  );
}
async function persist(out: string, draft: DirectorDraft) {
  await save(out, 'draft.json', draft);
  await save(out, 'videoscript.json', draft.script);
  return {
    output: out,
    script: join(out, 'videoscript.json'),
    draft: join(out, 'draft.json'),
    reviewIssues: draft.reviewIssues,
    requiresHumanReview: true,
    approvedForRelease: false,
  };
}
export async function runDirectorCli(
  group: 'director' | 'plan',
  args: string[],
  output: CliOutput,
): Promise<number> {
  let activeProvider: LLMProvider | undefined;
  try {
    const { values: v, positionals: p } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        file: { type: 'string' },
        output: { type: 'string' },
        bundle: { type: 'string' },
        ledger: { type: 'string' },
        brief: { type: 'string' },
        topic: { type: 'string' },
        draft: { type: 'string' },
        reviewer: { type: 'string' },
        rationale: { type: 'string' },
        provider: { type: 'string' },
        config: { type: 'string' },
        'mock-script': { type: 'string' },
        'max-api-usd': { type: 'string' },
        'max-repairs': { type: 'string' },
        'allow-paid': { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (v.help || (group === 'director' && !args.length)) {
      output.stdout(HELP);
      return 0;
    }
    const command = group === 'plan' ? 'plan' : p[0];
    const allowed: Record<string, string[]> = {
      export: ['output', 'bundle', 'ledger', 'brief'],
      import: ['file', 'output', 'bundle', 'ledger'],
      validate: ['file', 'bundle', 'ledger'],
      review: ['draft', 'output', 'bundle', 'ledger', 'reviewer', 'rationale'],
      plan: [
        'output',
        'bundle',
        'ledger',
        'brief',
        'topic',
        'provider',
        'config',
        'mock-script',
        'max-api-usd',
        'max-repairs',
        'allow-paid',
        'dry-run',
      ],
    };
    if (
      !command ||
      !allowed[command] ||
      (group === 'director' ? p.length !== 1 : p.length !== 0) ||
      Object.keys(v).some((k) => !allowed[command]?.includes(k))
    )
      throw new DirectorError(
        'CLI_USAGE',
        'Options do not match director/plan command; use --help',
      );
    if (Boolean(v.bundle) !== Boolean(v.ledger))
      throw new DirectorError(
        'RESEARCH_REQUIRED',
        'Provide --bundle and --ledger together',
      );
    const bundle = await json(v.bundle),
      ledger = await json(v.ledger);
    const example = await text(
      fileURLToPath(
        new URL('../../examples/http-server.videoscript.json', import.meta.url),
      ),
    );
    const validatedExample = importDraft(example).script;
    if (command === 'export') {
      const contract = directorContract(validatedExample);
      const request = bundle
        ? makeRequest(bundle, ledger, await json(v.brief), validatedExample)
        : {
            system: externalPrompt(),
            data: {
              brief: v.brief
                ? DirectorBriefSchema.parse(await json(v.brief))
                : null,
              research: null,
              limitation:
                'No approved research attached; human fact review required',
            },
          };
      const out = await folder(v.output);
      await save(out, 'contract.json', contract);
      await save(out, 'videoscript.schema.json', contract.schema);
      await save(out, 'animation-catalog.json', contract.catalog);
      await save(out, 'example.videoscript.json', validatedExample);
      await save(out, 'external-director.md', externalPrompt());
      await save(out, 'request.json', request);
      for (const [name, prompt] of Object.entries(PROMPTS))
        await save(out, `${name}-v1.md`, prompt);
      await save(out, 'export-manifest.json', {
        version: PROMPT_VERSION,
        promptSha256: promptHash,
        contractSha256: digest(JSON.stringify(contract)),
        requestSha256: digest(JSON.stringify(request)),
        approvedForRelease: false,
      });
      output.stdout(
        `${JSON.stringify({ exported: true, output: out, networkUsed: false })}\n`,
      );
      return 0;
    }
    if (command === 'import' || command === 'validate') {
      if (!v.file)
        throw new DirectorError(
          'INPUT_REQUIRED',
          'Provide --file with a local VideoScript JSON',
        );
      const draft = importDraft(await text(v.file), {
        ...(bundle !== undefined ? { bundle, ledger } : {}),
      });
      output.stdout(
        `${JSON.stringify(command === 'validate' ? { valid: true, reviewIssues: draft.reviewIssues, approvedForRelease: false } : await persist(await folder(v.output), draft))}\n`,
      );
      return 0;
    }
    if (command === 'review') {
      if (!v.draft || !v.reviewer || !v.rationale)
        throw new DirectorError(
          'REVIEW_REQUIRED',
          'Provide local --draft, --reviewer and --rationale',
        );
      const draft = reviewDraft(await json(v.draft), v.reviewer, v.rationale, {
        ...(bundle !== undefined ? { bundle, ledger } : {}),
      });
      output.stdout(
        `${JSON.stringify(await persist(await folder(v.output), draft))}\n`,
      );
      return 0;
    }
    if (!bundle || !ledger)
      throw new DirectorError(
        'RESEARCH_REQUIRED',
        'Planning needs an exact bundle and human-approved ledger',
      );
    const base =
      (await json(v.brief)) ??
      (bundle as { instructions?: unknown }).instructions;
    const brief = DirectorBriefSchema.parse(
      v.topic ? { ...(base as object), topic: v.topic } : base,
    );
    const request = makeRequest(bundle, ledger, brief, validatedExample);
    if (v['dry-run']) {
      const out = await folder(v.output);
      await save(out, 'request.json', request);
      output.stdout(
        `${JSON.stringify({ dryRun: true, output: out, providerCalled: false })}\n`,
      );
      return 0;
    }
    const providerId = v.provider ?? 'mock';
    if (!['mock', 'deepseek'].includes(providerId))
      throw new DirectorError(
        'PROVIDER_UNSUPPORTED',
        'Use mock or explicitly authorized DeepSeek; other adapters remain planned',
      );
    if (
      providerId === 'mock' &&
      (v['allow-paid'] || v.config || v['max-api-usd'])
    )
      throw new DirectorError(
        'CLI_USAGE',
        'Mock planning takes --mock-script; paid options apply only to DeepSeek',
      );
    let provider: MockLLMProvider | DeepSeekProvider;
    if (providerId === 'mock') {
      if (!v['mock-script'])
        throw new DirectorError(
          'MOCK_REQUIRED',
          'Supply --mock-script for deterministic model-free planning',
        );
      provider = new MockLLMProvider([await text(v['mock-script'])]);
    } else {
      if (!v['max-api-usd'] || !v.config || v['mock-script'])
        throw new DirectorError(
          'BUDGET_REQUIRED',
          'DeepSeek needs --config, --max-api-usd and --allow-paid',
        );
      const config = DeepSeekConfigSchema.parse(await json(v.config));
      const cap = z
        .number()
        .positive()
        .max(config.maxApiUsd)
        .parse(Number(v['max-api-usd']));
      provider = new DeepSeekProvider(
        { ...config, maxApiUsd: cap },
        { allowPaid: v['allow-paid'] ?? false },
      );
    }
    activeProvider = provider;
    const draft = await generateDraft(
      provider,
      bundle,
      ledger,
      brief,
      validatedExample,
      {
        maxRepairs: z
          .int()
          .min(0)
          .max(1)
          .parse(v['max-repairs'] ? Number(v['max-repairs']) : 1),
      },
    );
    output.stdout(
      `${JSON.stringify(await persist(await folder(v.output), draft))}\n`,
    );
    return 0;
  } catch (error) {
    const known =
      error instanceof DirectorError ||
      error instanceof LLMError ||
      error instanceof ScriptValidationError;
    const code = known
      ? error.code
      : error instanceof z.ZodError
        ? 'DIRECTOR_SCHEMA_INVALID'
        : 'DIRECTOR_INPUT_ERROR';
    const issues =
      error instanceof DirectorError || error instanceof ScriptValidationError
        ? error.issues.map((i) => ({ path: i.path, reason: i.reason }))
        : error instanceof z.ZodError
          ? error.issues.map((i) => ({
              path: `$.${i.path.join('.')}`,
              reason: 'Field does not match the supported contract',
            }))
          : [];
    output.stderr(
      `${JSON.stringify({ error: { code, reason: known ? error.message : 'Invalid JSON, options, schema or local file operation; inputs/keys are not echoed', issues, ...(activeProvider ? { usage: activeProvider.accounting() } : {}) } })}\n`,
    );
    return error instanceof LLMError
      ? 7
      : error instanceof DirectorError &&
          [
            'FACTS_NOT_APPROVED',
            'SOURCE_URL_INVALID',
            'RESEARCH_MISMATCH',
            'EVIDENCE_BINDING_INVALID',
            'UNSAFE_SCRIPT',
            'STALE_DRAFT',
            'UNSUPPORTED_VISUAL',
            'NEEDS_REVIEW',
          ].includes(error.code)
        ? 4
        : 2;
  }
}
