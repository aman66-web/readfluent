/**
 * The numbers the first run shows, worked out rather than claimed.
 *
 * The run holds up a mirror — how much of a year scrolling takes — and then shows
 * what a few minutes a day of reading would be instead. Every number comes from
 * here, from what the person said: nothing is a statistic about other people and
 * nothing promises what the app does not do.
 */

/* ── How long somebody scrolls ─────────────────────────────────────────── */

export const SCROLL_IDS = ["under1", "1to2", "2to4", "4plus"] as const;
export type ScrollId = (typeof SCROLL_IDS)[number];

/**
 * Hours a day for each answer: the middle of a range, and the bottom of the
 * open-ended one, so the year it adds up to is never overstated.
 */
export const SCROLL_HOURS: Readonly<Record<ScrollId, number>> = {
  under1: 0.75,
  "1to2": 1.5,
  "2to4": 3,
  "4plus": 4,
};

/** Whole days of a year that many hours a day add up to. */
export function scrollDaysAYear(id: ScrollId): number {
  return Math.round((SCROLL_HOURS[id] * 365) / 24);
}

/* ── What a few minutes a day adds up to ───────────────────────────────── */

/** The daily times offered, in minutes. */
export const DAILY_MINUTES = [5, 10, 15, 20] as const;
export type DailyMinutes = (typeof DAILY_MINUTES)[number];

/** The swap the mirror suggests before anybody has chosen: ten minutes. */
export const SWAP_MINUTES = 10;

/** What the later screens assume when nobody picked a daily time (they can skip it). */
export const DEFAULT_MINUTES: DailyMinutes = 10;

/**
 * Time spent reading, said the way a person says it: minutes under three hours
 * ("140 minutes"), whole hours after that ("121 hours"), rounded down so it never
 * claims more than the arithmetic.
 */
export function readingTime(minutes: number): string {
  const [value, unit] = minutes < 180 ? [Math.round(minutes), "minute"] : [Math.floor(minutes / 60), "hour"];
  return new Intl.NumberFormat("en", { style: "unit", unit, unitDisplay: "long" }).format(value);
}
