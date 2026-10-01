import { CEFR, type Cefr } from "@/lib/xp/levels";

/**
 * The placement test, as pure rules: an adaptive multiple-choice test of English that
 * ends in a level, A1 to C2, in about five minutes.
 *
 * It keeps one estimate of the reader's ability on the same 0–5 scale as the levels
 * (A1 = 0 … C2 = 5). It asks the unused question nearest that estimate, and each answer
 * moves the estimate by how surprising it was: a right answer to a hard question moves it
 * up a lot, a wrong answer to an easy one moves it down a lot, and the steps shrink as the
 * test goes on. Four options means one answer in four is a lucky guess, and the model
 * allows for that, so a few guesses do not lift anybody a level. Nothing here calls any
 * model: the questions are written files (lib/placement/bank-en.ts).
 */

export interface Item {
  id: string;
  /** 0 = A1 … 5 = C2. */
  level: number;
  kind: "grammar" | "vocabulary" | "reading";
  /** What is asked. For a cloze, the sentence with ___ in it. */
  prompt: string;
  /** A short text the question is about, for reading items. */
  passage?: string;
  options: readonly string[];
  /** Index into `options`. */
  answer: number;
}

export interface Answered { id: string; level: number; correct: boolean }

export interface State {
  theta: number;
  history: Answered[];
  /** The estimate after each answer, for judging when it has settled. */
  trail: number[];
}

/** Questions asked at most; at five or six seconds a question this is five minutes. */
export const MAX_QUESTIONS = 20;
/** Fewest asked before it may end early. */
export const MIN_QUESTIONS = 12;
/** B1: a sensible place to begin. */
export const START_THETA = 2;
const GUESS = 0.25;
const SLOPE = 1.3;

export const newState = (): State => ({ theta: START_THETA, history: [], trail: [START_THETA] });

/** Chance of a right answer to an item at `level` for a reader at `theta`, guessing allowed for. */
export function chanceCorrect(theta: number, level: number): number {
  return GUESS + (1 - GUESS) / (1 + Math.exp(-SLOPE * (theta - level)));
}

/** The state after one answer. */
export function answer(s: State, item: Pick<Item, "id" | "level">, correct: boolean): State {
  const n = s.history.length;
  const step = 2.4 / (1 + 0.5 * n);
  const theta = Math.min(5.4, Math.max(-0.4, s.theta + step * ((correct ? 1 : 0) - chanceCorrect(s.theta, item.level))));
  return { theta, history: [...s.history, { id: item.id, level: item.level, correct }], trail: [...s.trail, theta] };
}

/**
 * The next question: unused, as near the estimate as the bank allows, and a different
 * kind from the last when there is a choice. `rand` breaks ties; pass a seeded one in tests.
 */
export function nextItem(s: State, bank: readonly Item[], rand: () => number = Math.random): Item | null {
  const used = new Set(s.history.map((h) => h.id));
  const left = bank.filter((i) => !used.has(i.id));
  if (!left.length) return null;
  const lastKind = s.history.length ? bank.find((i) => i.id === s.history[s.history.length - 1].id)?.kind : undefined;
  const dist = (i: Item) => Math.abs(i.level - s.theta) + (i.kind === lastKind ? 0.35 : 0) + rand() * 0.2;
  return left.reduce((best, i) => (dist(i) < dist(best) ? i : best));
}

/** True once the test has asked enough, or the estimate has stopped moving. */
export function isDone(s: State, bankSize: number): boolean {
  const n = s.history.length;
  if (n >= Math.min(MAX_QUESTIONS, bankSize)) return true;
  if (n < MIN_QUESTIONS) return false;
  const last = s.trail.slice(-6);
  return Math.max(...last) - Math.min(...last) < 0.45;
}

/** The level the estimate means. */
export function resultOf(s: State): Cefr {
  return CEFR[Math.min(5, Math.max(0, Math.round(s.theta - 0.15)))];
}

/** How far through the test, 0–1, for a progress bar: questions asked out of the most it will ask. */
export const progressOf = (s: State, bankSize: number): number =>
  Math.min(1, s.history.length / Math.min(MAX_QUESTIONS, bankSize));

/** An item with its options in a random order, so the right answer is not in the same place each time. */
export function shuffled(item: Item, rand: () => number = Math.random): Item {
  const order = item.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...item, options: order.map((i) => item.options[i]), answer: order.indexOf(item.answer) };
}
