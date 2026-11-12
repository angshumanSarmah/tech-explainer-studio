import { z } from 'zod';
import {
  COMPOSED_EXAMPLE,
  COMPOSITION_LIMITS,
  COMPOSITION_VERSION,
  ComposedCueSchema,
  ComposedPropsSchema,
} from './composed.ts';

import { displayText, VisualCueSchema } from './visual-common.ts';

export {
  displayText,
  StableIdSchema,
  VisualCueSchema,
} from './visual-common.ts';

import {
  libraryRegistry,
  RegisteredVisualSchema,
} from './visual-library-registry.ts';
export const BrowserRequestFlowPropsSchema = z
  .strictObject({
    visualPhase: z.enum([
      'idle',
      'request',
      'parse',
      'route',
      'response',
      'overview',
    ]),
    request: z.strictObject({
      method: z.enum(['GET', 'POST']),
      path: z
        .string()
        .min(1)
        .max(200)
        .regex(
          /^\/(?!\/)[A-Za-z0-9/._~%!&'()*+,;=:@?-]*$/,
          'Use a display path beginning with a single slash',
        ),
      protocolLabel: z.enum(['HTTP/1.0', 'HTTP/1.1', 'HTTP/2', 'HTTP/3']),
    }),
    response: z
      .strictObject({
        status: z.int().min(100).max(599),
        statusText: displayText(80),
        bodyPreview: displayText(500).optional(),
      })
      .optional(),
    show: z.strictObject({
      browser: z.boolean(),
      network: z.boolean(),
      server: z.boolean(),
      handler: z.boolean(),
    }),
    focus: z
      .enum(['browser', 'packet', 'server', 'handler', 'overview'])
      .optional(),
    illustrative: z.boolean(),
  })
  .superRefine((props, ctx) => {
    if (props.visualPhase === 'response' && !props.response) {
      ctx.addIssue({
        code: 'custom',
        path: ['response'],
        message: 'A response phase requires response data',
      });
    }
    if (
      props.response?.status === 204 &&
      props.response.bodyPreview !== undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['response', 'bodyPreview'],
        message: 'A 204 response must not depict a body',
      });
    }
  });

export type BrowserRequestFlowProps = z.infer<
  typeof BrowserRequestFlowPropsSchema
>;

export const CacheAsideProofPropsSchema = z.strictObject({
  visualPhase: z.enum(['lookup', 'miss', 'fill', 'hit']),
  keyLabel: displayText(14),
  valueLabel: displayText(14),
  illustrative: z.literal(true),
});
export type CacheAsideProofProps = z.infer<typeof CacheAsideProofPropsSchema>;

// Authoritative capability descriptors. Renderer bindings attach only static local code.
export const componentRegistry = Object.freeze({
  ...libraryRegistry,
  ComposedScene: Object.freeze({
    crossfade: true,
    version: COMPOSITION_VERSION,
    schema: ComposedPropsSchema,
    description:
      'Bounded semantic node/link/token composition with reviewed local assets, finite actions and deterministic layouts. Text is 36px with reserved status space; crowded boxes/routes fail explicitly (use row/column or shorter copy). Not a simulator or GPU 3D.',
    category: 'hybrid_2_5d',
    example: COMPOSED_EXAMPLE,
    supportedCues: [
      'move',
      'appear',
      'disappear',
      'highlight',
      'update_field',
      'focus',
    ],
    assetRequirements: 'Exact reviewed local AssetRef only',
    fallback: 'Return typed unsupported capability; no substitution',
    emptyState: 'At least one node required',
    safeZone: 'x=96..912 y=420..1280; node/group/path clearance is required',
    limits: COMPOSITION_LIMITS,
  }),
  CacheAsideProof: Object.freeze({
    crossfade: true,
    version: '0.1.0',
    previewOnly: true,
    schema: CacheAsideProofPropsSchema,
  }),
  BrowserRequestFlow: Object.freeze({
    crossfade: true,
    version: '1.0.0',
    schema: BrowserRequestFlowPropsSchema,
  }),
});

export const TitleCardContentSchema = z.strictObject({
  label: displayText(36),
  rows: z.tuple([displayText(38), displayText(38), displayText(38)]),
  footnote: displayText(64),
});

export const VisualSpecSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('title-card'),
    heading: displayText(90),
    subheading: displayText(160).optional(),
    variant: z.enum(['hook', 'summary']),
    content: TitleCardContentSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('tech-animation'),
    component: z.literal('BrowserRequestFlow'),
    props: componentRegistry.BrowserRequestFlow.schema,
    cues: z.array(VisualCueSchema).max(100),
  }),
  RegisteredVisualSchema,
  z.strictObject({
    type: z.literal('cache-aside-proof'),
    component: z.literal('CacheAsideProof'),
    props: CacheAsideProofPropsSchema,
  }),
]);

export type VisualSpec = z.infer<typeof VisualSpecSchema>;

export const ComposedVisualSchema = z.strictObject({
  type: z.literal('composed'),
  component: z.literal('ComposedScene'),
  props: componentRegistry.ComposedScene.schema,
  cues: z.array(ComposedCueSchema).max(COMPOSITION_LIMITS.cues),
});
export const VisualSpecV12Schema = z.union([
  VisualSpecSchema,
  ComposedVisualSchema,
]);
