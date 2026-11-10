import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import {
  parseVideoScriptJson,
  ScriptValidationError,
} from '../domain/validation.ts';

export const HELP = `Usage:
  studio script validate --file <videoscript.json>
  studio source ingest --url <public-url> --confirm-public --output <new-directory>
  studio research ingest --file <bundle-input.json> --output <new-directory>
  studio claims --help
  studio render --script <videoscript.json> [--output <new-directory>] [--browser <executable>] [--guides]
  studio render --script <videoscript.json> --narration <saved-audio-directory> --output <new-directory> [--alignment <reviewed-words.json> | --allow-caption-fallback] [--strict]
  studio audio doctor --config <narration-config.json>
  studio audio smoke --config <config.json> --script <script.json> --scene <id> --output <new-directory> --allow-local-synthesis
  studio audio narrate --config <config.json> --script <script.json> --output <new-directory> --allow-local-synthesis
  studio --help

Validate saved scripts, render local media, or ingest explicitly confirmed public evidence. No API keys or LLM clients.
Render uses local Chrome and fonts; it never executes scene data as code.
Exit codes: 0 success/help; 2 input/JSON/schema/file error; 3 unsupported visual/component or audio not ready; 4 source/fetch/fact review blocked; 5 render/synthesis/QC failure; 6 local synthesis not opted in.
`;

export interface CliOutput {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export async function runCli(
  args: string[],
  output: CliOutput,
): Promise<number> {
  if (args[0] === 'source' || args[0] === 'claims' || args[0] === 'research') {
    const { runEvidenceCli } = await import('./evidence-cli.ts');
    return runEvidenceCli(args[0], args.slice(1), output);
  }
  if (args[0] === 'audio') {
    const { runAudioCli } = await import('./audio-cli.ts');
    return runAudioCli(args.slice(1), output);
  }
  let values: {
    file?: string;
    script?: string;
    output?: string;
    browser?: string;
    guides?: boolean;
    help?: boolean;
    narration?: string;
    alignment?: string;
    'allow-caption-fallback'?: boolean;
    strict?: boolean;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args,
      options: {
        file: { type: 'string' },
        script: { type: 'string' },
        output: { type: 'string' },
        browser: { type: 'string' },
        guides: { type: 'boolean' },
        narration: { type: 'string' },
        alignment: { type: 'string' },
        'allow-caption-fallback': { type: 'boolean' },
        strict: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
      strict: true,
    }));
  } catch {
    output.stderr(
      `${JSON.stringify({ error: { code: 'CLI_USAGE_ERROR', message: 'Invalid options. Use --help.' } })}\n`,
    );
    return 2;
  }
  if (values.help || args.length === 0) {
    output.stdout(HELP);
    return 0;
  }
  const validate =
    positionals.length === 2 &&
    positionals[0] === 'script' &&
    positionals[1] === 'validate' &&
    values.file &&
    !values.script &&
    !values.output &&
    !values.browser &&
    !values.guides &&
    !values.narration &&
    !values.alignment &&
    !values['allow-caption-fallback'] &&
    !values.strict;
  const render =
    positionals.length === 1 &&
    positionals[0] === 'render' &&
    values.script &&
    !values.file &&
    (values.narration
      ? !values.guides
      : !values.alignment &&
        !values['allow-caption-fallback'] &&
        !values.strict);
  if (
    (!validate && !render) ||
    (values.narration !== undefined && !values.narration.trim()) ||
    (values.alignment !== undefined && !values.alignment.trim())
  ) {
    output.stderr(
      `${JSON.stringify({ error: { code: 'CLI_USAGE_ERROR', message: 'Expected script validate --file <path> or render --script <path>. Use --help.' } })}\n`,
    );
    return 2;
  }

  let text: string;
  try {
    text = await readFile((render ? values.script : values.file) ?? '', 'utf8');
  } catch {
    output.stderr(
      `${JSON.stringify({ error: { code: 'FILE_READ_ERROR', message: 'Cannot read the input file as UTF-8 JSON.' } })}\n`,
    );
    return 2;
  }
  try {
    const script = parseVideoScriptJson(text);
    if (render) {
      if (values.narration) {
        const { narratedCli } = await import('./narrated-cli.ts');
        return narratedCli(
          script,
          {
            narration: values.narration,
            output: values.output,
            browser: values.browser,
            alignment: values.alignment,
            allowFallback: values['allow-caption-fallback'] ?? false,
            strict: values.strict ?? false,
          },
          output,
        );
      }
      const { renderCli } = await import('./render-cli.ts');
      return renderCli(
        script,
        {
          output: values.output,
          browser: values.browser,
          guides: values.guides,
        },
        output,
      );
    }
    output.stdout(
      `${JSON.stringify({ valid: true, script_id: script.script_id, schema_version: script.schema_version, scene_count: script.scenes.length })}\n`,
    );
    return 0;
  } catch (error) {
    if (!(error instanceof ScriptValidationError)) throw error;
    output.stderr(
      `${JSON.stringify({ error: { code: error.code, message: error.message, issues: error.issues } })}\n`,
    );
    return error.exitCode;
  }
}
