/**
 * Level and XP, as pure rules (owner, 1 Oct 2026).
 *
 * A reader has one level for the language they are learning, A1 to C2, and XP that
 * moves them up it. The level comes from the XP and from nothing else; the first
 * level is set by what they said or by the placement test, which starts their XP at
 * that level's floor. Every number is here and nowhere else: change one and the
 * dashboard, the reader, the first run's "how long will it take" and the tests follow.
 *
 * The ladder is written in HOURS OF READING and turned into XP, so that what the first
 * run tells a new reader ("you could reach B2 in about N days") is the same arithmetic
 * the dashboard then keeps. The hours are deliberately honest rather than flattering:
 * moving up a level takes a language learner a long time, and an estimate that said
 * otherwise would be a promise the app could not keep.
 */

export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Cefr = (typeof CEFR)[number];

/** What reading earns. */
export const XP = {
  /** A page read at the reader's band or above. */
  page: 2,
  /** A page from a band below theirs: it still counts, at half. */
  pageBelow: 1,
  /** Finishing a version, per page it has. */
  finishPerPage: 1,
  /** The first page read each day. */
  firstOfDay: 10,
  /** How long a page must be on screen before it counts. */
  dwellMs: 2_500,
} as const;

/** How fast an ordinary reader gets through the app's pages: a page is 28–35 words and a picture, about twenty seconds. */
export const PAGES_PER_MINUTE = 3;

/** XP a reader earns in an hour of reading, finishing versions as they go. */
export const XP_PER_HOUR = PAGES_PER_MINUTE * 60 * (XP.page + XP.finishPerPage);

/** Hours of reading in the app to reach each level from the start, in total. */
export const LEVEL_HOURS: Readonly<Record<Cefr, number>> = { A1: 0, A2: 40, B1: 100, B2: 180, C1: 300, C2: 480 };

const roundTo500 = (n: number) => Math.round(n / 500) * 500;

/** XP at which each level begins. */
export const LEVEL_FLOOR: Readonly<Record<Cefr, number>> = {
  A1: 0,
  A2: roundTo500(LEVEL_HOURS.A2 * XP_PER_HOUR),
  B1: roundTo500(LEVEL_HOURS.B1 * XP_PER_HOUR),
  B2: roundTo500(LEVEL_HOURS.B2 * XP_PER_HOUR),
  C1: roundTo500(LEVEL_HOURS.C1 * XP_PER_HOUR),
  C2: roundTo500(LEVEL_HOURS.C2 * XP_PER_HOUR),
};

/** The three bands the books are written in (SPEC.md §2). Two levels share one. */
export const BAND_OF: Readonly<Record<Cefr, "A1A2" | "B1B2" | "C1C2">> = {
  A1: "A1A2", A2: "A1A2", B1: "B1B2", B2: "B1B2", C1: "C1C2", C2: "C1C2",
};
export type Band = (typeof BAND_OF)[Cefr];
const BAND_INDEX: Readonly<Record<string, number>> = { A1A2: 0, B1B2: 1, C1C2: 2 };

export const isCefr = (v: unknown): v is Cefr => (CEFR as readonly unknown[]).includes(v);

/** XP a reader earns in a day of `minutes` minutes of reading: the first-page bonus and then the pages. */
export const xpPerDay = (minutes: number): number =>
  minutes > 0 ? XP.firstOfDay + Math.round(minutes * PAGES_PER_MINUTE * (XP.page + XP.finishPerPage)) : 0;

export interface LevelState {
  xp: number;
  level: Cefr;
  next: Cefr | null;
  /** XP into this level, and the size of it; both 0 at the top. */
  into: number;
  span: number;
  /** XP still needed for the next level; 0 at the top. */
  toGo: number;
  /** 0–1 along this level; 1 at the top. */
  fraction: number;
}

const safe = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function levelFromXp(xpIn: number): LevelState {
  const xp = safe(xpIn);
  let at = 0;
  for (let i = 0; i < CEFR.length; i++) if (xp >= LEVEL_FLOOR[CEFR[i]]) at = i;
  const level = CEFR[at];
  const next = CEFR[at + 1] ?? null;
  if (!next) return { xp, level, next: null, into: 0, span: 0, toGo: 0, fraction: 1 };
  const floor = LEVEL_FLOOR[level];
  const span = LEVEL_FLOOR[next] - floor;
  const into = xp - floor;
  return { xp, level, next, into, span, toGo: span - into, fraction: into / span };
}

/** The XP a reader starts with when they begin at a level: the floor of it. */
export const startingXp = (level: Cefr | null | undefined): number => (level ? LEVEL_FLOOR[level] : 0);

/** XP for one page of a version in `band`, for a reader at `level`. */
export function xpForPage(band: string, level: Cefr): number {
  return (BAND_INDEX[band] ?? 0) >= BAND_INDEX[BAND_OF[level]] ? XP.page : XP.pageBelow;
}

/** XP for finishing a version that has `pages` pages. */
export const xpForFinish = (pages: number): number => XP.finishPerPage * safe(pages);
