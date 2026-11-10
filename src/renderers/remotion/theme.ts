export const VIDEO = Object.freeze({ width: 1080, height: 1920, fps: 30 });
export const SAFE = Object.freeze({
  left: 80,
  right: 920,
  top: 180,
  bottom: 1540,
});
export const THEME = Object.freeze({
  version: 'signal-trace-1',
  bg: '#101826',
  surface: '#192A3A',
  text: '#EDF4FA',
  muted: '#B0C3D1',
  flow: '#45B8D8',
  highlight: '#F6C56B',
  success: '#5FC8A4',
  grid: '#25384A',
  font: 'Inter Variable, sans-serif',
});
export const MOTION = Object.freeze({
  appearFrames: 12,
  travelFrom: 0.2,
  travelTo: 0.8,
});
export const CAPTION = Object.freeze({
  columns: 34,
  maxLines: 3,
  fontSize: 42,
  lineGap: 42,
});

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
