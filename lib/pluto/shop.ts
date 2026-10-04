/**
 * What Pluto can wear (owner, 4 Oct 2026: "levelling up gives coins, from XP and the leaderboards, to customise what Pluto
 * looks like, add a pet and more"). Prices are in coins and live here and nowhere else. The pictures are 3D renders
 * (scripts/mascot/wardrobe.mjs); colours are a tint of Pluto's suit.
 */
export type Slot = "colour" | "head" | "face" | "pet";

export interface Item { id: string; slot: Slot; price: number }

export const ITEMS: readonly Item[] = [
  { id: "cyan", slot: "colour", price: 0 },
  { id: "mint", slot: "colour", price: 120 },
  { id: "violet", slot: "colour", price: 150 },
  { id: "rose", slot: "colour", price: 150 },
  { id: "gold", slot: "colour", price: 300 },
  { id: "galaxy", slot: "colour", price: 600 },
  { id: "party", slot: "head", price: 200 },
  { id: "beanie", slot: "head", price: 250 },
  { id: "headphones", slot: "head", price: 300 },
  { id: "wizard", slot: "head", price: 400 },
  { id: "crown", slot: "head", price: 600 },
  { id: "shades", slot: "face", price: 250 },
  { id: "moon", slot: "pet", price: 500 },
  { id: "comet", slot: "pet", price: 600 },
  { id: "robodog", slot: "pet", price: 800 },
  { id: "ufo", slot: "pet", price: 900 },
];

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);

/** How each colour tints the suit (a CSS filter on Pluto's own layers; hats and pets keep their colours). */
export const COLOUR_FILTER: Record<string, string> = {
  cyan: "none",
  mint: "hue-rotate(-38deg) saturate(1.05)",
  violet: "hue-rotate(72deg) saturate(1.1)",
  rose: "hue-rotate(140deg) saturate(1.15)",
  gold: "hue-rotate(-150deg) saturate(1.5) brightness(1.04)",
  galaxy: "none",
};

/** What Pluto is wearing. */
export interface Look { colour: string; head: string | null; face: string | null; pet: string | null }
export const PLAIN: Look = { colour: "cyan", head: null, face: null, pet: null };

/** How coins are earned. */
export const EARN = {
  /** XP that makes one coin. */
  xpPerCoin: 10,
  /** Each new stage (A1.1 → A1.2) and each new level (A1 → A2). */
  stage: 40,
  level: 150,
  /** A finished week or month on the board, by place (1st, 2nd, 3rd, top 5, top 10, anyone who read that period). */
  week: [250, 180, 140, 100, 60, 25],
  month: [800, 600, 450, 300, 180, 60],
} as const;

/** The prize for a place on a finished board. */
export function prizeFor(kind: "week" | "month", rank: number): number {
  const t = EARN[kind];
  return rank <= 1 ? t[0] : rank === 2 ? t[1] : rank === 3 ? t[2] : rank <= 5 ? t[3] : rank <= 10 ? t[4] : t[5];
}
