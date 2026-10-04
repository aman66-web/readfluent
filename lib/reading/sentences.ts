/**
 * Pure text rules for the reader's word taps: where the words are in a page, which sentence
 * a tapped word is in, and the matching sentence of the translation.
 */

/** A word is a run of letters (any script) and apostrophes. */
const WORD = /[\p{L}\p{M}'’]+/gu;

export interface Token { text: string; /** Set for a word; undefined for the spaces and punctuation between. */ word?: string; start: number }

/** Scripts written without spaces between words: their words have to be found, not split on. */
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
const segmenters = new Map<string, Intl.Segmenter>();
const segmenterFor = (text: string): Intl.Segmenter | null => {
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") return null;
  const locale = /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text) ? "ja" : /\p{Script=Thai}/u.test(text) ? "th" : "zh";
  let seg = segmenters.get(locale);
  if (!seg) { seg = new Intl.Segmenter(locale, { granularity: "word" }); segmenters.set(locale, seg); }
  return seg;
};

/** Japanese, Chinese and Thai: the phone's own word breaker (a run of characters up to the next mark is a whole clause, not a word to tap). */
function tokenizeUnspaced(text: string, seg: Intl.Segmenter): Token[] {
  const out: Token[] = [];
  let gap = -1;
  for (const s of seg.segment(text)) {
    if (s.isWordLike) {
      if (gap >= 0) { out.push({ text: text.slice(gap, s.index), start: gap }); gap = -1; }
      out.push({ text: s.segment, word: s.segment.toLowerCase(), start: s.index });
    } else if (gap < 0) gap = s.index;
  }
  if (gap >= 0) out.push({ text: text.slice(gap), start: gap });
  return out;
}

/** A text as words and the gaps between them, in order, each with where it starts. */
export function tokenize(text: string): Token[] {
  if (UNSPACED.test(text)) {
    const seg = segmenterFor(text);
    if (seg) return tokenizeUnspaced(text, seg);
  }
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

/**
 * Where each sentence starts and ends: ends at . ! ? or the full stops of other scripts (। ॥ Hindi and Bengali, ۔ ؟ Urdu and
 * Arabic, 。！？ Chinese and Japanese), with closing quotes after; the last runs to the end.
 */
export function sentenceRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /[^.!?。！？।॥۔؟]+[.!?。！？।॥۔؟]+["'”’」』)]*\s*/gu;
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
