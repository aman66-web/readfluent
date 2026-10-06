import { parseDeckCardId, deckCardId, type DeckSize } from "@/lib/decks";
import { parseBookCardId, bookCardId, type BookLevel } from "@/lib/decks/books";
import { TOPIC_SIZE, parseTopicCardId, topicCardId, type TopicId } from "@/lib/decks/topics";
import { dueCards, type Card } from "./schedule";

/** A card that has never been answered. */
export const isNewCard = (c: Card): boolean => c.reps === 0 && c.interval === 0 && c.lapses === 0;

export const NEW_PER_SESSION = 10;
export const MAX_PER_SESSION = 30;
/** The most cards one "practise everything from this book" sitting holds. */
export const ALL_MAX = 100;

/**
 * The cards for one sitting: what is due first (the ones being relearned and the ones that have come
 * round), then a few new ones, so a deck of a hundred is met ten at a time rather than all at once.
 * `only` narrows it to some cards (one deck, or the saved words).
 */
export function buildSession(cards: readonly Card[], now: number, opts: { only?: (id: string) => boolean; newLimit?: number; max?: number; /** Every card of the set, due or not (practising a book's words): what is due first, then the rest, soonest due first. */ all?: boolean } = {}): string[] {
  const pool = opts.only ? cards.filter((c) => opts.only!(c.id)) : cards;
  if (opts.all) {
    const due = dueCards(pool, now);
    const rest = pool.filter((c) => c.due > now).sort((a, b) => a.due - b.due);
    return [...due, ...rest].slice(0, opts.max ?? ALL_MAX).map((c) => c.id);
  }
  const due = dueCards(pool, now);
  const reviews = due.filter((c) => !isNewCard(c));
  const fresh = due.filter(isNewCard).slice(0, opts.newLimit ?? NEW_PER_SESSION);
  return [...reviews, ...fresh].slice(0, opts.max ?? MAX_PER_SESSION).map((c) => c.id);
}

/** How a deck is getting on: of its `size` phrases, how many have been met and how many are well learned (a day or more between reviews). */
export function deckProgress(cards: Record<string, Card>, lang: string, size: DeckSize): { met: number; learned: number; size: number } {
  let met = 0;
  let learned = 0;
  for (let i = 0; i < size; i++) {
    const c = cards[deckCardId(lang, i)];
    if (!c) continue;
    if (!isNewCard(c)) met++;
    if (c.interval >= 1) learned++;
  }
  return { met, learned, size };
}

/** Whether a card is of one language's deck of `size` phrases. */
export function inDeck(id: string, lang: string, size: DeckSize): boolean {
  const d = parseDeckCardId(id);
  return !!d && d.lang === lang && d.index < size;
}

/** How a topic deck is getting on: of its phrases, how many have been met and how many are well learned. */
export function topicProgress(cards: Record<string, Card>, lang: string, topic: TopicId, size = TOPIC_SIZE): { met: number; learned: number; size: number } {
  let met = 0;
  let learned = 0;
  for (let i = 0; i < size; i++) {
    const c = cards[topicCardId(lang, topic, i)];
    if (!c) continue;
    if (!isNewCard(c)) met++;
    if (c.interval >= 1) learned++;
  }
  return { met, learned, size };
}

/** Whether a card is of one language's topic deck. */
export function inTopic(id: string, lang: string, topic: TopicId): boolean {
  const d = parseTopicCardId(id);
  return !!d && d.lang === lang && d.topic === topic;
}

/** Whether a card is of one book's deck in one language. */
export function inBookDeck(id: string, slug: string, lang: string): boolean {
  const d = parseBookCardId(id);
  return !!d && d.slug === slug && d.lang === lang;
}

/** How a book deck is getting on: of its phrases, how many have been met and how many are well learned. */
export function bookProgress(cards: Record<string, Card>, slug: string, lang: string, level: BookLevel, size: number): { met: number; learned: number; size: number } {
  let met = 0;
  let learned = 0;
  for (let i = 0; i < size; i++) {
    const c = cards[bookCardId(slug, lang, level, i)];
    if (!c) continue;
    if (!isNewCard(c)) met++;
    if (c.interval >= 1) learned++;
  }
  return { met, learned, size };
}
