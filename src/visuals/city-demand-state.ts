import type { CityDemandProps } from '../domain/spatial.ts';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const CITY_BEATS = [
  'establish',
  'demand',
  'respond',
  'pattern',
] as const;
export function cityStoryProgress(p: CityDemandProps, progress: number) {
  return p.storyBeat === 'full'
    ? clamp(progress)
    : (CITY_BEATS.indexOf(p.storyBeat) + clamp(progress)) / 4;
}
/** Stateless evaluation supports shuffled frames, scene caches and seeks. */
export function cityDemandState(p: CityDemandProps, progress: number) {
  const t = cityStoryProgress(p, progress);
  const snapshot = Math.min(2, Math.floor(t * 3));
  const blend = ease(t * 3 - snapshot);
  const reveal = ease((t - 0.16) / 0.13);
  const density = Array.from(
    { length: 25 },
    (_, i) =>
      lerp(
        p.density[snapshot]?.[i] ?? 0,
        p.density[snapshot + 1]?.[i] ?? 0,
        blend,
      ) * reveal,
  );
  const push =
    p.cameraPreset === 'wide'
      ? 0
      : ease((t - 0.37) / 0.2) * (1 - ease((t - 0.72) / 0.25));
  const focus = p.focusCell;
  const camera = {
    zoom: 1 + 0.16 * push,
    x: Math.max(-24, Math.min(24, (focus.x - focus.y) * 64 * 0.15)) * push,
    y: Math.max(-18, Math.min(18, (focus.x + focus.y - 4) * 42 * 0.15)) * push,
    push,
  };
  const vehicles = p.vehicles.map((v) => {
    const i = Math.min(3, Math.floor(t * 4));
    // Constant speed within each leg; exact intersections at beat boundaries.
    const u = t * 4 - i;
    const a = v.route[i] ?? { x: 0, y: 0 },
      b = v.route[i + 1] ?? a;
    return {
      id: v.id,
      x: lerp(a.x, b.x, u),
      y: lerp(a.y, b.y, u),
      dx: b.x - a.x,
      dy: b.y - a.y,
    };
  });
  const beat = Math.min(3, Math.floor(t * 4));
  return {
    t,
    density,
    reveal,
    camera,
    vehicles,
    beat,
    focusIntensity: density[focus.y * 5 + focus.x] ?? 0,
    pulse: (t * 9) % 1,
  };
}
export type CityState = ReturnType<typeof cityDemandState>;
/** Orthographic isometric projection, with an explicit planar fallback. No GPU. */
export function projectCity(
  p: CityDemandProps,
  s: CityState,
  x: number,
  y: number,
  z = 0,
) {
  const flat = p.renderMode === 'flat-svg';
  const a = flat ? (x - 2.5) * 130 : (x - y) * 64;
  const b = flat ? (y - 2.5) * 96 : (x + y - 5) * 42;
  return {
    x: 504 + (a - (flat ? 0 : s.camera.x)) * s.camera.zoom,
    y:
      854 +
      (b - (flat ? 0 : s.camera.y)) * s.camera.zoom -
      (flat ? 0 : z * s.camera.zoom),
  };
}
