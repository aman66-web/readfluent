/**
 * Reads the hand-written books (scripts/books/BRIEF.md) from their files. Server only: this is
 * called from the reader's page, so the text of a book reaches a phone only as the pages of the
 * version that phone is reading, never as part of the app's code.
 *
 * One folder per book: `en.json` is the book (the default, in English) and `<code>.json` is a
 * translation of it, page for page. A language with no file simply is not offered yet.
 */
import type { LevelId } from "@/lib/content/limits";
import type { KeyPair, WordEntry } from "@/lib/preview/spanish";

export interface Beat { n: number; scene: string; summary: string }
export interface EnglishBook { slug: string; meta: { blurb: string; bible: string; chapters?: string[] }; beats: Beat[]; levels: Record<LevelId, string[]> }

/** One translated page: the text in the language, and three words of it matched to words of the English page. */
export interface TranslatedPage { text: string; keys: KeyPair[] }
export interface Translation { slug: string; lang: string; levels: Record<LevelId, TranslatedPage[]> }

const SLUG = /^[a-z0-9-]+$/;
const LANG = /^[a-z]{2,3}$/;

export async function loadEnglish(slug: string): Promise<EnglishBook | null> {
  if (!SLUG.test(slug)) return null;
  try { return (await import(`./${slug}/en.json`)).default as EnglishBook; } catch { return null; }
}

export async function loadTranslation(slug: string, lang: string): Promise<Translation | null> {
  if (!SLUG.test(slug) || !LANG.test(lang) || lang === "en") return null;
  try { return (await import(`./${slug}/${lang}.json`)).default as Translation; } catch { return null; }
}

/** The word cards for a language, only for the words in `words` (a version needs a few hundred of the thousands there are). */
export async function loadDictionary(lang: string, words: Iterable<string>): Promise<Record<string, WordEntry>> {
  if (!LANG.test(lang)) return {};
  let all: Record<string, WordEntry> = {};
  try { all = (await import(`./dictionary.${lang}.json`)).default as Record<string, WordEntry>; } catch { return {}; }
  const out: Record<string, WordEntry> = {};
  for (const w of words) if (w in all) out[w] = all[w];
  return out;
}

/** The first chapter of a book in a language, translated ahead of time by hand (Claude); the phone translates the rest. */
export interface StartTranslation { slug: string; lang: string; levels: Record<LevelId, TranslatedPage[]>; dict: Record<string, WordEntry> }

export async function loadStart(slug: string, lang: string): Promise<StartTranslation | null> {
  if (!SLUG.test(slug) || !LANG.test(lang) || lang === "en") return null;
  try { return (await import(`./${slug}/${lang}.start.json`)).default as StartTranslation; } catch { return null; }
}

/**
 * A whole book translated ahead of time by Apple's translator on a Mac (scripts/apple-translate): the pages of each
 * level as plain text, and a card for each word of them with its English meaning. `<slug>/<lang>.apple.json`.
 */
export interface AppleTranslation { slug: string; lang: string; levels: Record<LevelId, string[]>; dict: Record<string, string> }

export async function loadApple(slug: string, lang: string): Promise<AppleTranslation | null> {
  if (!SLUG.test(slug) || !LANG.test(lang) || lang === "en") return null;
  try { return (await import(`./${slug}/${lang}.apple.json`)).default as AppleTranslation; } catch { return null; }
}
