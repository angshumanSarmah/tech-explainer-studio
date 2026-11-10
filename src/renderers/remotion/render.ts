import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import {
  openBrowser,
  renderMedia,
  renderStill,
  selectComposition,
} from '@remotion/renderer';
import { VERSION } from 'remotion';
import { parseVideoScript } from '../../domain/validation.ts';
import type { VideoScriptV1 } from '../../domain/videoscript.ts';
import {
  type Presentation,
  resolvePresentation,
} from '../../timing/timeline.ts';
import type { CompositionProps } from './Composition.tsx';
import { executeFile, executeMedia, probeSilentVideo } from './media-tools.ts';
import { planSilentRender } from './plan.ts';
import { THEME, VIDEO } from './theme.ts';

export const sha256 = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

export class RenderStageError extends Error {
  readonly code = 'RENDER_FAILED';
  readonly stage: string;
  readonly scene_id: string | null;
  constructor(stage: string, scene_id: string | null, reason: string) {
    super(reason);
    this.name = 'RenderStageError';
    this.stage = stage;
    this.scene_id = scene_id;
  }
}

export interface RenderOptions {
  outputDir: string;
  browserExecutable: string;
  guides?: boolean;
  onProgress?: (text: string) => void;
  presentation?: Presentation;
}

export async function renderSilentPreview(
  input: VideoScriptV1,
  options: RenderOptions,
) {
  const script = parseVideoScript(input);
  const plan = options.presentation
    ? resolvePresentation(script, options.presentation)
    : planSilentRender(script);
  try {
    await access(options.browserExecutable);
  } catch {
    throw new RenderStageError(
      'browser',
      null,
      'Provide an existing Chrome/Chromium executable with --browser; automatic browser downloads are disabled',
    );
  }
  const outputDir = resolve(options.outputDir);
  let scratch: string;
  // An exclusive directory prevents overwriting existing previews or reviewed goldens.
  try {
    await mkdir(dirname(outputDir), { recursive: true });
    await mkdir(outputDir);
    scratch = await mkdtemp(join(outputDir, '.render-'));
  } catch {
    throw new RenderStageError(
      'output',
      null,
      'Output directory already exists or cannot be created; choose a new --output directory',
    );
  }
  let stage = 'bundle';
  let sceneId: string | null = null;
  let browser: Awaited<ReturnType<typeof openBrowser>> | undefined;
  try {
    options.onProgress?.('Bundling local components and fonts');
    const entryPoint = fileURLToPath(
      new URL(
        import.meta.url.endsWith('.ts') ? './entry.tsx' : './entry.js',
        import.meta.url,
      ),
    );
    const serveUrl = await bundle({
      entryPoint,
      outDir: join(scratch, 'bundle'),
      enableCaching: false,
      gitSource: null,
      askAIEnabled: false,
      interactivityEnabled: false,
    });
    stage = 'browser';
    browser = await openBrowser('chrome', {
      browserExecutable: options.browserExecutable,
      chromiumOptions: {
        disableWebSecurity: false,
        ignoreCertificateErrors: false,
        gl: 'swangle',
      },
      logLevel: 'error',
    });
    const common = {
      serveUrl,
      puppeteerInstance: browser,
      browserExecutable: options.browserExecutable,
      logLevel: 'error' as const,
      envVariables: {},
      licenseKey: null,
      isProduction: false,
    };
    const inputProps: CompositionProps = {
      script,
      guides: options.guides ?? false,
      ...(options.presentation ? { presentation: options.presentation } : {}),
    };
    stage = 'composition';
    const composition = await selectComposition({
      ...common,
      id: 'TechExplainerSilent',
      inputProps,
    });
    stage = 'frames';
    const stills: {
      file: string;
      frame: number;
      scene_id: string;
      phase: string;
      sha256: string;
    }[] = [];
    async function still(
      file: string,
      props: typeof inputProps,
      frame: number,
      phase: string,
      scene_id: string,
    ) {
      sceneId = scene_id;
      const comp = await selectComposition({
        ...common,
        id: 'TechExplainerSilent',
        inputProps: props,
      });
      await renderStill({
        ...common,
        composition: comp,
        inputProps: props,
        frame,
        imageFormat: 'png',
        output: join(scratch, file),
        overwrite: false,
      });
      stills.push({
        file,
        frame,
        scene_id,
        phase,
        sha256: sha256(await readFile(join(scratch, file))),
      });
    }
    for (const item of plan.scenes) {
      const phase =
        item.scene.visual.type === 'title-card'
          ? item.scene.visual.variant
          : item.scene.visual.props.visualPhase;
      await still(
        `${item.scene.scene_id}.png`,
        inputProps,
        options.presentation
          ? Math.floor(
              ((options.presentation.captions.find(
                (c) => c.sceneId === item.scene.scene_id,
              )?.startFrame ?? item.from) +
                (options.presentation.captions.find(
                  (c) => c.sceneId === item.scene.scene_id,
                )?.endFrame ?? item.from + item.durationFrames)) /
                2,
            )
          : item.from + Math.round((item.durationFrames - 1) * 0.6),
        phase,
        item.scene.scene_id,
      );
    }
    const sourceScene = script.scenes.find(
      (item) => item.visual.type === 'tech-animation',
    );
    const responseScene = script.scenes.find(
      (item) =>
        item.visual.type === 'tech-animation' && item.visual.props.response,
    );
    const galleryInputs: VideoScriptV1[] = [];
    if (
      !options.presentation &&
      sourceScene?.visual.type === 'tech-animation'
    ) {
      for (const phase of ['idle', 'overview'] as const) {
        const gallery = structuredClone(script);
        const single = structuredClone(sourceScene);
        if (single.visual.type !== 'tech-animation')
          throw new Error('Unreachable visual type');
        single.scene_id = `gallery-${phase}`;
        single.visual.props.visualPhase = phase;
        single.visual.props.focus = 'overview';
        single.visual.props.show.handler = true;
        if (
          responseScene?.visual.type === 'tech-animation' &&
          responseScene.visual.props.response
        )
          single.visual.props.response = structuredClone(
            responseScene.visual.props.response,
          );
        single.visual.cues = [];
        gallery.scenes = [single];
        const validated = parseVideoScript(gallery);
        const galleryPlan = planSilentRender(validated);
        galleryInputs.push(validated);
        await still(
          `${single.scene_id}.png`,
          { script: validated, guides: false },
          Math.round((galleryPlan.durationFrames - 1) * 0.8),
          phase,
          single.scene_id,
        );
      }
    }
    sceneId = null;
    stage = 'video';
    options.onProgress?.(`Rendering ${plan.durationFrames} frames`);
    let lastPercent = -10;
    await renderMedia({
      ...common,
      composition,
      inputProps,
      outputLocation: join(scratch, 'video.mp4'),
      codec: 'h264',
      pixelFormat: 'yuv420p',
      imageFormat: 'png',
      crf: 18,
      x264Preset: 'medium',
      concurrency: 4,
      muted: true,
      enforceAudioTrack: false,
      overwrite: false,
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 10) * 10;
        if (percent > lastPercent) {
          options.onProgress?.(`${percent}%`);
          lastPercent = percent;
        }
      },
    });
    stage = 'ffprobe';
    const qc = await probeSilentVideo(
      join(scratch, 'video.mp4'),
      plan.durationFrames,
    );
    const { stdout: browserVersion } = await executeFile(
      options.browserExecutable,
      ['--version'],
    );
    const { stdout: ffmpegVersion } = await executeMedia('ffmpeg', [
      '-version',
    ]);
    const fontPath = fileURLToPath(
      import.meta.resolve(
        '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
      ),
    );
    const manifest = {
      kind: options.presentation ? 'narrated-visuals' : 'silent-preview',
      approvedForRelease: false,
      script_id: script.script_id,
      scriptRevision: script.revision,
      scriptSha256: sha256(JSON.stringify(script)),
      videoSha256: sha256(await readFile(join(scratch, 'video.mp4'))),
      ...VIDEO,
      durationFrames: plan.durationFrames,
      timingMode: options.presentation
        ? 'measured-narration-visuals'
        : 'silent-preview-estimates',
      measuredAudio: Boolean(options.presentation),
      scenes: plan.scenes.map(({ scene, from, durationFrames }) => ({
        scene_id: scene.scene_id,
        from,
        durationFrames,
        visual: scene.visual.type,
        phase:
          scene.visual.type === 'tech-animation'
            ? scene.visual.props.visualPhase
            : scene.visual.variant,
      })),
      tools: {
        remotion: VERSION,
        node: process.version,
        browser: browserVersion.trim(),
        ffmpeg: ffmpegVersion.split('\n')[0],
        fontPackage: '@fontsource-variable/inter@5.3.0',
        fontSha256: sha256(await readFile(fontPath)),
        platform: process.platform,
        arch: process.arch,
      },
      theme: THEME.version,
      guides: options.guides ?? false,
      encoder: {
        codec: 'h264',
        pixelFormat: 'yuv420p',
        crf: 18,
        preset: 'medium',
        concurrency: 4,
        screenshotFormat: 'png',
      },
      stills,
      media: qc.summary,
      limitations: [
        'Silent duration estimates are not measured narration timing',
        'Bitwise identity is only tested under the recorded browser, platform, fonts and encoder',
        'Platform safe guides need a human device review; this is not release approval',
      ],
    };
    await writeFile(
      join(scratch, 'render-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await writeFile(
      join(scratch, 'ffprobe.json'),
      `${JSON.stringify(qc.raw, null, 2)}\n`,
    );
    await writeFile(
      join(scratch, 'gallery-inputs.json'),
      `${JSON.stringify(galleryInputs, null, 2)}\n`,
    );
    for (const file of [
      'video.mp4',
      'render-manifest.json',
      'ffprobe.json',
      'gallery-inputs.json',
      ...stills.map((item) => item.file),
    ])
      await rename(join(scratch, file), join(outputDir, file));
    return { outputDir, manifest };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Unknown renderer failure';
    sceneId ??=
      script.scenes.find((s) => reason.includes(s.scene_id))?.scene_id ?? null;
    await writeFile(
      join(outputDir, 'render-error.json'),
      `${JSON.stringify({ stage, scene_id: sceneId, reason }, null, 2)}\n`,
    );
    throw error instanceof RenderStageError
      ? error
      : new RenderStageError(stage, sceneId, reason);
  } finally {
    await browser?.close({ silent: true });
    await rm(scratch, { recursive: true, force: true });
  }
}
