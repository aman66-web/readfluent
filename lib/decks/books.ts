/**
 * Book decks: the phrases of one book in the language being learned, each a flashcard (owner, 7 Oct 2026). A page's sentence is
 * cut at its commas (the clause before the comma is one card, the rest the next); a sentence with no comma that is too long is
 * cut in half. Read in order, the cards say the whole book. One JSON file per book, language and level
 * (`books/<slug>/<lang>.<level>.json`), fetched only when somebody opens it.
 */
import type { Phrase } from "./index";

/** A card of a book deck: a phrase, and the page of the book it comes from. */
export interface BookPhrase extends Phrase { page: number }

/** Which book decks exist: slug → language → the levels written. A deck is added here when its file is. */
export const BOOK_DECKS: Readonly<Record<string, Readonly<Record<string, readonly BookLevel[]>>>> = {
  "pride-and-prejudice": { hi: ["a1"] },
};
export type BookLevel = "a1";

/** The level of a book's deck for a language, or null when the book has none there. */
export const bookDeckLevel = (slug: string, lang: string | null | undefined): BookLevel | null => (lang ? BOOK_DECKS[slug]?.[lang]?.[0] ?? null : null);

const SLUG = /^[a-z0-9-]+$/;
const LANG = /^[a-z]{2}$/;

/** `bk:<slug>:<language>:<level>:<index>`: the flashcard id of the nth phrase of a book's deck. */
export const bookCardId = (slug: string, lang: string, level: BookLevel, index: number): string => `bk:${slug}:${lang}:${level}:${index}`;

export function parseBookCardId(id: string): { slug: string; lang: string; level: BookLevel; index: number } | null {
  const m = /^bk:([a-z0-9-]+):([a-z]{2}):(a1):(\d{1,4})$/.exec(id);
  return m ? { slug: m[1], lang: m[2], level: m[3] as BookLevel, index: Number(m[4]) } : null;
}

export async function loadBookDeck(slug: string, lang: string, level: BookLevel): Promise<BookPhrase[]> {
  if (!SLUG.test(slug) || !LANG.test(lang) || !bookDeckLevel(slug, lang)) return [];
  try {
    const mod = (await import(`./books/${slug}/${lang}.${level}.json`)) as { default: { cards: BookPhrase[] } };
    return mod.default.cards.filter((p) => typeof p.t === "string" && typeof p.en === "string");
  } catch {
    return [];
  }
}
