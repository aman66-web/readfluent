import { storageKey } from "@/lib/brand";
import { readRaw, writeRaw } from "@/lib/store/local";
import type { Ledger } from "@/lib/xp/ledger";
import { streak } from "@/lib/xp/ledger";

/**
 * Achievements: small things worth a moment, earned once and kept. What was reached is remembered on the
 * device, so a streak that ends does not take its badge back (nothing a reader has earned ever goes: lib/plan.ts).
 */
export const BADGES_KEY = storageKey("badges");

export interface Stats {
  pages: number;
  streak: number;
  finished: number;
  words: number;
  cards: number;
  friends: number;
}

export const BADGES = [
  { id: "firstPage", earned: (s: Stats) => s.pages >= 1 },
  { id: "streak3", earned: (s: Stats) => s.streak >= 3 },
  { id: "streak7", earned: (s: Stats) => s.streak >= 7 },
  { id: "streak30", earned: (s: Stats) => s.streak >= 30 },
  { id: "pages100", earned: (s: Stats) => s.pages >= 100 },
  { id: "pages1000", earned: (s: Stats) => s.pages >= 1000 },
  { id: "finished", earned: (s: Stats) => s.finished >= 1 },
  { id: "words25", earned: (s: Stats) => s.words >= 25 },
  { id: "cards50", earned: (s: Stats) => s.cards >= 50 },
  { id: "friend", earned: (s: Stats) => s.friends >= 1 },
] as const;
export type BadgeId = (typeof BADGES)[number]["id"];
export const BADGE_IDS: readonly string[] = BADGES.map((b) => b.id);

/** What the device knows, as the numbers the badges are measured against. */
export function statsFrom(l: Ledger, saved: number, cardsReviewed: number, friends: number, now: Date = new Date()): Stats {
  const pages = Object.values(l.pages).reduce((n, list) => n + list.length, 0);
  return { pages, streak: streak(l, now), finished: l.done.length, words: saved, cards: cardsReviewed, friends };
}

export interface BadgeState { earned: Record<string, number>; /** When the reader last looked at what they had earned. */ seen: number }
export const NO_BADGES: BadgeState = { earned: {}, seen: 0 };

export function parseBadges(raw: string | null | undefined): BadgeState {
  if (!raw) return NO_BADGES;
  try {
    const v = JSON.parse(raw) as { earned?: unknown; seen?: unknown } | null;
    const earned: Record<string, number> = {};
    if (v && typeof v.earned === "object" && v.earned !== null) {
      for (const [id, at] of Object.entries(v.earned)) if (BADGE_IDS.includes(id) && typeof at === "number" && Number.isFinite(at)) earned[id] = at;
    }
    return { earned, seen: typeof v?.seen === "number" && Number.isFinite(v.seen) ? v.seen : 0 };
  } catch {
    return NO_BADGES;
  }
}

/** The badges these numbers have reached that are not in `have` yet, in the list's order. */
export const newlyEarned = (stats: Stats, have: Record<string, number>): BadgeId[] => BADGES.filter((b) => !(b.id in have) && b.earned(stats)).map((b) => b.id);

/** Remembers any badge the numbers have now reached; returns the new ones. */
export function recordBadges(stats: Stats, now = Date.now()): BadgeId[] {
  const cur = parseBadges(readRaw(BADGES_KEY));
  const fresh = newlyEarned(stats, cur.earned);
  if (fresh.length === 0) return [];
  const earned = { ...cur.earned };
  for (const id of fresh) earned[id] = now;
  writeRaw(BADGES_KEY, JSON.stringify({ earned, seen: cur.seen }));
  return fresh;
}

/** The reader has looked: nothing earned so far is new any more. */
export function markBadgesSeen(now = Date.now()): void {
  const cur = parseBadges(readRaw(BADGES_KEY));
  writeRaw(BADGES_KEY, JSON.stringify({ earned: cur.earned, seen: now }));
}

/** The badges earned since the reader last looked, newest first. */
export const unseen = (s: BadgeState): BadgeId[] =>
  (Object.entries(s.earned) as [BadgeId, number][]).filter(([, at]) => at > s.seen).sort((a, b) => b[1] - a[1]).map(([id]) => id);
