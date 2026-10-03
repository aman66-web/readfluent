import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import { gatedLevelsFor, heldXp, pendingExam } from "./exam";
import { CEFR, startingXp, xpForCard, xpForFinish, xpForPage, xpForTestAnswer, xpForTestFinish, levelFromXp, XP, type Cefr } from "./levels";

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
  /** Pages that paid that day (the day's reading, for the daily targets). */
  pages: number;
  /** Flashcards answered right that day, and the XP they paid. */
  cards?: number;
  cardXp?: number;
  /** Test questions answered right that day, tests finished, and the XP they paid. */
  tests?: number;
  testsDone?: number;
  testXp?: number;
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
  /** The levels whose exam must be passed to reach them, for the language being learned (lib/xp/exam.ts); absent until it is set. */
  gates?: Cefr[];
  /** The levels whose exam has been passed. */
  exams?: Cefr[];
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
      days[d] = { sec: count(s.sec), xp: count(s.xp), books, pages: count(s.pages), cards: count(s.cards), cardXp: count(s.cardXp), tests: count(s.tests), testsDone: count(s.testsDone), testXp: count(s.testXp) };
    }
  }
  return {
    base: count(v.base),
    earned: count(v.earned),
    pages,
    done: Array.isArray(v.done) ? [...new Set(v.done.filter((x): x is string => typeof x === "string"))] : [],
    days,
    lastSlug: typeof v.lastSlug === "string" ? v.lastSlug : null,
    ...(Array.isArray(v.gates) ? { gates: cefrList(v.gates) } : {}),
    ...(Array.isArray(v.exams) ? { exams: cefrList(v.exams) } : {}),
  };
}

const cefrList = (xs: unknown[]): Cefr[] => [...new Set(xs.filter((x): x is Cefr => typeof x === "string" && (CEFR as readonly string[]).includes(x)))];

/** Everything the reader has earned, whether or not an exam is holding it back. */
export const rawXp = (l: Ledger): number => l.base + l.earned;

/** Where the reader stands: base plus everything earned, held at the top of their level while the exam for the next is still to pass. */
export const totalXp = (l: Ledger): number => heldXp({ base: l.base, raw: rawXp(l), gates: l.gates, exams: l.exams });

/** The level whose exam the reader has the XP for and has not passed; null if none. */
export const examDue = (l: Ledger): Cefr | null => pendingExam({ base: l.base, raw: rawXp(l), gates: l.gates, exams: l.exams });

/** The local calendar day, YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const EMPTY_DAY: DayStat = { sec: 0, xp: 0, books: {}, pages: 0 };
export const dayOf = (l: Ledger, day: string): DayStat => l.days[day] ?? EMPTY_DAY;

/* ── pure changes: each returns the next ledger and what it paid ─────────── */

export interface Paid { ledger: Ledger; xp: number; reason: "page" | "finish" | "card" | "test" | "none" }

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
    days: { ...l.days, [day]: { ...daily, xp: daily.xp + xp, pages: daily.pages + 1 } },
  };
  return { ledger: next, xp, reason: "page" };
}

/** The last page of a version has been reached: pay the finish once. */
export function payFinish(l: Ledger, version: string, pages: number, day: string): Paid {
  if (l.done.includes(version) || pages <= 0) return { ledger: l, xp: 0, reason: "none" };
  // Reaching the last slide is not finishing: most of the pages must have been read.
  if ((l.pages[version]?.length ?? 0) < Math.ceil(pages * XP.finishShare)) return { ledger: l, xp: 0, reason: "none" };
  const xp = xpForFinish(pages);
  const daily = dayOf(l, day);
  return {
    ledger: { ...l, earned: l.earned + xp, done: [...l.done, version], days: { ...l.days, [day]: { ...daily, xp: daily.xp + xp } } },
    xp,
    reason: "finish",
  };
}

/** A flashcard has been answered: pay it if it was right ("good" or "easy"), up to the day's limit. */
export function payCard(l: Ledger, grade: "again" | "good" | "easy", day: string): Paid {
  const daily = dayOf(l, day);
  const xp = Math.max(0, Math.min(xpForCard(grade), XP.dayCap.card - (daily.cardXp ?? 0)));
  if (grade === "again") return { ledger: l, xp: 0, reason: "none" };
  const next: Ledger = { ...l, earned: l.earned + xp, days: { ...l.days, [day]: { ...daily, xp: daily.xp + xp, cards: (daily.cards ?? 0) + 1, cardXp: (daily.cardXp ?? 0) + xp } } };
  return { ledger: next, xp, reason: xp > 0 ? "card" : "none" };
}

/** A test question has been answered right: pay it, up to the day's limit. A wrong answer is never passed here. */
export function payTestAnswer(l: Ledger, testLevel: Cefr, day: string): Paid {
  const daily = dayOf(l, day);
  const xp = Math.max(0, Math.min(xpForTestAnswer(testLevel, levelFromXp(totalXp(l)).level), XP.dayCap.test - (daily.testXp ?? 0)));
  const next: Ledger = { ...l, earned: l.earned + xp, days: { ...l.days, [day]: { ...daily, xp: daily.xp + xp, tests: (daily.tests ?? 0) + 1, testXp: (daily.testXp ?? 0) + xp } } };
  return { ledger: next, xp, reason: xp > 0 ? "test" : "none" };
}

/** A test has been finished: the pass bonus, if it was passed, up to the day's limit. */
export function payTestFinish(l: Ledger, testLevel: Cefr, correct: number, total: number, day: string): Paid {
  const daily = dayOf(l, day);
  const xp = Math.max(0, Math.min(xpForTestFinish(testLevel, levelFromXp(totalXp(l)).level, correct, total), XP.dayCap.test - (daily.testXp ?? 0)));
  const next: Ledger = { ...l, earned: l.earned + xp, days: { ...l.days, [day]: { ...daily, xp: daily.xp + xp, testsDone: (daily.testsDone ?? 0) + 1, testXp: (daily.testXp ?? 0) + xp } } };
  return { ledger: next, xp, reason: xp > 0 ? "test" : "none" };
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

/** Everything the reader has, as a number: where their level comes from. */
export const currentXp = (): number => totalXp(read());

/**
 * The reader changes the language they are learning: the XP and level they earned in the old one are kept under that
 * language, and the new one's are brought back (or start from nothing: a new language is a new A1 until they say otherwise).
 * Nothing is moved when the old ledger is empty, so choosing a language twice while signing up loses nothing.
 */
export function switchLanguageLedger(from: string | null | undefined, to: string | null | undefined): void {
  if (!from || !to || from === to) return;
  const now = read();
  const used = now.earned > 0 || Object.keys(now.days).length > 0 || now.done.length > 0 || Object.keys(now.pages).length > 0;
  const stash = `${LEDGER_KEY}.${from}`;
  if (used) writeRaw(stash, JSON.stringify(now));
  const back = readRaw(`${LEDGER_KEY}.${to}`);
  if (back) write(parseLedger(back));
  else if (used) write({ ...EMPTY_LEDGER, gates: gatedLevelsFor(to) });
}

/** Sets where a reader starts: their level's floor. Only when nothing has been earned, so it can never lower XP. */
export function startAt(level: Cefr | null | undefined): void {
  const l = read();
  if (l.earned > 0) return;
  const base = startingXp(level);
  if (l.base !== base) write({ ...l, base });
}

/** Sets which levels need an exam, from the language being learned. Does nothing if it is already so. */
export function setGates(lang: string | null | undefined): void {
  const l = read();
  const gates = gatedLevelsFor(lang);
  if (l.gates && l.gates.length === gates.length && l.gates.every((g, i) => g === gates[i])) return;
  write({ ...l, gates });
}

/** A level's exam has been passed: the level opens (and the XP held back counts) from now on. */
export function passExam(level: Cefr): void {
  const l = read();
  if (l.exams?.includes(level)) return;
  write({ ...l, exams: [...(l.exams ?? []), level] });
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

/** Pays a flashcard answer; returns what it paid (0 for a wrong one). */
export function awardCard(grade: "again" | "good" | "easy"): number {
  const paid = payCard(read(), grade, localDay());
  if (paid.reason !== "none") write(paid.ledger);
  return paid.xp;
}

/** Pays one test question answered right. */
export function awardTestAnswer(testLevel: Cefr): number {
  const paid = payTestAnswer(read(), testLevel, localDay());
  if (paid.reason !== "none") write(paid.ledger);
  return paid.xp;
}

/** Pays the bonus for finishing a test, and counts it. */
export function awardTestFinish(testLevel: Cefr, correct: number, total: number): number {
  const paid = payTestFinish(read(), testLevel, correct, total, localDay());
  write(paid.ledger);
  return paid.xp;
}

export function trackSeconds(slug: string, sec: number): void {
  const next = addSeconds(read(), slug, sec, localDay());
  write(next);
}
