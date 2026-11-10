export const LEXICON = Object.freeze({
  version: 'tech-en-v1',
  entries: Object.freeze([
    { term: 'HTTP', spoken: 'H T T P' },
    { term: 'URL', spoken: 'U R L' },
    { term: 'server', spoken: 'server' },
    { term: 'request', spoken: 'request' },
    { term: 'response', spoken: 'response' },
  ]),
});

export function spokenText(text: string): string {
  // Literal whole-word substitutions only. No SSML, code, markup or phoneme evaluation.
  let result = text;
  for (const entry of LEXICON.entries) {
    if (entry.term !== entry.spoken)
      result = result.replace(
        new RegExp(`\\b${entry.term}\\b`, 'g'),
        () => entry.spoken,
      );
  }
  return result;
}
