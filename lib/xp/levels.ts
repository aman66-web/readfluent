/**
 * Level and XP, as pure rules (owner, 1 Oct 2026).
 *
 * A reader has one level for the language they are learning, A1 to C2, and XP that
 * moves them up it. The level comes from the XP and from nothing else; the first
 * level is set by what they said or by the placement test, which starts their XP at
 * that level's floor. Every number is here and nowhere else: change one and the
 * dashboard, the reader and the tests follow.
 *
 * The ladder is steep on purpose. A1 to A2 is 5,000 XP, about five hundred pages,
 * a few hours of reading; each level after it costs more, and C2 is the top.
 */

export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Cefr = (typeof CEFR)[number];

/** XP at which each level begins. */
export const LEVEL_FLOOR: Readonly<Record<Cefr, number>> = {
  A1: 0, A2: 5_000, B1: 15_000, B2: 35_000, C1: 70_000, C2: 130_000,
};

/** The three bands the books are written in (SPEC.md §2). Two levels share one. */
export const BAND_OF: Readonly<Record<Cefr, "A1A2" | "B1B2" | "C1C2">> = {
  A1: "A1A2", A2: "A1A2", B1: "B1B2", B2: "B1B2", C1: "C1C2", C2: "C1C2",
};
export type Band = (typeof BAND_OF)[Cefr];
const BAND_INDEX: Readonly<Record<string, number>> = { A1A2: 0, B1B2: 1, C1C2: 2 };

export const isCefr = (v: unknown): v is Cefr => (CEFR as readonly unknown[]).includes(v);

/** What reading earns. */
export const XP = {
  /** A page read at the reader's band or above. */
  page: 10,
  /** A page from a band below theirs: it still counts, at half. */
  pageBelow: 5,
  /** Finishing a version, per page it has. */
  finishPerPage: 2,
  /** The first page read each day. */
  firstOfDay: 50,
  /** How long a page must be on screen before it counts. */
  dwellMs: 2_500,
} as const;

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
