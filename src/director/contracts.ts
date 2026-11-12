import { z } from 'zod';
import { BRAND } from '../branding/profile.ts';
import { VisualTaxonomy } from '../domain/library.ts';
import type { VideoScript } from '../domain/videoscript.ts';
import {
  VideoScriptSchema,
  VideoScriptV12Schema,
} from '../domain/videoscript.ts';
import { libraryRegistry } from '../domain/visual-library-registry.ts';
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
    if (
      scene.visual.type === 'composed' ||
      scene.visual.type === 'tech-animation' ||
      scene.visual.type === 'registered-animation'
    )
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
    currentVideoScriptVersion: '1.2.0',
    legacyVideoScriptVersion: '1.0.0',
    schema: z.toJSONSchema(VideoScriptSchema, { reused: 'ref' }),
    generationSchema: z.toJSONSchema(VideoScriptV12Schema, { reused: 'ref' }),
    catalog: {
      titleCard: z.toJSONSchema(VisualSpecSchema.options[0]),
      components: Object.fromEntries(
        Object.entries(componentRegistry).map(([id, entry]) => [
          id,
          {
            version: entry.version,
            crossfade: entry.crossfade,
            ...('limits' in entry ? { limits: entry.limits } : {}),
            props: z.toJSONSchema(entry.schema),
            ...('description' in entry
              ? {
                  description: entry.description,
                  category: entry.category,
                  supportedCues: entry.supportedCues,
                  assetRequirements: entry.assetRequirements,
                  fallback: entry.fallback,
                  emptyState: entry.emptyState,
                  safeZone: entry.safeZone,
                  example: {
                    ...valid,
                    schema_version: id === 'ComposedScene' ? '1.2.0' : '1.1.0',
                    script_id: `example-${id}`,
                    scenes: [
                      {
                        ...valid.scenes[0],
                        scene_id: `example-${id}`,
                        ...(id === 'CityDemandHeatmap'
                          ? {
                              timing: {
                                min_seconds: 16,
                                preferred_seconds: 16,
                                max_seconds: 20,
                              },
                            }
                          : {}),
                        visual: {
                          type:
                            id === 'ComposedScene'
                              ? 'composed'
                              : 'registered-animation',
                          ...(id === 'ComposedScene'
                            ? {}
                            : { taxonomy_version: '1.0.0' }),
                          component: id,
                          props: entry.example,
                          cues: [],
                        },
                      },
                    ],
                  },
                }
              : {}),
            ...('previewOnly' in entry
              ? { previewOnly: entry.previewOnly }
              : {}),
          },
        ]),
      ),
      taxonomy: VisualTaxonomy,
      continuity: {
        version: '1.0.0',
        frames: 12,
        crossfadeComponents: Object.keys(componentRegistry),
        matchedComponents: ['ComposedScene'],
        unsupported: ['title-card crossfade', 'cross-template object matching'],
      },
      registryIds: Object.keys(componentRegistry),
      cueSchema: z.toJSONSchema(VisualCueSchema),
      execution: {
        scope:
          'Prefer a registered mechanism whenever it can demonstrate the topic. Title cards are for brief hooks/conclusions. All registered components below are executable; CacheAsideProof remains preview-only. Unsupported mechanisms return unsupported_visual or needs_review, never title-card substitution.',
        resolution: [1080, 1920],
        fps: 30,
        profile: 'technology-explainer',
        illustrative: true,
        actions: ['move'],
        actionScope:
          'The actions/targets fields describe legacy HTTP and mechanism adapters. ComposedScene uses its descriptor supportedCues and limits with stable entity/link IDs.',
        composedActions: componentRegistry.ComposedScene.supportedCues,
        mechanismComponents: Object.keys(libraryRegistry),
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
