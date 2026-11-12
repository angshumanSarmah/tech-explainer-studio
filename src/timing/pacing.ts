import type { Scene } from '../domain/videoscript.ts';
import { MediaError } from '../media/error.ts';
import type { AudioTiming, Timeline } from './timeline.ts';

/** A report derived from Phase 04 sample/frame positions, not another timeline. */
export function boundaryPacing(
  timeline: Timeline,
  audio: AudioTiming[],
  authored: Scene[],
) {
  return {
    schemaVersion: '1.0.0',
    detector: 'pcm-rms-20ms-v1',
    reviewThresholdMs: 500,
    wordAlignment: false,
    boundaries: timeline.scenes.slice(1).map((next, i) => {
      const previous = timeline.scenes[i];
      if (!previous)
        throw new MediaError(
          'PACING_INPUT',
          'timing',
          next.scene.scene_id,
          'Missing predecessor',
        );
      const a = audio.find((a) => a.sceneId === previous.scene.scene_id),
        b = audio.find((a) => a.sceneId === next.scene.scene_id);
      if (!a || !b)
        throw new MediaError(
          'PACING_INPUT',
          'timing',
          next.scene.scene_id,
          'Missing measured activity inputs',
        );
      const trailingSamples = a.samples - a.speechEndSample,
        paddingSamples = previous.endPaddingSamples,
        leadingSamples = b.speechStartSample;
      const gapSamples =
        next.from * 800 +
        b.speechStartSample -
        (previous.from * 800 + a.speechEndSample);
      if (gapSamples !== trailingSamples + paddingSamples + leadingSamples)
        throw new Error(
          'Pacing sample decomposition differs from measured timeline',
        );
      const intent = authored[i + 1]?.pause_before;
      const milliseconds = gapSamples / 24;
      const captionEnd =
        timeline.captions.filter((c) => c.sceneId === a.sceneId).at(-1)
          ?.endFrame ?? previous.from;
      const captionStart =
        timeline.captions.find((c) => c.sceneId === b.sceneId)?.startFrame ??
        next.from;
      return {
        id: `${a.sceneId}--${b.sceneId}`,
        previousSceneId: a.sceneId,
        nextSceneId: b.sceneId,
        atFrame: next.from,
        gapSamples,
        milliseconds,
        trailingSamples,
        paddingSamples,
        leadingSamples,
        captionFreeFrames: Math.max(0, captionStart - captionEnd),
        wavHashes: [a.sha256, b.sha256],
        textHashes: [a.textSha256, b.textSha256],
        cueWindows: [previous.cueWindows, next.cueWindows],
        captionBounds: [captionEnd, captionStart],
        declaredIntent: intent ?? null,
        requiresHumanReview:
          milliseconds >= 500 ||
          Boolean(
            intent &&
              (milliseconds < intent.min_ms || milliseconds > intent.max_ms),
          ),
        classification: 'unresolved' as const,
      };
    }),
  };
}
