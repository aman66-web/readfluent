/**
 * The phrase decks: for each language, the 100 phrases a beginner needs most, most useful first. The top 50
 * deck is the first fifty of them. Each deck is a small JSON file of its own, fetched only when somebody
 * opens it (a language nobody is learning costs nothing).
 */
export interface Phrase {
  /** The phrase, in the language. */
  t: string;
  /** What it means in English (for English itself: when it is said). */
  en: string;
  /** How to say it, for an English speaker. */
  ph?: string;
}

export const DECK_SIZES = [50, 100] as const;
export type DeckSize = (typeof DECK_SIZES)[number];

const LANG = /^[a-z]{2}$/;

/** `deck:<language>:<index>`: the flashcard id of the nth phrase of a language's deck. */
export const deckCardId = (lang: string, index: number): string => `deck:${lang}:${index}`;

/** Which phrase a flashcard id points at, or null if it is not a deck card. */
export function parseDeckCardId(id: string): { lang: string; index: number } | null {
  const m = /^deck:([a-z]{2}):(\d{1,3})$/.exec(id);
  return m ? { lang: m[1], index: Number(m[2]) } : null;
}

export async function loadDeck(lang: string): Promise<Phrase[]> {
  if (!LANG.test(lang)) return [];
  try {
    const mod = (await import(`./data/${lang}.json`)) as { default: { phrases: Phrase[] } };
    return mod.default.phrases.filter((p) => typeof p.t === "string" && typeof p.en === "string");
  } catch {
    return [];
  }
}
