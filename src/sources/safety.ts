export const SafetyCodes = [
  'instruction_override',
  'command',
  'secret',
  'hidden_controls',
] as const;
export type SafetyCode = (typeof SafetyCodes)[number];
const credentialPattern =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b|\bBearer\s+[A-Za-z0-9._~+/-]{8,}|\b(?:api[_ -]?key|access[_ -]?token|password|client[_ -]?secret|authorization)\s*["']?\s*[:=]\s*["']?\S{6,}/i;
function normalizedText(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, '');
}
export function hasCredentialLikeText(raw: string): boolean {
  return credentialPattern.test(normalizedText(raw));
}
export function assessText(raw: string): SafetyCode[] {
  const result: SafetyCode[] = [];
  const text = normalizedText(raw);
  if (
    /(?:ignore|override|disregard|forget|replace)\b[\s\S]{0,100}\b(?:instructions|rules|system prompt|developer|policy)\b|\b(?:system|assistant|developer)\s*:|<\|(?:im_start|system|assistant)|<\/?(?:system|assistant|tool)>|\b(?:reveal|exfiltrate|leak)\b[\s\S]{0,100}\b(?:keys|secrets|credentials|tokens)\b/i.test(
      text,
    )
  )
    result.push('instruction_override');
  if (
    /(?:^|[\s`>])(?:sudo\s|curl\s|wget\s|bash\s|sh\s+-c|powershell\s|git\s+clone|npm\s+(?:install|exec)|npx\s|pip\s+install|rm\s+-rf)|\$\(|\b(?:eval|exec)\s*\(/im.test(
      text,
    )
  )
    result.push('command');
  if (credentialPattern.test(text)) result.push('secret');
  const controls = [...raw].some((char) => {
    const n = char.codePointAt(0) ?? 0;
    return (n < 32 && ![9, 10, 13].includes(n)) || (n >= 127 && n <= 159);
  });
  if (controls || /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(raw))
    result.push('hidden_controls');
  return result;
}
function entities(text: string) {
  return text.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|\d+);/gi,
    (entity) => {
      const named: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&nbsp;': ' ',
      };
      const known = named[entity.toLowerCase()];
      if (known) return known;
      const hex = entity.toLowerCase().startsWith('&#x');
      const n = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
        ? String.fromCodePoint(n)
        : ' ';
    },
  );
}
export function documentText(body: string, html: boolean): string {
  let text = body;
  if (html) {
    const ordinary: string[] = [];
    const main: string[] = [];
    let offset = 0;
    let skip = '';
    let mainTag = '';
    let inMain = false;
    while (offset < text.length) {
      const open = text.indexOf('<', offset);
      const endText = open < 0 ? text.length : open;
      if (!skip) {
        const part = text.slice(offset, endText);
        ordinary.push(part);
        if (inMain) main.push(part);
      }
      if (open < 0) break;
      if (text.startsWith('<!--', open)) {
        const endComment = text.indexOf('-->', open + 4);
        if (endComment < 0) break;
        offset = endComment + 3;
        continue;
      }
      const close = text.indexOf('>', open + 1);
      if (close < 0) break;
      const tag = text
        .slice(open + 1, close)
        .match(/^\s*(\/?)\s*([a-z][a-z0-9-]*)/i);
      const name = tag?.[2]?.toLowerCase() ?? '';
      const closing = tag?.[1] === '/';
      if (skip) {
        if (closing && name === skip) skip = '';
      } else if (
        [
          'script',
          'style',
          'nav',
          'header',
          'footer',
          'form',
          'iframe',
          'svg',
        ].includes(name) &&
        !closing
      )
        skip = name;
      else if (['main', 'article'].includes(name)) {
        if (!closing && !mainTag) {
          mainTag = name;
          inMain = true;
        } else if (closing && name === mainTag) inMain = false;
      }
      if (!skip) {
        ordinary.push(' ');
        if (inMain) main.push(' ');
      }
      offset = close + 1;
    }
    text = main.length ? main.join(' ') : ordinary.join(' ');
  }
  // Text extraction only; never render this as HTML, evaluate it or follow its links.
  return entities(text).replace(/\s+/gu, ' ').trim();
}
