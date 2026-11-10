import { z } from 'zod';
import { BRAND } from '../branding/profile.ts';
import type { VideoScript } from '../domain/videoscript.ts';
import {
  VideoScriptSchema,
  VideoScriptV11Schema,
} from '../domain/videoscript.ts';
import {
  componentRegistry,
  VisualCueSchema,
  VisualSpecSchema,
} from '../domain/visuals.ts';
import {
  planSilentRender,
  RenderInputError,
} from '../renderers/remotion/plan.ts';
import {
  editorialText,
  ResearchInstructionsSchema,
} from '../sources/research-source.ts';
export const DirectorBriefSchema = ResearchInstructionsSchema.extend({
  audienceKnowledge: editorialText(1000).default('Beginning web developers'),
  targetSeconds: z.number().min(5).max(600).default(55),
  format: z.literal('vertical-short').default('vertical-short'),
  aspectRatio: z.literal('9:16').default('9:16'),
  depth: z
    .enum(['introductory', 'intermediate', 'advanced'])
    .default('introductory'),
  additionalInstructions: z.array(editorialText(500)).max(10).default([]),
});
export function validateStoryboard(script: VideoScript) {
  // Validate producer capabilities without inventing actual word timing or changing saved data.
  const check = structuredClone(script);
  for (const [index, scene] of check.scenes.entries()) {
    delete scene.caption_overrides;
    if (scene.narration.length > 2000)
      throw new RenderInputError(
        'Narration exceeds the current 2000-character producer limit',
        scene.scene_id,
        `$.scenes[${index}].narration`,
      );
    if (scene.visual.type === 'tech-animation')
      for (const cue of scene.visual.cues)
        if (cue.trigger.kind === 'phrase')
          cue.trigger = { kind: 'progress', from: 0.2, to: 0.8 };
  }
  planSilentRender(check); // Unsupported actions/targets, geometry and visual bounds fail here.
}
export function directorContract(example: unknown) {
  const valid = VideoScriptSchema.parse(example);
  validateStoryboard(valid);
  return {
    contractVersion: 'director-1.0.0',
    currentVideoScriptVersion: '1.1.0',
    legacyVideoScriptVersion: '1.0.0',
    schema: z.toJSONSchema(VideoScriptSchema),
    generationSchema: z.toJSONSchema(VideoScriptV11Schema),
    catalog: {
      titleCard: z.toJSONSchema(VisualSpecSchema.options[0]),
      components: Object.fromEntries(
        Object.entries(componentRegistry).map(([id, entry]) => [
          id,
          { version: entry.version, props: z.toJSONSchema(entry.schema) },
        ]),
      ),
      cueSchema: z.toJSONSchema(VisualCueSchema),
      execution: {
        scope:
          'BrowserRequestFlow animates HTTP request/response only. VideoScript 1.1.0 title cards accept bounded authored labels, three text rows and a footnote for other topics; they are animated text cards, not a simulation of an unsupported mechanism. Other component mechanisms require unsupported_visual.',
        resolution: [1080, 1920],
        fps: 30,
        profile: 'technology-explainer',
        illustrative: true,
        actions: ['move'],
        targets: { request: 'http-request', response: 'http-response' },
        progress: true,
        phrase:
          'Unique literal narration phrase; requires reviewed WAV-bound word alignment at render time',
        overview: 'Fixed causal schedule; no custom cues',
        maxDisplayCharacters: { path: 18, statusText: 18, bodyPreview: 50 },
        titleWrap: {
          headingColumns: 19,
          maxHeadingLines: 5,
          subheadingColumns: 30,
          maxSubheadingLines: 3,
          authoredContentVersion: '1.1.0',
          authoredRows: 3,
          maxRowCharacters: 38,
        },
        maxNarrationCharacters: 2000,
        captionTiming: 'Measured WAV; fallback is explicitly review-only',
      },
    },
    brand: BRAND,
    example: valid,
    runtimeChecks: [
      'Unique IDs and resolvable source/claim references',
      'Exact reviewed claim/source bindings',
      'Producer preflight including action/phase matching and text bounds',
      'Phrase uniqueness; actual sample alignment checked during rendering',
      'Human facts/script/timing/rights/release review remain separate',
    ],
  };
}
