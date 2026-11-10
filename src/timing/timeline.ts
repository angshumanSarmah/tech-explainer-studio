import { z } from 'zod';
import type { SceneV1, VideoScriptV1 } from '../domain/videoscript.ts';
import { MediaError } from '../media/error.ts';
import {
  type PlannedScene,
  planSilentRender,
} from '../renderers/remotion/plan.ts';
import { CAPTION, wrapText } from '../renderers/remotion/theme.ts';

const SAMPLE_RATE = 24000;
const SAMPLES_PER_FRAME = 800;

export const CaptionSchema = z.strictObject({
  sceneId: z.string().min(1),
  text: z.string().min(1).max(1000),
  startFrame: z.int().nonnegative(),
  endFrame: z.int().positive(),
});
export type Caption = z.infer<typeof CaptionSchema>;
export const PresentationSchema = z.strictObject({
  scenes: z
    .array(
      z.strictObject({
        from: z.int().nonnegative(),
        durationFrames: z.int().min(2).max(18000),
      }),
    )
    .min(1)
    .max(100),
  captions: z.array(CaptionSchema).min(1).max(10000),
});
export type Presentation = z.infer<typeof PresentationSchema>;

const WordSchema = z.strictObject({
  word: z.string().min(1),
  startSample: z.int().nonnegative(),
  endSample: z.int().positive(),
});
export const AlignmentSchema = z.strictObject({
  schemaVersion: z.literal('1.0.0'),
  method: z.enum(['human-word-alignment', 'local-forced-alignment']),
  reviewed: z.literal(true),
  reviewer: z.string().trim().min(1).max(120),
  scenes: z
    .array(
      z.strictObject({
        sceneId: z.string().min(1),
        wavSha256: z.string().regex(/^[a-f0-9]{64}$/),
        textSha256: z.string().regex(/^[a-f0-9]{64}$/),
        words: z.array(WordSchema).min(1).max(10000),
      }),
    )
    .min(1)
    .max(100),
});
export type Alignment = z.infer<typeof AlignmentSchema>;
export interface AudioTiming {
  sceneId: string;
  samples: number;
  sha256: string;
  textSha256: string;
  speechStartSample: number;
  speechEndSample: number;
}
export interface TimelineScene extends PlannedScene {
  audioSamples: number;
  audioFrames: number;
  holdFrames: number;
  endPaddingSamples: number;
  cueWindows: { cueId: string; fromFrame: number; toFrame: number }[];
}
export interface Timeline {
  scenes: TimelineScene[];
  captions: Caption[];
  durationFrames: number;
  captionMethod: 'reviewed-word-alignment' | 'scene-speech-span-v1';
  requiresTimingReview: boolean;
  roundingPolicy: 'ceil(max(measured_samples/24000, authored_min_seconds)*30); starts=sum(durationFrames)';
}
function fail(code: string, sceneId: string, reason: string): never {
  throw new MediaError(code, 'timing', sceneId, reason);
}
function tokens(text: string) {
  return [...text.matchAll(/\S+/gu)];
}
function reviewedWords(
  scene: SceneV1,
  audio: AudioTiming,
  alignment: Alignment,
) {
  const entries = alignment.scenes.filter(
    (item) => item.sceneId === scene.scene_id,
  );
  const entry = entries[0];
  if (
    entries.length !== 1 ||
    !entry ||
    entry.wavSha256 !== audio.sha256 ||
    entry.textSha256 !== audio.textSha256
  )
    fail(
      'ALIGNMENT_IDENTITY',
      scene.scene_id,
      'Provide exactly one alignment bound to this WAV and original narration hash',
    );
  const words = tokens(scene.narration);
  let end = 0;
  if (entry.words.length !== words.length)
    fail(
      'ALIGNMENT_TEXT',
      scene.scene_id,
      'Word timings do not cover the exact narration',
    );
  entry.words.forEach((word, index) => {
    if (
      word.word !== words[index]?.[0] ||
      word.startSample < end ||
      word.endSample <= word.startSample ||
      word.endSample > audio.samples
    )
      fail(
        'ALIGNMENT_RANGE',
        scene.scene_id,
        'Word timings must be ordered, nonoverlapping and inside this measured WAV',
      );
    end = word.endSample;
  });
  return entry.words;
}
function caption(
  sceneId: string,
  text: string,
  startFrame: number,
  endFrame: number,
): Caption {
  if (wrapText(text, CAPTION.columns).length > CAPTION.maxLines)
    fail(
      'CAPTION_LAYOUT',
      sceneId,
      'Caption exceeds three 34-character lines; supply reviewed shorter caption spans',
    );
  return { sceneId, text, startFrame, endFrame };
}
export function validateCaptions(
  captions: Caption[],
  scenes: PlannedScene[],
  durationFrames: number,
) {
  let previousEnd = 0;
  for (const raw of captions) {
    const parsed = CaptionSchema.safeParse(raw);
    const scene = scenes.find((item) => item.scene.scene_id === raw.sceneId);
    if (
      !parsed.success ||
      !scene ||
      raw.startFrame < scene.from ||
      raw.endFrame > scene.from + scene.durationFrames ||
      raw.endFrame > durationFrames ||
      raw.endFrame <= raw.startFrame ||
      raw.startFrame < previousEnd
    )
      fail(
        'CAPTION_RANGE',
        raw.sceneId,
        'Caption is unordered, overlapping or outside its scene/video duration',
      );
    caption(raw.sceneId, raw.text, raw.startFrame, raw.endFrame);
    previousEnd = raw.endFrame;
  }
  for (const scene of scenes)
    if (!captions.some((item) => item.sceneId === scene.scene.scene_id))
      fail(
        'CAPTION_MISSING',
        scene.scene.scene_id,
        'Every scene needs a caption',
      );
}
export function planNarratedRender(
  script: VideoScriptV1,
  audio: AudioTiming[],
  options: { allowFallback: boolean; alignment?: Alignment },
): Timeline {
  if (audio.length !== script.scenes.length)
    throw new MediaError(
      'AUDIO_COUNT',
      'timing',
      null,
      'Every scene needs exactly one measured narration WAV',
    );
  if (
    options.alignment &&
    (options.alignment.scenes.length !== script.scenes.length ||
      new Set(options.alignment.scenes.map((s) => s.sceneId)).size !==
        script.scenes.length)
  )
    throw new MediaError(
      'ALIGNMENT_COUNT',
      'timing',
      null,
      'Reviewed alignment must cover every scene exactly once',
    );
  if (!options.alignment && !options.allowFallback)
    throw new MediaError(
      'ALIGNMENT_REQUIRED',
      'timing',
      null,
      'Supply reviewed word alignment or opt into --allow-caption-fallback for a flagged preview',
    );
  let from = 0;
  const captions: Caption[] = [];
  const scenes = script.scenes.map((scene) => {
    const matches = audio.filter((item) => item.sceneId === scene.scene_id);
    const a = matches[0];
    if (
      matches.length !== 1 ||
      !a ||
      !Number.isSafeInteger(a.samples) ||
      a.samples <= 0 ||
      a.speechStartSample < 0 ||
      a.speechEndSample <= a.speechStartSample ||
      a.speechEndSample > a.samples
    )
      fail(
        'AUDIO_MISSING',
        scene.scene_id,
        'Missing or invalid measured audio for this scene',
      );
    const durationFrames = Math.max(
      2,
      Math.ceil(
        Math.max(a.samples / SAMPLES_PER_FRAME, scene.timing.min_seconds * 30),
      ),
    );
    if (
      durationFrames > Math.floor(scene.timing.max_seconds * 30) ||
      durationFrames > 18000
    )
      fail(
        'SCENE_DURATION',
        scene.scene_id,
        'Measured narration plus authored minimum hold exceeds max_seconds; revise the script or voice settings',
      );
    const audioFrames = Math.ceil(a.samples / SAMPLES_PER_FRAME);
    const words = options.alignment
      ? reviewedWords(scene, a, options.alignment)
      : undefined;
    const renderScene = structuredClone(scene);
    delete renderScene.caption_overrides;
    if (renderScene.visual.type === 'tech-animation')
      for (const cue of renderScene.visual.cues) {
        if (cue.trigger.kind !== 'phrase') {
          cue.trigger = {
            kind: 'progress',
            from:
              Math.round(cue.trigger.from * (durationFrames - 1)) /
              (durationFrames - 1),
            to:
              Math.round(cue.trigger.to * (durationFrames - 1)) /
              (durationFrames - 1),
          };
          continue;
        }
        const phrase = cue.trigger.text;
        const start = scene.narration.indexOf(phrase);
        if (start < 0)
          fail(
            'CUE_ANCHOR_MISSING',
            scene.scene_id,
            `Cue ${cue.cue_id} phrase does not occur in narration`,
          );
        if (scene.narration.indexOf(phrase, start + 1) >= 0)
          fail(
            'CUE_ANCHOR_AMBIGUOUS',
            scene.scene_id,
            `Cue ${cue.cue_id} phrase occurs more than once`,
          );
        if (!words)
          fail(
            'CUE_ALIGNMENT_REQUIRED',
            scene.scene_id,
            `Cue ${cue.cue_id} requires reviewed word timings; scene-span captions cannot locate a phrase`,
          );
        const indices = tokens(scene.narration)
          .map((word, index) => ({
            start: word.index,
            end: word.index + word[0].length,
            index,
          }))
          .filter(
            (word) => word.end > start && word.start < start + phrase.length,
          );
        const first = words[indices[0]?.index ?? -1];
        const last = words[indices.at(-1)?.index ?? -1];
        if (!first || !last)
          fail(
            'CUE_ANCHOR_MISSING',
            scene.scene_id,
            `Cue ${cue.cue_id} has no timed words`,
          );
        cue.trigger = {
          kind: 'progress',
          from: Math.min(
            1,
            Math.floor(first.startSample / SAMPLES_PER_FRAME) /
              (durationFrames - 1),
          ),
          to: Math.min(
            1,
            Math.ceil(last.endSample / SAMPLES_PER_FRAME) /
              (durationFrames - 1),
          ),
        };
      }
    // The render copy uses resolved frame durations. Saved estimates/narration remain untouched.
    renderScene.timing = {
      min_seconds: durationFrames / 30,
      preferred_seconds: durationFrames / 30,
      max_seconds: durationFrames / 30,
    };
    if (scene.caption_overrides?.length) {
      for (const override of scene.caption_overrides) {
        if (override.end_ms > (a.samples / SAMPLE_RATE) * 1000)
          fail(
            'CAPTION_RANGE',
            scene.scene_id,
            'Caption override exceeds measured narration duration',
          );
        captions.push(
          caption(
            scene.scene_id,
            override.text,
            from + Math.floor((override.start_ms * 30) / 1000),
            from + Math.ceil((override.end_ms * 30) / 1000),
          ),
        );
      }
    } else if (words) {
      let group: typeof words = [];
      const flush = () => {
        const first = group[0];
        const last = group.at(-1);
        if (first && last)
          captions.push(
            caption(
              scene.scene_id,
              group.map((w) => w.word).join(' '),
              Math.max(
                from + Math.floor(first.startSample / 800),
                captions.at(-1)?.endFrame ?? 0,
              ),
              from + Math.ceil(last.endSample / 800),
            ),
          );
        group = [];
      };
      for (const word of words) {
        if (
          group.length &&
          group.map((w) => w.word).join(' ').length + word.word.length + 1 > 70
        )
          flush();
        group.push(word);
        if (/[.!?]$/.test(word.word)) flush();
      }
      flush();
    } else
      captions.push(
        caption(
          scene.scene_id,
          scene.narration,
          from + Math.floor(a.speechStartSample / 800),
          from + Math.ceil(a.speechEndSample / 800),
        ),
      );
    const item = {
      scene: renderScene,
      from,
      durationFrames,
      audioSamples: a.samples,
      audioFrames,
      holdFrames: durationFrames - audioFrames,
      endPaddingSamples: durationFrames * 800 - a.samples,
      cueWindows:
        renderScene.visual.type === 'tech-animation'
          ? renderScene.visual.cues.map((cue) => ({
              cueId: cue.cue_id,
              fromFrame:
                cue.trigger.kind === 'progress'
                  ? Math.round(cue.trigger.from * (durationFrames - 1))
                  : 0,
              toFrame:
                cue.trigger.kind === 'progress'
                  ? Math.round(cue.trigger.to * (durationFrames - 1))
                  : 0,
            }))
          : [],
    };
    from += durationFrames;
    return item;
  });
  if (from > 108000)
    throw new MediaError(
      'TIMELINE_LIMIT',
      'timing',
      null,
      'Narrated preview exceeds one hour',
    );
  // Reuse existing layout/cue preflight and preserve the Phase 02 renderer contract.
  planSilentRender({ ...script, scenes: scenes.map((item) => item.scene) });
  validateCaptions(captions, scenes, from);
  return {
    scenes,
    captions,
    durationFrames: from,
    captionMethod: options.alignment
      ? 'reviewed-word-alignment'
      : 'scene-speech-span-v1',
    requiresTimingReview:
      !options.alignment ||
      script.scenes.some((s) => Boolean(s.caption_overrides?.length)),
    roundingPolicy:
      'ceil(max(measured_samples/24000, authored_min_seconds)*30); starts=sum(durationFrames)',
  };
}
export function resolvePresentation(script: VideoScriptV1, raw: unknown) {
  const presentation = PresentationSchema.parse(raw);
  if (presentation.scenes.length !== script.scenes.length)
    throw new Error('Presentation scene count differs');
  let expected = 0;
  const scenes = presentation.scenes.map((item, index) => {
    const scene = script.scenes[index];
    if (!scene || item.from !== expected)
      throw new Error('Presentation is not contiguous');
    expected += item.durationFrames;
    return { scene, ...item };
  });
  validateCaptions(presentation.captions, scenes, expected);
  return { scenes, durationFrames: expected, captions: presentation.captions };
}
export function srt(captions: Caption[]) {
  const time = (frame: number) => {
    const ms = Math.round((frame * 1000) / 30);
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
  };
  return captions
    .map(
      (c, i) =>
        `${i + 1}\n${time(c.startFrame)} --> ${time(c.endFrame)}\n${wrapText(c.text, CAPTION.columns).join('\n')}\n`,
    )
    .join('\n');
}
