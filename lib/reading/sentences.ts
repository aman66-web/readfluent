/**
 * Pure text rules for the reader's word taps: where the words are in a page, which sentence
 * a tapped word is in, and the matching sentence of the translation.
 */

/** A word is a run of letters (any script) and apostrophes. */
const WORD = /[\p{L}\p{M}'’]+/gu;

export interface Token { text: string; /** Set for a word; undefined for the spaces and punctuation between. */ word?: string; start: number }

/** A text as words and the gaps between them, in order, each with where it starts. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let at = 0;
  for (const m of text.matchAll(WORD)) {
    const start = m.index ?? 0;
    if (start > at) out.push({ text: text.slice(at, start), start: at });
    out.push({ text: m[0], word: m[0].toLowerCase(), start });
    at = start + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), start: at });
  return out;
}

/** Where each sentence starts and ends: ends at . ! ? (with closing quotes), the last runs to the end. */
export function sentenceRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /[^.!?]+[.!?]+["'”]*\s*/g;
  let m: RegExpExecArray | null;
  let end = 0;
  while ((m = re.exec(text))) { out.push([m.index, m.index + m[0].length]); end = m.index + m[0].length; }
  if (end < text.length && text.slice(end).trim()) out.push([end, text.length]);
  if (!out.length) out.push([0, text.length]);
  return out;
}

/** Which sentence the character at `pos` is in. */
export function sentenceAt(ranges: readonly [number, number][], pos: number): number {
  const i = ranges.findIndex(([a, b]) => pos >= a && pos < b);
  return i < 0 ? 0 : i;
}

/**
 * The sentence of the translation that matches the one a tapped word is in. Texts and their
 * translations are written sentence for sentence; if the translation has fewer sentences, the last one.
 */
export function translatedLine(text: string, translation: string, pos: number): string {
  const mine = sentenceRanges(text);
  const theirs = sentenceRanges(translation);
  const [a, b] = theirs[Math.min(sentenceAt(mine, pos), theirs.length - 1)];
  return translation.slice(a, b).trim();
}
