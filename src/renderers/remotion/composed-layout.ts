import type { ComposedCue, ComposedEntity } from '../../domain/composed.ts';
import { wrapText } from './theme.ts';

export const COMPOSED_TEXT = Object.freeze({ size: 36, gap: 42 });
export const TOKEN_TEXT = Object.freeze({
  size: 36,
  gap: 42,
  columns: 10,
  y: 58,
});
export type NodeBox = {
  width: number;
  height: number;
  top: number;
  columns: number;
  labelY: number;
  statusY: number;
};
export type Rect = { left: number; right: number; top: number; bottom: number };

/** Reserve the largest authored status before rendering: updates never resize a node. */
export function nodeBox(
  entity: ComposedEntity,
  layout: string,
  cues: ComposedCue[],
): NodeBox {
  const width = layout === 'row' ? 240 : 320;
  const columns = layout === 'row' ? 11 : 16;
  const labelLines = wrapText(entity.label, columns).length;
  const statusLines = Math.max(
    0,
    ...cues
      .filter(
        (c) =>
          c.action.kind === 'update_field' && c.action.target === entity.id,
      )
      .map((c) => wrapText(String(c.action.value), columns).length),
  );
  const top = -75;
  const imageSpace = entity.kind === 'node' && entity.asset ? 116 : 0;
  const labelY = top + 24 + imageSpace + COMPOSED_TEXT.size;
  const labelBottom = labelY + (labelLines - 1) * COMPOSED_TEXT.gap + 8;
  const statusY = labelBottom + 20 + COMPOSED_TEXT.size;
  const bottom = statusLines
    ? statusY + (statusLines - 1) * COMPOSED_TEXT.gap + 8
    : labelBottom;
  return {
    width,
    height: Math.max(170, bottom - top + 24),
    top,
    columns,
    labelY,
    statusY,
  };
}

export function tokenBottom(label: string) {
  return (
    TOKEN_TEXT.y +
    (wrapText(label, TOKEN_TEXT.columns).length - 1) * TOKEN_TEXT.gap +
    8
  );
}
export function tokenLane(entities: ComposedEntity[]) {
  return (
    75 +
    16 +
    Math.max(
      tokenBottom('Item'),
      ...entities
        .filter((e) => e.kind === 'token')
        .map((e) => tokenBottom(e.label)),
    )
  );
}
export function nodeRect(x: number, y: number, box: NodeBox): Rect {
  return {
    left: x - box.width / 2,
    right: x + box.width / 2,
    top: y + box.top,
    bottom: y + box.top + box.height,
  };
}
export function overlaps(a: Rect, b: Rect, clearance = 0) {
  return (
    a.left < b.right + clearance &&
    a.right > b.left - clearance &&
    a.top < b.bottom + clearance &&
    a.bottom > b.top - clearance
  );
}
export function groupBox(
  nodes: { x: number; y: number; box: NodeBox }[],
  label: string,
) {
  const rects = nodes.map((n) => nodeRect(n.x, n.y, n.box));
  const left = Math.min(...rects.map((r) => r.left)) - 16;
  const right = Math.max(...rects.map((r) => r.right)) + 16;
  const top = Math.min(...rects.map((r) => r.top)) - 16;
  const columns = Math.max(
    6,
    Math.floor((right - left - 32) / (COMPOSED_TEXT.size * 0.65)),
  );
  const labelY = Math.max(...rects.map((r) => r.bottom)) + 48;
  const bottom =
    labelY + (wrapText(label, columns).length - 1) * COMPOSED_TEXT.gap + 24;
  return { left, right, top, bottom, columns, labelY };
}

/** Conservative token/label envelope; the real browser additionally checks glyph bounds. */
export function tokenEnvelope(label: string) {
  const half = Math.max(
    32,
    ...wrapText(label, TOKEN_TEXT.columns).map(
      (line) => (line.length * TOKEN_TEXT.size * 0.62) / 2,
    ),
  );
  return { half, top: -23, bottom: tokenBottom(label) };
}
