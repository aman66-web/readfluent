/** Counting sentences and words the one way everything in the pipeline counts them. */

/** A sentence ends at . ! ? (with closing quotes or brackets after it). Titles are written without a full stop (Mr Darcy), so they do not end one. */
export function sentences(text: string): string[] {
  const out = text.match(/[^.!?]+[.!?]+["'”’)\]]*\s*/g)?.map((s) => s.trim()) ?? [];
  const rest = text.replace(/[^.!?]+[.!?]+["'”’)\]]*\s*/g, "").trim();
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

export function sentenceRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /[^.!?]+[.!?]+["'”’)\]]*\s*/g;
  let m: RegExpExecArray | null;
  let end = 0;
  while ((m = re.exec(text))) { out.push([m.index, m.index + m[0].length]); end = m.index + m[0].length; }
  if (end < text.length && text.slice(end).trim()) out.push([end, text.length]);
  return out.length ? out : [[0, text.length]];
}

const WORD = /[\p{L}\p{M}][\p{L}\p{M}'’-]*/gu;
export interface Tok { text: string; lower: string; start: number }
export function words(text: string): Tok[] {
  return [...text.matchAll(WORD)].map((m) => ({ text: m[0], lower: m[0].toLowerCase().replace(/’/g, "'"), start: m.index ?? 0 }));
}
export const wordCount = (text: string): number => words(text).length;

/** Which sentence (0-based) the character at `pos` is in. */
export function sentenceAt(ranges: readonly [number, number][], pos: number): number {
  const i = ranges.findIndex(([a, b]) => pos >= a && pos < b);
  return i < 0 ? ranges.length - 1 : i;
}

/** Syllables in an English word, roughly: vowel groups, less a silent final e. Good enough for a readability grade. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/** Flesch–Kincaid grade of an English text. */
export function fkGrade(text: string): number {
  const s = Math.max(1, sentences(text).length);
  const w = words(text);
  if (w.length === 0) return 0;
  const syl = w.reduce((n, t) => n + syllables(t.text), 0);
  return 0.39 * (w.length / s) + 11.8 * (syl / w.length) - 15.59;
}
