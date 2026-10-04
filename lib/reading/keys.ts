import { tokenize } from "./sentences";

/**
 * The matched words and phrases of a page: a word or phrase of the text and the words of the English line it matches,
 * shown in the same colour on both sides. A key may be one word or several ("le jeune homme" / "the young man").
 */
export interface Key {
  w: string;
  en: string;
  /** Where the match stands, when it was worked out for this very page (lib/translate/wordalign.ts): the start of each of its words in the page's text, and in the English line. Without them the phrase is looked for. */
  at?: number[];
  ea?: number[];
}

const wordsOf = (s: string): string[] => tokenize(s).flatMap((t) => (t.word ? [t.word] : []));

/**
 * For each word of `text` that is part of a key's phrase (on the `side` asked for), which key it belongs to: token start → key index.
 * Every occurrence of the phrase is marked; where two keys overlap, the earlier key keeps the word.
 */
export function keySpans(text: string, keys: readonly Key[], side: "w" | "en"): Map<number, number> {
  const toks = tokenize(text).filter((t) => t.word);
  const out = new Map<number, number>();
  keys.forEach((key, k) => {
    const placed = side === "w" ? key.at : key.ea;
    if (placed?.length) {
      // Worked out for this page: exactly these words, and no other appearance of them.
      for (const start of placed) if (!out.has(start)) out.set(start, k);
      return;
    }
    const phrase = wordsOf(side === "w" ? key.w : key.en);
    if (!phrase.length) return;
    for (let i = 0; i + phrase.length <= toks.length; i++) {
      if (phrase.every((w, j) => toks[i + j].word === w) && phrase.every((_, j) => !out.has(toks[i + j].start))) {
        phrase.forEach((_, j) => out.set(toks[i + j].start, k));
        i += phrase.length - 1;
      }
    }
  });
  return out;
}
