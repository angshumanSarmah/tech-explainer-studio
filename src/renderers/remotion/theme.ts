import { BRAND } from '../../branding/profile.ts';
export const VIDEO = Object.freeze({ width: 1080, height: 1920, fps: 30 });
export const SAFE = BRAND.safe;
export const THEME = Object.freeze({
  version: 'signal-trace-1',
  ...BRAND.colors,
  font: BRAND.typography.font,
});
export const MOTION = Object.freeze({
  ...BRAND.motion,
  travelFrom: 0.2,
  travelTo: 0.8,
});
export const CAPTION = Object.freeze({ ...BRAND.captions, serverLift: 70 });

export function wrapText(text: string, columns: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && `${line} ${word}`.length > columns) {
      lines.push(line);
      line = '';
    }
    const chunks = word.match(new RegExp(`.{1,${columns}}`, 'gu')) ?? [];
    chunks.forEach((chunk, index) => {
      if (index > 0) {
        lines.push(line);
        line = '';
      }
      line = line ? `${line} ${chunk}` : chunk;
    });
  }
  if (line) lines.push(line);
  return lines;
}
