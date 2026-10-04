/**
 * Marking, with no model: what the reader typed or said against what was asked for. Pure. A typed sentence is judged by how
 * close it is, letter by letter, so a slip or a missing accent does not fail it; a spoken one is judged by what the
 * phone's recogniser heard, which is looser, so it is given more room. Chinese and Japanese have no spaces, so every
 * comparison is by letters, not words.
 */
const MARKS = /[\p{P}\p{S}\s‌‍]/gu;

/** A text with case, accents, punctuation and spaces taken out, so only the letters are compared. */
export function squash(s: string): string {
  return s.normalize("NFKD").replace(/\p{M}/gu, "").normalize("NFKC").toLowerCase().replace(MARKS, "");
}

/** The same, but keeping the accents (for scripts where a mark changes the letter, so only Latin is stripped). */
export const squashKeepMarks = (s: string): string => s.normalize("NFKC").toLowerCase().replace(MARKS, "");

/** Edit distance between two strings, by letters (code points). */
export function distance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  if (!x.length) return y.length;
  if (!y.length) return x.length;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}

/** 0 to 1: how alike two texts are once squashed. */
export function similarity(a: string, b: string): number {
  const x = squash(a);
  const y = squash(b);
  const n = Math.max([...x].length, [...y].length);
  return n === 0 ? 0 : 1 - distance(x, y) / n;
}

/** What share of a text's words (or, for a script without spaces, letters) another text has: an order-free check for speech. */
export function overlap(expected: string, heard: string): number {
  const words = (s: string) => s.normalize("NFKC").toLowerCase().split(/[\p{P}\p{S}\s]+/u).filter(Boolean).map((w) => w.normalize("NFKD").replace(/\p{M}/gu, ""));
  const e = words(expected);
  const h = words(heard);
  if (e.length >= 3 && h.length >= 1) {
    const pool = [...h];
    let hit = 0;
    for (const w of e) { const i = pool.indexOf(w); if (i >= 0) { hit++; pool.splice(i, 1); } }
    return hit / e.length;
  }
  return similarity(expected, heard);
}

/** The pass marks. */
export const MARK = {
  /** A typed dictation: a slip or two is allowed. */
  dictation: 0.85,
  /** The same typed in Latin letters for a language shown romanised: spellings of one word vary a lot. */
  dictationRoman: 0.6,
  /** A sentence said aloud: the recogniser mishears, so the words heard just have to be most of the sentence. */
  speech: 0.7,
} as const;

export const gradeDictation = (expected: string, typed: string, roman = false): boolean => similarity(expected, typed) >= (roman ? MARK.dictationRoman : MARK.dictation);

/** A spoken sentence passes when the recogniser heard the words (in any order, so a clipped start does not fail it) or the letters, well enough. */
export const gradeSpeech = (expected: string, heard: string): boolean => Math.max(overlap(expected, heard), similarity(expected, heard)) >= MARK.speech;

/** How many words a text has (letters/4 for scripts with no spaces, so a Chinese sentence is not "one word"). */
export function wordCount(s: string): number {
  const spaced = s.trim().split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w));
  const letters = [...s].filter((c) => /\p{L}/u.test(c)).length;
  return spaced.length >= letters / 6 ? spaced.length : Math.ceil(letters / 2);
}

const LATIN = /\p{Script=Latin}/u;
/** Whether a text has no letters of the language's own script (so it is typed in Latin letters). */
export const isLatinText = (s: string): boolean => { const l = [...s].filter((c) => /\p{L}/u.test(c)); return l.length > 0 && l.every((c) => LATIN.test(c)); };

/**
 * A short written answer, for 2 points: 1 for being long enough (the level's `min` words, with a little room), 1 for using
 * the passage's own words (any of `keys`). Nothing here judges grammar and the screen says so: it checks effort and that the
 * answer is about the text.
 */
export function gradeWriting(text: string, min: number, keys: readonly string[], opts: { roman?: (s: string) => string; prompt?: string } = {}): { points: number; long: boolean; onTopic: boolean } {
  const t = text.trim();
  const long = wordCount(t) >= Math.max(2, Math.ceil(min * 0.75));
  // A copy of the prompt is not an answer.
  const copied = opts.prompt ? similarity(t, opts.prompt) > 0.9 : false;
  const hay = squash(t);
  const hayRoman = opts.roman && isLatinText(t) ? squash(t) : null;
  const onTopic = !copied && keys.some((k) => {
    const sk = squash(k);
    if (sk && hay.includes(sk)) return true;
    const rk = opts.roman ? squash(opts.roman(k)) : "";
    return !!(hayRoman && rk && hayRoman.includes(rk));
  });
  return { points: (long && !copied ? 1 : 0) + (onTopic ? 1 : 0), long: long && !copied, onTopic };
}
