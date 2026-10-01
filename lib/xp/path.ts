import type { LanguageCode } from "@/lib/onboarding/languages";
import { CEFR, LEVEL_FLOOR, PAGES_PER_MINUTE, levelFromXp, startingXp, xpPerDay, type Cefr, type LevelState } from "./levels";

/**
 * How long each level up takes, for a reader at a level who commits some minutes a day.
 * It is the same arithmetic the dashboard keeps (lib/xp/levels): the XP still needed to
 * reach a level, divided by the XP a day of that many minutes earns. An estimate of the
 * reading done here and nothing else, and said to be one.
 */

export interface PathStep {
  level: Cefr;
  /** Days from now, reading `minutes` a day, to reach this level. */
  days: number;
}

/** Every level above `from`, with the days it takes to reach each. Empty at the top, or with no time given. */
export function pathFrom(from: Cefr | null | undefined, minutes: number): PathStep[] {
  const perDay = xpPerDay(minutes);
  const start = startingXp(from ?? "A1");
  const now = levelFromXp(start).level;
  if (perDay <= 0) return [];
  return CEFR.slice(CEFR.indexOf(now) + 1).map((level) => ({ level, days: Math.max(1, Math.ceil((LEVEL_FLOOR[level] - start) / perDay)) }));
}

/** A length of time as a person would say it: days up to about two months, then months, then years. */
export function formatDuration(days: number, locale: LanguageCode = "en"): string {
  const [value, unit] = days < 60 ? [Math.max(1, Math.round(days)), "day"]
    : days < 730 ? [Math.round(days / 30.4), "month"]
    : [Math.round((days / 365) * 10) / 10, "year"];
  try {
    return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long", maximumFractionDigits: 1 }).format(value);
  } catch {
    return `${value} ${unit}${value === 1 ? "" : "s"}`;
  }
}

/** The first run shows what three months of reading adds up to. */
export const PROJECTION_MONTHS = 3;
const DAYS_PER_MONTH = 30;
/** The versions are 50, 100 and 200 pages; a book is counted as the middle one. */
export const BOOK_PAGES = 100;

export interface Projection {
  /** Where they start and where `PROJECTION_MONTHS` of reading `minutes` a day would leave them. */
  from: LevelState;
  to: LevelState;
  /** Minutes spent reading, pages read, and books' worth of pages. */
  minutes: number;
  pages: number;
  books: number;
}

/** What `PROJECTION_MONTHS` months of `minutes` a day would add up to for a reader at `level`: the same arithmetic as the dashboard. */
export function projectMonths(level: Cefr | null | undefined, minutes: number): Projection {
  const days = PROJECTION_MONTHS * DAYS_PER_MONTH;
  const start = startingXp(level ?? "A1");
  const total = minutes > 0 ? minutes * days : 0;
  const pages = Math.round(total * PAGES_PER_MINUTE);
  return { from: levelFromXp(start), to: levelFromXp(start + days * xpPerDay(minutes)), minutes: total, pages, books: Math.floor(pages / BOOK_PAGES) };
}
