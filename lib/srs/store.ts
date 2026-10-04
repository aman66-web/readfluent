import { TOPIC_SIZE, topicCardId, type TopicId } from "@/lib/decks/topics";
import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { localDay } from "@/lib/xp/ledger";
import type { Saved } from "@/lib/words/saved";
import { deckCardId, type DeckSize } from "@/lib/decks";
import { newCard, parseCard, review, type Card, type Grade } from "./schedule";

/** The flashcards' state, kept on the device: a card for every saved word, and how many were answered each day. */
export const SRS_KEY = storageKey("srs");

export interface Srs { cards: Record<string, Card>; /** Local day → cards answered. */ log: Record<string, number> }
export const EMPTY_SRS: Srs = { cards: {}, log: {} };

export function parseSrs(raw: string | null | undefined): Srs {
  if (!raw) return EMPTY_SRS;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return EMPTY_SRS;
    const o = v as { cards?: unknown; log?: unknown };
    const cards: Record<string, Card> = {};
    if (typeof o.cards === "object" && o.cards !== null) {
      for (const [id, c] of Object.entries(o.cards)) { const card = parseCard(id, c); if (card) cards[id] = card; }
    }
    const log: Record<string, number> = {};
    if (typeof o.log === "object" && o.log !== null) {
      for (const [d, n] of Object.entries(o.log)) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && typeof n === "number" && n > 0) log[d] = Math.floor(n);
    }
    return { cards, log };
  } catch {
    return EMPTY_SRS;
  }
}

const read = (): Srs => parseSrs(readRaw(SRS_KEY));
const write = (s: Srs) => writeRaw(SRS_KEY, JSON.stringify(s));

/** Every saved word has a card; a word taken out of the saved list loses its card. Cards of the phrase decks are kept. */
export function withCardsFor(srs: Srs, saved: Saved, now: number): Srs {
  const cards: Record<string, Card> = {};
  for (const [id, c] of Object.entries(srs.cards)) if (id.startsWith("deck:")) cards[id] = c;
  for (const id of Object.keys(saved)) cards[id] = srs.cards[id] ?? newCard(id, now);
  const same = Object.keys(cards).length === Object.keys(srs.cards).length && Object.keys(cards).every((id) => srs.cards[id]);
  return same ? srs : { ...srs, cards };
}

/** Gives the saved words their cards (idempotent). */
export function syncCards(saved: Saved): void {
  const now = Date.now();
  const cur = read();
  const next = withCardsFor(cur, saved, now);
  if (next !== cur) write(next);
}

/** Records an answer: the card moves on, and the day's count goes up. */
export function answerCard(id: string, grade: Grade, now = Date.now()): void {
  const s = read();
  const card = s.cards[id];
  if (!card) return;
  const day = localDay(new Date(now));
  write({ cards: { ...s.cards, [id]: review(card, grade, now) }, log: { ...s.log, [day]: (s.log[day] ?? 0) + 1 } });
}

/** The state with the first `size` phrases of a language's deck added as cards (the ones already there keep their progress). */
export function withDeck(srs: Srs, lang: string, size: DeckSize, now: number): Srs {
  const cards = { ...srs.cards };
  let added = false;
  for (let i = 0; i < size; i++) {
    const id = deckCardId(lang, i);
    if (!cards[id]) { cards[id] = newCard(id, now); added = true; }
  }
  return added ? { ...srs, cards } : srs;
}

/** The state with a topic deck's cards added (the ones already there keep their progress). */
export function withTopic(srs: Srs, lang: string, topic: TopicId, now: number): Srs {
  const cards = { ...srs.cards };
  let added = false;
  for (let i = 0; i < TOPIC_SIZE; i++) {
    const id = topicCardId(lang, topic, i);
    if (!cards[id]) { cards[id] = newCard(id, now); added = true; }
  }
  return added ? { ...srs, cards } : srs;
}

/** Adds a deck's cards (idempotent). */
export function addDeck(lang: string, size: DeckSize, now = Date.now()): void {
  const cur = read();
  const next = withDeck(cur, lang, size, now);
  if (next !== cur) write(next);
}

/** Saves a state worked out beforehand (a sitting's starting cards). */
export function saveSrs(s: Srs): void { write(s); }

/** The state a sitting starts from: every saved word has its card, and the deck chosen (if any) is on the table. */
export function sittingState(srs: Srs, saved: Saved, deck: { lang: string; size: DeckSize } | null, now: number, topic: { lang: string; topic: TopicId } | null = null): Srs {
  const withWords = withCardsFor(srs, saved, now);
  if (topic) return withTopic(withWords, topic.lang, topic.topic, now);
  return deck ? withDeck(withWords, deck.lang, deck.size, now) : withWords;
}
