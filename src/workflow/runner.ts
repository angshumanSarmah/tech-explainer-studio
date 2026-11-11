import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { NarrationProvider } from '../audio/types.ts';
import { brandIdentity } from '../branding/identity.ts';
import type { VideoScript } from '../domain/videoscript.ts';
import { loadNarrationAsset } from '../media/narration-input.ts';
import { renderNarratedPreview } from '../media/pipeline.ts';
import { checkTiming, runMedia } from '../media/qc.ts';
import { hash } from '../render-manifest/manifest.ts';
import { probeSilentVideo } from '../renderers/remotion/media-tools.ts';
import {
  type RenderOptions,
  renderSilentPreview,
} from '../renderers/remotion/render.ts';
import { AssetCache } from '../storage/cache.ts';
import { Repository } from '../storage/repository.ts';
import { planNarratedRender } from '../timing/timeline.ts';
import { preflightVisualAssets } from '../visual-assets/store.ts';
import {
  audioKey,
  fingerprint,
  implementationIdentity,
  narratorConfig,
  sceneKey,
  visualBrand,
} from './dependencies.ts';
import { type FileGroup, WorkflowError } from './model.ts';

export interface WorkflowDependencies {
  // Explicit injection for tests, never selectable through scene data or CLI flags.
  renderScene?: (
    script: VideoScript,
    options: RenderOptions,
  ) => Promise<{ outputDir: string; manifest: unknown }>;
  adapterId?: string;
  onStep?: (event: { stage: string; sceneId: string; cached: boolean }) => void;
}
export class JobRunner {
  readonly repo: Repository;
  readonly cache: AssetCache;
  readonly dataDir: string;
  readonly outputDir: string;
  readonly deps: WorkflowDependencies;
  constructor(
    dataDir = 'data',
    outputDir = 'output/jobs',
    deps: WorkflowDependencies = {},
  ) {
    this.dataDir = resolve(dataDir);
    this.outputDir = resolve(outputDir);
    this.deps = deps;
    if (Boolean(deps.renderScene) !== Boolean(deps.adapterId))
      throw new WorkflowError(
        'ADAPTER_ID_REQUIRED',
        'configuration',
        'A test renderer needs an explicit stable adapter identity',
      );
    this.repo = new Repository(join(this.dataDir, 'studio.sqlite'));
    this.cache = new AssetCache(join(this.dataDir, 'cache'), this.repo);
  }
  close() {
    this.repo.close();
  }
  async resume(
    id: string,
    options: {
      browserExecutable?: string;
      allowLocalSynthesis?: boolean;
      sceneId?: string;
    } = {},
  ) {
    const leases = this.repo.acquire(id, 120000, true);
    let leaseError: unknown;
    const heartbeat = setInterval(() => {
      try {
        this.repo.heartbeat(leases);
      } catch (error) {
        leaseError = error;
      }
    }, 15000);
    heartbeat.unref();
    const fence = () => {
      if (leaseError) throw leaseError;
      this.repo.guard(id, leases);
    };
    const browser =
      options.browserExecutable ??
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    let work = '';
    let activeScene: string | null = null;
    let stage = 'preflight';
    try {
      const snapshot = this.repo.snapshot(id);
      await preflightVisualAssets(snapshot.script);
      const originalState = this.repo.get(id).status;
      if (
        originalState === 'paused' ||
        originalState === 'needs_review' ||
        snapshot.requiresEvidenceReview
      )
        throw new WorkflowError(
          'REVIEW_PAUSED',
          'review',
          'Job remains paused or needs evidence review; render-only resume cannot approve or regenerate research',
        );
      if (
        options.sceneId &&
        !snapshot.script.scenes.some((s) => s.scene_id === options.sceneId)
      )
        throw new WorkflowError(
          'SCENE_NOT_FOUND',
          'scene',
          'Scene is not in this job revision',
          options.sceneId,
        );
      this.repo.transition(id, 'running', leases);
      const impl = await implementationIdentity(browser, this.deps.adapterId);
      await mkdir(join(this.dataDir, 'work', id), { recursive: true });
      work = await mkdtemp(join(this.dataDir, 'work', id, 'attempt-'));
      const step = async (
        name: 'audio' | 'scene' | 'assembly',
        scene: string,
        key: string,
        compute: (dir: string) => Promise<void>,
      ) => {
        stage = name;
        activeScene = scene || null;
        fence();
        let files = await this.cache.lookup(key);
        const old = this.repo
          .steps(id)
          .find(
            (s) =>
              s.stage === name && s.sceneId === scene && s.inputHash === key,
          );
        if (
          files &&
          old?.status === 'succeeded' &&
          old.outputHash === fingerprint(files)
        ) {
          this.deps.onStep?.({ stage: name, sceneId: scene, cached: true });
          return files;
        }
        const stepId = this.repo.beginStep(id, name, scene, key, leases);
        const cached = Boolean(files);
        try {
          if (!files) {
            const dir = join(
              work,
              `${name}-${scene || 'final'}-${randomUUID()}`,
            );
            await compute(dir);
            fence();
            files = await this.cache.capture(dir);
          }
          fence();
          this.repo.completeStep(id, stepId, key, files, leases);
          this.deps.onStep?.({ stage: name, sceneId: scene, cached });
          return files;
        } catch (error) {
          fence();
          const diagnostic = diagnosticFor(error, name, scene || null);
          this.repo.failStep(
            id,
            stepId,
            diagnostic.code,
            diagnostic.stage,
            diagnostic.sceneId,
            leases,
          );
          throw diagnostic;
        }
      };
      let provider: NarrationProvider | undefined;
      const audioDir = join(work, 'narration');
      await mkdir(audioDir);
      const assets: Awaited<ReturnType<typeof loadNarrationAsset>>[] = [];
      for (const scene of snapshot.script.scenes) {
        const saved = Object.hasOwn(snapshot.savedAudio, scene.scene_id)
          ? snapshot.savedAudio[scene.scene_id]
          : undefined;
        const narrator = saved
          ? { savedFiles: saved }
          : snapshot.config
            ? narratorConfig(snapshot.config)
            : null;
        const key = audioKey(scene, narrator, impl.audio);
        const cached = await this.cache.lookup(key);
        if (options.sceneId && !saved && !cached)
          throw new WorkflowError(
            'TIMELINE_CONTEXT_MISSING',
            'audio',
            'Scene-only rendering needs saved or already cached measured WAVs for every scene; resume narration first',
            scene.scene_id,
          );
        const files = await step('audio', scene.scene_id, key, async (dir) => {
          if (saved) {
            await this.cache.hydrate(saved, dir, fence);
          } else {
            if (!snapshot.config || !options.allowLocalSynthesis)
              throw new WorkflowError(
                'LOCAL_SYNTHESIS_REQUIRED',
                'audio',
                'Supply matching saved audio with jobs revise, or explicitly pass --allow-local-synthesis for the configured offline provider',
                scene.scene_id,
              );
            // No Director or remote provider imports exist on this path.
            const { createNarrationProvider } = await import(
              '../audio/provider.ts'
            );
            provider ??= createNarrationProvider(snapshot.config);
            const synthRoot = `${dir}-synthesis`;
            await provider.synthesize({
              sceneId: scene.scene_id,
              text: scene.narration,
              outputDir: synthRoot,
            });
            await mkdir(dir);
            const synthesized = await this.cache.capture(
              join(synthRoot, scene.scene_id),
            );
            await rm(dir, { recursive: true });
            await this.cache.hydrate(synthesized, dir, fence);
          }
          const artifact = await loadNarrationAsset(scene, dir);
          await writeFile(
            join(dir, 'narration.json'),
            `${JSON.stringify({ ...artifact.metadata, wavPath: `${scene.scene_id}.wav`, metadataPath: 'narration.json' }, null, 2)}\n`,
          );
        });
        const destination = join(audioDir, scene.scene_id);
        await this.cache.hydrate(files, destination, fence);
        assets.push(await loadNarrationAsset(scene, destination));
      }
      stage = 'timing';
      activeScene = null;
      const timeline = planNarratedRender(snapshot.script, assets, {
        allowFallback: snapshot.allowFallback,
        ...(snapshot.alignment ? { alignment: snapshot.alignment } : {}),
      });
      checkTiming(
        timeline,
        timeline.captions,
        snapshot.strict,
        assets.some((a) => a.metadata.isMock),
      );
      const presentation = {
        scenes: timeline.scenes.map(({ from, durationFrames }) => ({
          from,
          durationFrames,
        })),
        captions: timeline.captions,
      };
      const script = {
        ...snapshot.script,
        scenes: timeline.scenes.map((s) => s.scene),
      };
      const clips: {
        sceneId: string;
        from: number;
        durationFrames: number;
        key: string;
        files: FileGroup;
      }[] = [];
      for (const [index, item] of timeline.scenes.entries()) {
        if (options.sceneId && item.scene.scene_id !== options.sceneId)
          continue;
        const key = sceneKey(
          item.scene,
          {
            ordinal: index,
            count: timeline.scenes.length,
            from: item.from,
            durationFrames: item.durationFrames,
            totalFrames: timeline.durationFrames,
            captions: timeline.captions.filter(
              (c) => c.sceneId === item.scene.scene_id,
            ),
          },
          visualBrand(script),
          impl.visuals,
        );
        const files = await step(
          'scene',
          item.scene.scene_id,
          key,
          async (dir) => {
            await (this.deps.renderScene ?? renderSilentPreview)(script, {
              outputDir: dir,
              browserExecutable: browser,
              presentation,
              frameRange: [item.from, item.from + item.durationFrames - 1],
            });
            // Independent clip QC applies to real and injected renderers alike.
            await probeSilentVideo(join(dir, 'video.mp4'), item.durationFrames);
          },
        );
        clips.push({
          sceneId: item.scene.scene_id,
          from: item.from,
          durationFrames: item.durationFrames,
          key,
          files,
        });
      }
      if (options.sceneId) {
        const clip = clips[0];
        if (!clip)
          throw new WorkflowError(
            'SCENE_NOT_FOUND',
            'scene',
            'No clip produced',
            options.sceneId,
          );
        const target = join(
          this.outputDir,
          id,
          `revision-${this.repo.get(id).revision}`,
          'scenes',
          `${clip.sceneId}-${clip.key}`,
        );
        if (!(await this.cache.verify(clip.files, target)))
          await this.cache.hydrate(clip.files, target, fence);
        this.repo.transition(id, 'queued', leases);
        return {
          jobId: id,
          sceneId: clip.sceneId,
          outputDir: target,
          approvedForRelease: false,
        };
      }
      const effectiveBrand = brandIdentity(
        'brand' in script ? script.brand : undefined,
      );
      const key = fingerprint({
        version: 1,
        jobId: id,
        revision: this.repo.get(id).revision,
        snapshot,
        effectiveBrand,
        clips,
        audio: assets.map((a) => a.metadata),
        implementation: impl.assembly,
      });
      const files = await step('assembly', '', key, async (dir) => {
        await renderNarratedPreview(
          snapshot.script,
          {
            outputDir: dir,
            narrationDir: audioDir,
            browserExecutable: browser,
            allowFallback: snapshot.allowFallback,
            strict: snapshot.strict,
            portableArtifacts: true,
            ...(snapshot.alignment ? { alignment: snapshot.alignment } : {}),
          },
          {
            renderVisuals: async (_resolved, opts) => {
              await mkdir(opts.outputDir);
              const inputs: string[] = [];
              for (const clip of clips) {
                const target = join(opts.outputDir, clip.sceneId);
                await this.cache.hydrate(clip.files, target, fence);
                // Relative safe scene IDs; never interpolate user text into an FFmpeg command or filename.
                inputs.push(`file '${clip.sceneId}/video.mp4'`);
              }
              const list = join(opts.outputDir, 'clips.txt');
              await writeFile(list, `${inputs.join('\n')}\n`);
              await runMedia('ffmpeg', [
                '-v',
                'error',
                '-nostdin',
                '-n',
                '-f',
                'concat',
                '-safe',
                '1',
                '-i',
                list,
                '-map',
                '0:v:0',
                '-an',
                '-c:v',
                'copy',
                join(opts.outputDir, 'video.mp4'),
              ]);
              await probeSilentVideo(
                join(opts.outputDir, 'video.mp4'),
                timeline.durationFrames,
              );
              const manifest = {
                kind: 'cached-scene-assembly',
                approvedForRelease: false,
                scenes: clips.map(({ files, ...clip }) => ({
                  ...clip,
                  artifacts: files,
                })),
              };
              await writeFile(
                join(opts.outputDir, 'render-manifest.json'),
                `${JSON.stringify(manifest, null, 2)}\n`,
              );
              return { outputDir: opts.outputDir, manifest };
            },
          },
        );
        const manifest = JSON.parse(
          await readFile(join(dir, 'render-manifest.json'), 'utf8'),
        ) as {
          narration: { sceneId: string; metadata: unknown }[];
          videoSha256: string;
        };
        await writeFile(
          join(dir, 'job-manifest.json'),
          `${JSON.stringify(
            {
              schemaVersion: '1.0.0',
              jobId: id,
              revision: this.repo.get(id).revision,
              authoredScriptRevision: snapshot.script.revision,
              scriptSha256: fingerprint(snapshot.script),
              inputHash: key,
              provenance: snapshot.provenance,
              effectiveBrand,
              narration: manifest.narration.map((a) => ({
                sceneId: a.sceneId,
                metadata: a.metadata,
              })),
              dependencies: impl,
              sceneKeys: clips.map(({ files: _files, ...clip }) => clip),
              renderManifestSha256: hash(
                await readFile(join(dir, 'render-manifest.json')),
              ),
              videoSha256: manifest.videoSha256,
              approvedForRelease: false,
              requiresHumanReview: true,
            },
            null,
            2,
          )}\n`,
        );
      });
      const target = join(
        this.outputDir,
        id,
        `revision-${this.repo.get(id).revision}`,
        key,
      );
      const result = await this.cache.publish(id, key, files, target, leases);
      this.repo.transition(id, 'review_ready', leases);
      await rm(work, { recursive: true, force: true });
      return { jobId: id, ...result, approvedForRelease: false };
    } catch (error) {
      const diagnostic = diagnosticFor(error, stage, activeScene);
      try {
        fence();
        if (this.repo.get(id).status === 'running')
          this.repo.transition(id, 'failed', leases);
      } catch {
        /* Fencing prevents stale workers from overwriting the new owner's state. */
      }
      throw diagnostic;
    } finally {
      clearInterval(heartbeat);
      this.repo.release(leases);
    }
  }
}
function diagnosticFor(error: unknown, stage: string, sceneId: string | null) {
  if (error instanceof WorkflowError) return error;
  if (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return new WorkflowError(
      error.code,
      'stage' in error && typeof error.stage === 'string' ? error.stage : stage,
      'Local stage failed; inspect the saved step code, scene files and retained attempt directory',
      'sceneId' in error && typeof error.sceneId === 'string'
        ? error.sceneId
        : 'scene_id' in error && typeof error.scene_id === 'string'
          ? error.scene_id
          : sceneId,
    );
  }
  return new WorkflowError(
    'WORKFLOW_FAILED',
    stage,
    'Local stage failed; inspect the retained attempt directory and repair inputs before retrying',
    sceneId,
  );
}
