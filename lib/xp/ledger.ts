import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { startingXp, xpForFinish, xpForPage, levelFromXp, XP, type Cefr } from "./levels";

/**
 * The XP ledger, kept on the device (it becomes a `sync_docs` document in M8).
 *
 * `base` is where the reader started (their level's floor); `earned` is what reading
 * has added. A page is paid once per version however often it is reread, and only after
 * it has been on screen for a moment, so skimming past pages earns nothing. Time spent
 * reading is kept per day and per book for the dashboard's graph.
 *
 * Never throws on a bad value: a corrupt ledger reads as an empty one.
 */
export const LEDGER_KEY = storageKey("xp");

export interface DayStat {
  /** Seconds the reader was on a page. */
  sec: number;
  /** XP earned that day. */
  xp: number;
  /** Seconds per book. */
  books: Record<string, number>;
}

export interface Ledger {
  base: number;
  earned: number;
  /** Version → page numbers already paid. */
  pages: Record<string, number[]>;
  /** Versions finished and paid. */
  done: string[];
  /** Local day (YYYY-MM-DD) → what happened. */
  days: Record<string, DayStat>;
  /** The book opened last, for "carry on". */
  lastSlug: string | null;
}

export const EMPTY_LEDGER: Ledger = { base: 0, earned: 0, pages: {}, done: [], days: {}, lastSlug: null };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function parseLedger(raw: string | null | undefined): Ledger {
  if (!raw) return EMPTY_LEDGER;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return EMPTY_LEDGER; }
  if (!isObject(v)) return EMPTY_LEDGER;
  const pages: Record<string, number[]> = {};
  if (isObject(v.pages)) {
    for (const [k, list] of Object.entries(v.pages)) {
      if (Array.isArray(list)) pages[k] = [...new Set(list.filter((n): n is number => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
    }
  }
  const days: Record<string, DayStat> = {};
  if (isObject(v.days)) {
    for (const [d, s] of Object.entries(v.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !isObject(s)) continue;
      const books: Record<string, number> = {};
      if (isObject(s.books)) for (const [b, n] of Object.entries(s.books)) if (count(n)) books[b] = count(n);
      days[d] = { sec: count(s.sec), xp: count(s.xp), books };
    }
  }
  return {
    base: count(v.base),
    earned: count(v.earned),
    pages,
    done: Array.isArray(v.done) ? [...new Set(v.done.filter((x): x is string => typeof x === "string"))] : [],
    days,
    lastSlug: typeof v.lastSlug === "string" ? v.lastSlug : null,
  };
}

/** Where the reader stands: base plus everything earned. */
export const totalXp = (l: Ledger): number => l.base + l.earned;

/** The local calendar day, YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const dayOf = (l: Ledger, day: string): DayStat => l.days[day] ?? { sec: 0, xp: 0, books: {} };

/* ── pure changes: each returns the next ledger and what it paid ─────────── */

export interface Paid { ledger: Ledger; xp: number; reason: "page" | "finish" | "none" }

/** A page has been on screen long enough: pay it once, plus the day's first-read bonus. */
export function payPage(l: Ledger, version: string, page: number, band: string, day: string): Paid {
  const seen = l.pages[version] ?? [];
  if (!Number.isInteger(page) || page < 1 || seen.includes(page)) return { ledger: l, xp: 0, reason: "none" };
  const level = levelFromXp(totalXp(l)).level;
  const daily = dayOf(l, day);
  const bonus = daily.xp === 0 ? XP.firstOfDay : 0;
  const xp = xpForPage(band, level) + bonus;
  const next: Ledger = {
    ...l,
    earned: l.earned + xp,
    pages: { ...l.pages, [version]: [...seen, page].sort((a, b) => a - b) },
    days: { ...l.days, [day]: { ...daily, xp: daily.xp + xp } },
  };
  return { ledger: next, xp, reason: "page" };
}

/** The last page of a version has been reached: pay the finish once. */
export function payFinish(l: Ledger, version: string, pages: number, day: string): Paid {
  if (l.done.includes(version) || pages <= 0) return { ledger: l, xp: 0, reason: "none" };
  const xp = xpForFinish(pages);
  const daily = dayOf(l, day);
  return {
    ledger: { ...l, earned: l.earned + xp, done: [...l.done, version], days: { ...l.days, [day]: { ...daily, xp: daily.xp + xp } } },
    xp,
    reason: "finish",
  };
}

/** Time on a page, counted toward the day and the book. */
export function addSeconds(l: Ledger, slug: string, sec: number, day: string): Ledger {
  const add = count(sec);
  if (!add) return l;
  const daily = dayOf(l, day);
  return {
    ...l,
    lastSlug: slug,
    days: { ...l.days, [day]: { ...daily, sec: daily.sec + add, books: { ...daily.books, [slug]: (daily.books[slug] ?? 0) + add } } },
  };
}

/** Days in a row, up to today, with any time read. Today not yet read does not break a streak that ran to yesterday. */
export function streak(l: Ledger, today: Date = new Date()): number {
  const d = new Date(today);
  if (!dayOf(l, localDay(d)).sec) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dayOf(l, localDay(d)).sec > 0) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** One day's reading, for every day from `from` to `to` inclusive (YYYY-MM-DD), in order. */
export function series(l: Ledger, from: string, to: string): { date: string; minutes: number; xp: number }[] {
  const out: { date: string; minutes: number; xp: number }[] = [];
  const d = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  for (let i = 0; d <= end && i < 400; i++, d.setDate(d.getDate() + 1)) {
    const key = localDay(d);
    const s = dayOf(l, key);
    out.push({ date: key, minutes: Math.round(s.sec / 60), xp: s.xp });
  }
  return out;
}

/* ── the device's copy ────────────────────────────────────────────────────── */

const read = (): Ledger => parseLedger(readRaw(LEDGER_KEY));
const write = (l: Ledger) => writeRaw(LEDGER_KEY, JSON.stringify(l));

/** Sets where a reader starts: their level's floor. Only when nothing has been earned, so it can never lower XP. */
export function startAt(level: Cefr | null | undefined): void {
  const l = read();
  if (l.earned > 0) return;
  const base = startingXp(level);
  if (l.base !== base) write({ ...l, base });
}

/** Pays a page; returns what it paid, for a "+10 XP" to show. */
export function awardPage(version: string, page: number, band: string): number {
  const paid = payPage(read(), version, page, band, localDay());
  if (paid.reason !== "none") write(paid.ledger);
  return paid.xp;
}

export function awardFinish(version: string, pages: number): number {
  const paid = payFinish(read(), version, pages, localDay());
  if (paid.reason !== "none") write(paid.ledger);
  return paid.xp;
}

export function trackSeconds(slug: string, sec: number): void {
  const next = addSeconds(read(), slug, sec, localDay());
  write(next);
}
