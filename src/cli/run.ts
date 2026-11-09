import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import {
  parseVideoScriptJson,
  ScriptValidationError,
} from '../domain/validation.ts';

export const HELP = `Usage:
  studio script validate --file <videoscript.json>
  studio --help

Validate VideoScript v1 locally. No API keys, network, rendering or code execution.
Exit codes: 0 success/help; 2 input/JSON/schema/file error; 3 unsupported visual/component.
`;

export interface CliOutput {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export async function runCli(
  args: string[],
  output: CliOutput,
): Promise<number> {
  let values: { file?: string; help?: boolean };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args,
      options: {
        file: { type: 'string' },
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
  if (
    positionals.length !== 2 ||
    positionals[0] !== 'script' ||
    positionals[1] !== 'validate' ||
    !values.file
  ) {
    output.stderr(
      `${JSON.stringify({ error: { code: 'CLI_USAGE_ERROR', message: 'Expected script validate --file <videoscript.json>. Use --help.' } })}\n`,
    );
    return 2;
  }

  let text: string;
  try {
    text = await readFile(values.file, 'utf8');
  } catch {
    output.stderr(
      `${JSON.stringify({ error: { code: 'FILE_READ_ERROR', message: 'Cannot read the input file as UTF-8 JSON.' } })}\n`,
    );
    return 2;
  }
  try {
    const script = parseVideoScriptJson(text);
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
