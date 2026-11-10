import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createNarrationProvider } from '../audio/provider.ts';
import { type NarrationArtifact, NarrationError } from '../audio/types.ts';
import { brandIdentity } from '../branding/identity.ts';
import { loadNarrationConfig } from '../config/narration.ts';
import {
  parseVideoScriptJson,
  ScriptValidationError,
} from '../domain/validation.ts';
import type { CliOutput } from './run.ts';

const HELP = `Usage:
  studio audio doctor --config <config.json>
  studio audio smoke --config <config.json> --script <script.json> --scene <id> --output <new-directory> --allow-local-synthesis
  studio audio narrate --config <config.json> --script <script.json> --output <new-directory> --allow-local-synthesis

Local CPU speech only. No model downloads or API subscription. Real synthesis requires explicit --allow-local-synthesis.
Mock config produces test tones, never speech. Exits: 0 success; 2 config/input; 3 not ready; 5 synthesis/QC; 6 local synthesis not opted in.
`;

export async function runAudioCli(
  args: string[],
  output: CliOutput,
): Promise<number> {
  const emit = (
    code: string,
    reason: string,
    exit: number,
    sceneId: string | null = null,
  ) => {
    output.stderr(`${JSON.stringify({ error: { code, reason, sceneId } })}\n`);
    return exit;
  };
  let parsed: {
    values: {
      config?: string;
      script?: string;
      scene?: string;
      output?: string;
      'allow-local-synthesis'?: boolean;
      help?: boolean;
    };
    positionals: string[];
  };
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        config: { type: 'string' },
        script: { type: 'string' },
        scene: { type: 'string' },
        output: { type: 'string' },
        'allow-local-synthesis': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch {
    return emit(
      'CLI_USAGE_ERROR',
      'Invalid audio options; use audio --help',
      2,
    );
  }
  const { values, positionals } = parsed;
  if (values.help || !args.length) {
    output.stdout(HELP);
    return 0;
  }
  const command = positionals[0];
  if (
    positionals.length !== 1 ||
    !['doctor', 'smoke', 'narrate'].includes(command ?? '') ||
    !values.config ||
    (command === 'doctor' &&
      (values.script ||
        values.output ||
        values.scene ||
        values['allow-local-synthesis'])) ||
    (command !== 'doctor' && (!values.script || !values.output)) ||
    (command === 'smoke' && !values.scene) ||
    (command === 'narrate' && values.scene)
  )
    return emit(
      'CLI_USAGE_ERROR',
      'Use audio doctor, smoke or narrate with the documented flags',
      2,
    );
  let config: Awaited<ReturnType<typeof loadNarrationConfig>>;
  try {
    config = await loadNarrationConfig(values.config);
  } catch {
    return emit(
      'CONFIG_INVALID',
      'Cannot load the strict narration config; check JSON, paths, hashes, voice settings and resource limits',
      2,
    );
  }
  const provider = createNarrationProvider(config);
  if (command === 'doctor') {
    const health = await provider.health();
    output.stdout(`${JSON.stringify(health, null, 2)}\n`);
    return health.ready ? 0 : 3;
  }
  if (config.provider === 'kokoro-onnx' && !values['allow-local-synthesis'])
    return emit(
      'LOCAL_SYNTHESIS_OPT_IN_REQUIRED',
      'Pass --allow-local-synthesis to run installed local Kokoro; no downloads will occur',
      6,
    );
  let script: ReturnType<typeof parseVideoScriptJson>;
  try {
    script = parseVideoScriptJson(await readFile(values.script ?? '', 'utf8'));
  } catch (error) {
    return emit(
      error instanceof ScriptValidationError
        ? error.code
        : 'SCRIPT_READ_FAILED',
      'Provide a readable schema-valid VideoScript file',
      2,
    );
  }
  const scenes =
    command === 'smoke'
      ? script.scenes.filter((scene) => scene.scene_id === values.scene)
      : script.scenes;
  if (!scenes.length)
    return emit(
      'SCENE_NOT_FOUND',
      'The requested scene ID is absent from this script',
      2,
    );
  const health = await provider.health();
  if (!health.ready) {
    const failed = health.checks.find((check) => !check.ok);
    return emit(
      failed?.code ?? 'NOT_READY',
      failed?.reason ?? 'Narration provider is not ready',
      3,
    );
  }
  const folder = resolve(values.output ?? '');
  try {
    await mkdir(dirname(folder), { recursive: true });
    await mkdir(folder);
  } catch {
    return emit(
      'OUTPUT_EXISTS',
      'Choose a fresh writable output directory; existing scene files are preserved',
      5,
    );
  }
  const artifacts: NarrationArtifact[] = [];
  try {
    for (const scene of scenes)
      artifacts.push(
        await provider.synthesize({
          sceneId: scene.scene_id,
          text: scene.narration,
          outputDir: folder,
        }),
      );
    const manifest = {
      schemaVersion: '1.0.0',
      kind: 'narration-only',
      brand: brandIdentity('brand' in script ? script.brand : undefined),
      status: 'complete',
      provider: provider.id,
      isMock: provider.id === 'mock',
      approvedForRelease: false,
      scriptId: script.script_id,
      revision: script.revision,
      artifacts,
    };
    await writeFile(
      join(folder, 'narration-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: 'wx' },
    );
    output.stdout(
      `${JSON.stringify({ narrated: true, provider: provider.id, isMock: provider.id === 'mock', output: folder, scenes: artifacts.length, artifacts: artifacts.map((item) => ({ sceneId: item.sceneId, wavPath: item.wavPath, durationSeconds: item.durationSeconds, sha256: item.sha256 })) }, null, 2)}\n`,
    );
    return 0;
  } catch (error) {
    const failure =
      error instanceof NarrationError
        ? error
        : new NarrationError(
            'NARRATION_FAILED',
            'Narration failed; check the local runtime and output permissions',
          );
    await writeFile(
      join(folder, 'narration-manifest.json'),
      `${JSON.stringify({ status: 'failed', provider: provider.id, isMock: provider.id === 'mock', artifacts, error: { code: failure.code, sceneId: failure.sceneId, reason: failure.message } }, null, 2)}\n`,
    );
    return emit(failure.code, failure.message, 5, failure.sceneId);
  }
}
