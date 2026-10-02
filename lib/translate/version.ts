/**
 * One version of a book in the language being learned, made by the machine translator: the pages
 * (translated from the English, page for page) and a word card for every word on them (the word
 * translated into the language the reader speaks). The reader (components/Reader.tsx) takes it as
 * a variant like any other, so tap-a-word, the line translation and Listen all work as they do for a
 * hand-written translation. Server only (lib/translate/google.ts holds the key).
 */
import type { ReaderVariant } from "@/components/reader/types";
import type { LanguageCode } from "@/lib/onboarding/languages";
import type { WordEntry } from "@/lib/preview/spanish";
import { tokenize } from "@/lib/reading/sentences";
import { translateTexts } from "./google";

type Translate = typeof translateTexts;

/** The words of some translated pages, each once, in the order they first appear. */
export function uniqueWords(pages: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const text of pages) for (const t of tokenize(text)) if (t.word) seen.add(t.word);
  return [...seen];
}

export async function buildVariant(english: readonly string[], lang: LanguageCode, speak: LanguageCode, translate: Translate = translateTexts): Promise<ReaderVariant> {
  const pages = await translate(english, "en", lang);
  const words = uniqueWords(pages);
  // A word is looked up alone, so a short word may come back as a name or a different sense: it is a first meaning, not a dictionary.
  const meanings = lang === speak ? words : await translate(words, lang, speak);
  const dict: Record<string, WordEntry> = {};
  words.forEach((w, i) => { dict[w] = { en: meanings[i] ?? w, use: "" }; });
  return {
    lang,
    dict,
    pages: pages.map((text, i) => ({ n: i + 1, text, scene: i + 1, target: { translation: english[i], keys: [] } })),
  };
}
