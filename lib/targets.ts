import { PAGES_PER_MINUTE, xpPerDay } from "@/lib/xp/levels";
import type { DayStat } from "@/lib/xp/ledger";

/**
 * Today's targets: a handful of small things to do before the day is over, sized from the daily
 * goal the reader chose. Worked out from what the device already keeps (the ledger, the saved words,
 * the flashcards' log), so nothing here needs a server and a target cannot be "earned" any way but by
 * doing the thing.
 */
export type TargetId = "pages" | "flashcards" | "xp" | "words" | "friend";

export interface Target {
  id: TargetId;
  current: number;
  goal: number;
  done: boolean;
  /** Where tapping it goes, for the ones that are done somewhere else. */
  href?: string;
}

export interface TargetInput {
  /** The reader's daily goal in minutes. */
  minutes: number;
  /** What the ledger says about today. */
  day: DayStat;
  savedToday: number;
  reviewedToday: number;
  /** "todo": no friends yet and accounts are on; "done": they have one; "hidden": there is no way to add one here. */
  friend: "todo" | "done" | "hidden";
}

export const WORDS_GOAL = 5;
export const CARDS_GOAL = 10;

/** Pages for the daily goal, to the nearest five and never fewer than five. */
export const pagesGoal = (minutes: number): number => Math.max(5, Math.round((Math.max(0, minutes) * PAGES_PER_MINUTE) / 5) * 5);

export function dailyTargets(i: TargetInput): Target[] {
  const t = (id: TargetId, current: number, goal: number, href?: string): Target => ({ id, current: Math.min(current, goal), goal, done: current >= goal, href });
  const out: Target[] = [
    t("pages", i.day.pages, pagesGoal(i.minutes)),
    t("flashcards", i.reviewedToday, CARDS_GOAL, "/recall"),
    t("xp", i.day.xp, Math.max(10, xpPerDay(i.minutes))),
    t("words", i.savedToday, WORDS_GOAL),
  ];
  if (i.friend !== "hidden") out.push(t("friend", i.friend === "done" ? 1 : 0, 1, "/friends"));
  return out;
}

/** How many are done, and how many there are. */
export const progressOf = (targets: readonly Target[]): { done: number; total: number } => ({ done: targets.filter((x) => x.done).length, total: targets.length });
