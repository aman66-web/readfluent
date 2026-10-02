/**
 * Spaced repetition for the words a reader saved: each word comes back just before it would be forgotten.
 *
 * A small, plain scheduler in the family of SM-2: a card has an interval (days) and an ease. Answering
 * "good" multiplies the interval by the ease, "easy" by a little more and raises the ease, "again" sends the
 * card back to ten minutes from now and lowers the ease. Pure functions of the card, the answer and the
 * clock, so every rule can be tested.
 */
export type Grade = "again" | "good" | "easy";

export interface Card {
  /** `<language>:<word>`, the same key the saved words use (lib/words/saved). */
  id: string;
  /** When it is next due, ms since the epoch. */
  due: number;
  /** Days between this review and the next one it earned; 0 while it is being learned. */
  interval: number;
  ease: number;
  /** Times in a row it has been remembered. */
  reps: number;
  lapses: number;
}

export const DAY_MS = 86_400_000;
export const RELEARN_MS = 10 * 60_000;
export const START_EASE = 2.5;
export const MIN_EASE = 1.3;

export const newCard = (id: string, now: number): Card => ({ id, due: now, interval: 0, ease: START_EASE, reps: 0, lapses: 0 });

/** The card after an answer given at `now`. */
export function review(card: Card, grade: Grade, now: number): Card {
  if (grade === "again") {
    return { ...card, due: now + RELEARN_MS, interval: 0, ease: Math.max(MIN_EASE, card.ease - 0.2), reps: 0, lapses: card.lapses + 1 };
  }
  const reps = card.reps + 1;
  let interval: number;
  if (card.interval === 0) interval = grade === "easy" ? 4 : 1;
  else if (reps === 2 && card.interval < 3) interval = grade === "easy" ? 5 : 3;
  else interval = Math.max(card.interval + 1, Math.round(card.interval * card.ease * (grade === "easy" ? 1.3 : 1)));
  const ease = grade === "easy" ? card.ease + 0.15 : card.ease;
  return { ...card, due: now + interval * DAY_MS, interval, ease, reps };
}

/** What a reader would be told each answer does, in days ("<1" for ten minutes), for the buttons. */
export function previewDays(card: Card, grade: Grade): number {
  const next = review(card, grade, 0);
  return next.interval;
}

/** Cards due at `now`, the longest overdue first. */
export const dueCards = (cards: readonly Card[], now: number): Card[] => cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);

const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** A card from storage; anything that is not one is dropped. */
export function parseCard(id: string, v: unknown): Card | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const ease = Math.max(MIN_EASE, Math.min(3.5, num(o.ease, START_EASE)));
  return { id, due: Math.max(0, num(o.due, 0)), interval: Math.max(0, Math.floor(num(o.interval, 0))), ease, reps: Math.max(0, Math.floor(num(o.reps, 0))), lapses: Math.max(0, Math.floor(num(o.lapses, 0))) };
}
