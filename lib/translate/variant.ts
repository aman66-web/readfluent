/**
 * One version of a book in the language being learned, made by a translator: the pages (translated from the
 * English, page for page) and a word card for every word on them (the word translated into the language the
 * reader speaks). The reader (components/Reader.tsx) takes it as a variant like any other, so tap-a-word, the
 * line translation and Listen all work as they do for a hand-written translation.
 *
 * Pure: the translator is passed in. The server passes Google (lib/translate/version.ts); the phone passes its
 * own on-device translator (lib/translate/device.ts).
 */
import type { ReaderVariant } from "@/components/reader/types";
import type { WordEntry } from "@/lib/preview/spanish";
import { tokenize } from "@/lib/reading/sentences";

/** Translates texts, in order, from one language to another. */
export type TranslateFn = (texts: string[], from: string, to: string) => Promise<string[]>;

/** The words of some translated pages, each once, in the order they first appear. */
export function uniqueWords(pages: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const text of pages) for (const t of tokenize(text)) if (t.word) seen.add(t.word);
  return [...seen];
}

/** The pages only (fast): what the reader needs to open. Word cards follow with `wordCards`. */
export async function translatePages(english: readonly string[], lang: string, translate: TranslateFn): Promise<ReaderVariant> {
  const pages = await translate([...english], "en", lang);
  return {
    lang: lang as ReaderVariant["lang"],
    dict: {},
    pages: pages.map((text, i) => ({ n: i + 1, text, scene: i + 1, target: { translation: english[i], keys: [] } })),
  };
}

/** A word card for every word of the translated pages, in the language the reader speaks. */
export async function wordCards(variant: ReaderVariant, speak: string, translate: TranslateFn): Promise<Record<string, WordEntry>> {
  const words = uniqueWords(variant.pages.map((p) => p.text));
  // A word is looked up alone, so a short word may come back as a name or a different sense: it is a first meaning, not a dictionary.
  const meanings = variant.lang === speak ? words : await translate(words, variant.lang, speak);
  const dict: Record<string, WordEntry> = {};
  words.forEach((w, i) => { dict[w] = { en: meanings[i] ?? w, use: "" }; });
  return dict;
}

export async function buildVariantWith(english: readonly string[], lang: string, speak: string, translate: TranslateFn): Promise<ReaderVariant> {
  const v = await translatePages(english, lang, translate);
  return { ...v, dict: await wordCards(v, speak, translate) };
}
