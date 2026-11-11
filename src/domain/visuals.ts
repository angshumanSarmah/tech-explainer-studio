import { z } from 'zod';

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

// Validation registry only. No rendering or dynamic module resolution exists here.
export const componentRegistry = Object.freeze({
  ...libraryRegistry,
  CacheAsideProof: Object.freeze({
    version: '0.1.0',
    previewOnly: true,
    schema: CacheAsideProofPropsSchema,
  }),
  BrowserRequestFlow: Object.freeze({
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
