import { readFile } from 'node:fs/promises';
import type { VideoScript } from '../domain/videoscript.ts';
import { MediaError } from '../media/error.ts';
import { renderNarratedPreview } from '../media/pipeline.ts';
import { RenderInputError } from '../renderers/remotion/plan.ts';
import type { CliOutput } from './run.ts';

export async function narratedCli(
  script: VideoScript,
  options: {
    narration: string;
    output: string | undefined;
    browser: string | undefined;
    alignment: string | undefined;
    allowFallback: boolean;
    strict: boolean;
  },
  output: CliOutput,
) {
  try {
    let alignment: unknown;
    if (options.alignment) {
      try {
        alignment = JSON.parse(await readFile(options.alignment, 'utf8'));
      } catch {
        throw new MediaError(
          'ALIGNMENT_READ_FAILED',
          'timing',
          null,
          'Provide a readable reviewed alignment JSON file',
        );
      }
    }
    const result = await renderNarratedPreview(script, {
      outputDir: options.output ?? `output/${script.script_id}/narrated`,
      narrationDir: options.narration,
      browserExecutable:
        options.browser ??
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      allowFallback: options.allowFallback,
      strict: options.strict,
      ...(alignment === undefined ? {} : { alignment }),
      onProgress: (text) => output.stderr(`${text}\n`),
    });
    output.stdout(
      `${JSON.stringify({ rendered: true, output: result.outputDir, frames: result.manifest.durationFrames, videoSha256: result.manifest.videoSha256, requiresTimingReview: result.timeline.requiresTimingReview, approvedForRelease: false })}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof MediaError) {
      output.stderr(
        `${JSON.stringify({ error: { code: error.code, stage: error.stage, sceneId: error.sceneId, affectedSceneIds: error.sceneId ? [error.sceneId] : script.scenes.map((s) => s.scene_id), reason: error.message } })}\n`,
      );
      return 5;
    }
    if (error instanceof RenderInputError) {
      output.stderr(
        `${JSON.stringify({ error: { code: error.code, stage: 'visual-preflight', sceneId: error.scene_id, path: error.path, reason: error.message } })}\n`,
      );
      return 3;
    }
    throw error;
  }
}
