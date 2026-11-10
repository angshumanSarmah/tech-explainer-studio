import type { VideoScript } from '../domain/videoscript.ts';
import { RenderInputError } from '../renderers/remotion/plan.ts';
import {
  RenderStageError,
  renderSilentPreview,
} from '../renderers/remotion/render.ts';
import type { CliOutput } from './run.ts';

export async function renderCli(
  script: VideoScript,
  options: {
    output: string | undefined;
    browser: string | undefined;
    guides: boolean | undefined;
  },
  output: CliOutput,
) {
  try {
    const result = await renderSilentPreview(script, {
      outputDir: options.output ?? `output/${script.script_id}/silent`,
      browserExecutable:
        options.browser ??
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      guides: options.guides ?? false,
      onProgress: (text) => output.stderr(`${text}\n`),
    });
    output.stdout(
      `${JSON.stringify({ rendered: true, output: result.outputDir, frames: result.manifest.durationFrames, videoSha256: result.manifest.videoSha256, timingMode: result.manifest.timingMode })}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof RenderInputError) {
      output.stderr(
        `${JSON.stringify({ error: { code: error.code, scene_id: error.scene_id, path: error.path, reason: error.message } })}\n`,
      );
      return 3;
    }
    if (error instanceof RenderStageError) {
      output.stderr(
        `${JSON.stringify({ error: { code: error.code, stage: error.stage, scene_id: error.scene_id, reason: error.message } })}\n`,
      );
      return 5;
    }
    throw error;
  }
}
