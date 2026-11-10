import type { CacheAsideProofProps } from '../domain/visuals.ts';

export type Point = Readonly<{ x: number; y: number }>;
export type Curve = readonly [Point, Point, Point, Point];
export const CACHE_PATHS = Object.freeze({
  lookup: [
    { x: 396, y: 690 },
    { x: 460, y: 646 },
    { x: 552, y: 646 },
    { x: 616, y: 690 },
  ],
  reply: [
    { x: 616, y: 800 },
    { x: 552, y: 852 },
    { x: 460, y: 852 },
    { x: 396, y: 800 },
  ],
  query: [
    { x: 180, y: 810 },
    { x: 180, y: 935 },
    { x: 410, y: 930 },
    { x: 470, y: 1058 },
  ],
  data: [
    { x: 610, y: 1058 },
    { x: 650, y: 935 },
    { x: 340, y: 950 },
    { x: 340, y: 810 },
  ],
  fill: [
    { x: 396, y: 735 },
    { x: 460, y: 704 },
    { x: 552, y: 704 },
    { x: 616, y: 735 },
  ],
} satisfies Record<string, Curve>);
export const CACHE_PHASE_COPY = Object.freeze({
  lookup: {
    title: 'Check the cache',
    description: 'Read 01 / look up a reusable product',
    label: '01  LOOKUP',
  },
  miss: {
    title: 'Cache miss',
    description: 'The app queries the source of truth',
    label: '02  MISS',
  },
  fill: {
    title: 'Fill the cache',
    description: 'Receive the data, then save a copy',
    label: '03  FILL',
  },
  hit: {
    title: 'Cache hit',
    description: 'Read 02 / reuse the cached result',
    label: '04  HIT',
  },
});
export function easeInOut(t: number) {
  const u = Math.max(0, Math.min(1, t));
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}
export function windowProgress(t: number, from: number, to: number) {
  return easeInOut((t - from) / (to - from));
}
export function curvePoint(curve: Curve, t: number) {
  const u = Math.max(0, Math.min(1, t));
  const [a, b, c, d] = curve;
  const v = 1 - u;
  return {
    x: v ** 3 * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u ** 3 * d.x,
    y: v ** 3 * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u ** 3 * d.y,
  };
}
export function curvePath([a, b, c, d]: Curve) {
  return `M${a.x} ${a.y} C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`;
}
/** Pure frame evaluation: no timers, randomness, DOM measurement or state carried between frames. */
export function cacheAsideState(
  phase: CacheAsideProofProps['visualPhase'],
  frame: number,
  durationFrames: number,
) {
  if (
    !Number.isSafeInteger(frame) ||
    !Number.isSafeInteger(durationFrames) ||
    durationFrames < 30 ||
    frame < 0 ||
    frame >= durationFrames
  )
    throw new RangeError(
      'Cache proof needs an in-range integer frame and at least 30 frames per beat',
    );
  const t = frame / (durationFrames - 1);
  const lookup =
    phase === 'lookup'
      ? windowProgress(t, 0.06, 0.78)
      : phase === 'hit'
        ? windowProgress(t, 0.06, 0.46)
        : 1;
  const missReply = phase === 'miss' ? windowProgress(t, 0.02, 0.27) : 0;
  const query =
    phase === 'miss'
      ? windowProgress(t, 0.31, 0.82)
      : phase === 'fill' || phase === 'hit'
        ? 1
        : 0;
  const data =
    phase === 'fill' ? windowProgress(t, 0.04, 0.44) : phase === 'hit' ? 1 : 0;
  const fill =
    phase === 'fill' ? windowProgress(t, 0.53, 0.88) : phase === 'hit' ? 1 : 0;
  const hitReply = phase === 'hit' ? windowProgress(t, 0.58, 0.93) : 0;
  const entry =
    phase === 'hit' ? 1 : phase === 'fill' ? windowProgress(t, 0.88, 0.99) : 0;
  const badge =
    phase === 'lookup'
      ? t >= 0.78
        ? 'MISS'
        : 'LOOKUP'
      : phase === 'miss'
        ? 'MISS'
        : phase === 'fill'
          ? entry > 0
            ? 'READY'
            : 'FILLING'
          : t >= 0.46
            ? 'HIT'
            : 'READY';
  const queryCount =
    phase === 'lookup' ? 0 : phase === 'miss' ? (query === 1 ? 1 : 0) : 1;
  const dbBusy =
    (phase === 'miss' && query === 1) || (phase === 'fill' && data < 1);
  const appStatus =
    phase === 'lookup'
      ? 'checking cache'
      : phase === 'miss'
        ? missReply < 1
          ? 'cache miss'
          : 'reading source'
        : phase === 'fill'
          ? data < 1
            ? 'receiving data'
            : fill < 1
              ? 'saving a copy'
              : 'result ready'
          : hitReply === 1
            ? 'result ready'
            : 'checking cache';
  return {
    t,
    lookup,
    missReply,
    query,
    data,
    fill,
    hitReply,
    entry,
    badge,
    queryCount,
    dbBusy,
    appStatus,
    requestVisible:
      (phase === 'lookup' || phase === 'hit') && lookup > 0 && lookup < 1,
    missVisible: phase === 'miss' && missReply > 0 && missReply < 1,
    queryVisible: phase === 'miss' && query > 0 && query < 1,
    dataVisible: phase === 'fill' && data > 0 && data < 1,
    fillVisible: phase === 'fill' && fill > 0 && fill < 1,
    hitVisible: phase === 'hit' && hitReply > 0 && hitReply < 1,
    points: {
      lookup: curvePoint(CACHE_PATHS.lookup, lookup),
      reply: curvePoint(
        CACHE_PATHS.reply,
        phase === 'hit' ? hitReply : missReply,
      ),
      query: curvePoint(CACHE_PATHS.query, query),
      data: curvePoint(CACHE_PATHS.data, data),
      fill: curvePoint(CACHE_PATHS.fill, fill),
    },
  };
}
