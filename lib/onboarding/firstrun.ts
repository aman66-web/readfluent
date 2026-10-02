import { formatReadingTime } from "@/lib/i18n/format";

/**
 * The numbers the first run shows, worked out rather than claimed.
 *
 * The reader says how many minutes a day they can give the app, and the run shows what
 * that adds up to: the reading it makes in a year, and how long it would take them to
 * reach each level (lib/xp/path). Every number comes from what the person said and from
 * the same rules the dashboard keeps; nothing is a statistic about other people.
 */

/** The daily times offered as choices, in minutes. A reader may also type their own (`isDailyMinutes`). */
export const DAILY_MINUTES = [5, 10, 15, 20, 30, 45, 60] as const;
export type DailyMinutes = (typeof DAILY_MINUTES)[number];

/** The most a custom daily time may be: eight hours. */
export const MAX_DAILY_MINUTES = 480;

/** A time a reader can have as their daily goal: a whole number of minutes, one to eight hours' worth. */
export const isDailyMinutes = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_DAILY_MINUTES;

/** What the later screens assume when nobody picked a daily time (they can skip it). */
export const DEFAULT_MINUTES: DailyMinutes = 15;

/** English for tests and server logs; the screens use `formatReadingTime` with the reader's language. */
export const readingTime = (minutes: number): string => formatReadingTime(minutes, "en");
