import { interpolate } from 'remotion';
import type { BrowserRequestFlowProps, VisualSpec } from '../domain/visuals.ts';
import { MOTION } from '../renderers/remotion/theme.ts';

type Cues = Extract<VisualSpec, { type: 'tech-animation' }>['cues'];
export const PHASE_LABELS = Object.freeze({
  idle: ['Ready to connect', 'The browser and server are separate endpoints.'],
  request: [
    'Send a request',
    'A message travels from the browser to the server.',
  ],
  parse: ['Read the request', 'Interpret the method and the requested path.'],
  route: [
    'Choose a handler',
    'The application selects what this path returns.',
  ],
  response: ['Return a response', 'The reply travels back to the browser.'],
  overview: ['One complete loop', 'Request, processing, then response.'],
} as const);

function progress(value: number, from: number, to: number) {
  if (from === to) return value >= to ? 1 : 0;
  return interpolate(value, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function flowState(
  props: BrowserRequestFlowProps,
  cues: Cues,
  frame: number,
  durationFrames: number,
) {
  if (
    !Number.isInteger(frame) ||
    frame < 0 ||
    frame >= durationFrames ||
    durationFrames < 2
  )
    throw new RangeError('Invalid scene frame');
  const t = frame / (durationFrames - 1);
  const window = (target: string) => {
    const cue = cues.find((item) => item.action.target === target);
    if (cue?.trigger.kind === 'progress')
      return [cue.trigger.from, cue.trigger.to] as const;
    return [MOTION.travelFrom, MOTION.travelTo] as const;
  };
  const phase = props.visualPhase;
  const requestProgress =
    phase === 'overview'
      ? progress(t, 0.1, 0.4)
      : progress(t, ...window('http-request'));
  const responseProgress =
    phase === 'overview'
      ? progress(t, 0.6, 0.9)
      : progress(t, ...window('http-response'));
  return {
    phase,
    progress: t,
    requestVisible: phase === 'request' || (phase === 'overview' && t < 0.45),
    responseVisible: phase === 'response' || (phase === 'overview' && t >= 0.6),
    requestY: interpolate(requestProgress, [0, 1], [870, 1040]),
    responseY: interpolate(responseProgress, [0, 1], [1040, 870]),
    parserActive:
      phase === 'parse' || (phase === 'overview' && t >= 0.4 && t < 0.5),
    handlerActive:
      phase === 'route' || (phase === 'overview' && t >= 0.5 && t < 0.6),
    arrived:
      ['parse', 'route', 'response'].includes(phase) ||
      (phase === 'overview' && t >= 0.4),
  };
}
