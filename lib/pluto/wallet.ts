import { storageKey } from "@/lib/brand";
import { readRaw, subscribeTo, writeRaw } from "@/lib/store/local";
import { mergeBoard } from "@/lib/social/model";
import { myXpIn, paceOf, periodBounds, periodKey, rivalsFor, type Period } from "@/lib/social/rivals";
import { CEFR, levelFromXp } from "@/lib/xp/levels";
import { EARN, ITEMS, PLAIN, itemById, prizeFor, type Item, type Look, type Slot } from "./shop";

/**
 * Pluto's coins and wardrobe, on the device (owner, 4 Oct 2026). Coins come from XP (one per `EARN.xpPerCoin`), from each
 * new stage and level, and from where the reader finished on last week's and last month's boards. One wallet for every
 * language: each language's XP is counted once, as it is earned. Spent on what Pluto wears (lib/pluto/shop.ts).
 */
export const WALLET_KEY = storageKey("wallet");
export const subscribeWallet = subscribeTo(WALLET_KEY);

export interface Wallet {
  /** Coins made from XP and level-ups so far. */
  minted: number;
  /** For each language, the XP already turned into coins, and the stage index already paid for. */
  xp: Record<string, number>;
  stage: Record<string, number>;
  /** Board prizes, by period ("week:2026-W40", "month:2026-10"): the coins won there, and the place. */
  prizes: Record<string, { coins: number; rank: number }>;
  spent: number;
  owned: string[];
  look: Look;
}
export const EMPTY_WALLET: Wallet = { minted: 0, xp: {}, stage: {}, prizes: {}, spent: 0, owned: ["cyan"], look: PLAIN };

const nat = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const rec = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, n] of Object.entries(v)) out[k] = nat(n);
  return out;
};

export function parseWallet(raw: string | null | undefined): Wallet {
  if (!raw) return EMPTY_WALLET;
  try {
    const v = JSON.parse(raw) as Partial<Wallet>;
    const prizes: Wallet["prizes"] = {};
    if (v.prizes && typeof v.prizes === "object") for (const [k, p] of Object.entries(v.prizes)) prizes[k] = { coins: nat(p?.coins), rank: nat(p?.rank) };
    const owned = Array.isArray(v.owned) ? [...new Set(["cyan", ...v.owned.filter((id): id is string => typeof id === "string" && !!itemById(id))])] : ["cyan"];
    const l = (v.look ?? {}) as Partial<Look>;
    const pick = (slot: Slot, id: unknown): string | null => (typeof id === "string" && owned.includes(id) && itemById(id)?.slot === slot ? id : null);
    const look: Look = { colour: pick("colour", l.colour) ?? "cyan", head: pick("head", l.head), face: pick("face", l.face), pet: pick("pet", l.pet) };
    return { minted: nat(v.minted), xp: rec(v.xp), stage: rec(v.stage), prizes, spent: nat(v.spent), owned, look };
  } catch { return EMPTY_WALLET; }
}

export const balance = (w: Wallet): number => Math.max(0, w.minted + Object.values(w.prizes).reduce((a, p) => a + p.coins, 0) - w.spent);

/** Where a reader is on the ladder, as a count of stages (A1.1 = 0, A1.2 = 1 …) and of levels. */
export function stageIndex(xp: number): { stage: number; level: number } {
  const s = levelFromXp(xp);
  const level = CEFR.indexOf(s.level);
  return { stage: level * 3 + ((s.stage ?? 1) - 1), level };
}

/** Coins for what has been earned since the last look: XP (and level-ups) in `lang`. The first look at a language pays for its XP so far, not for the level it started at. */
export function mintFromXp(w: Wallet, lang: string, earned: number, total: number): { wallet: Wallet; coins: number } {
  const seen = w.xp[lang] ?? 0;
  const base = Math.max(0, Math.min(seen, earned));
  const coinsXp = Math.floor((earned - base) / EARN.xpPerCoin);
  const nowStage = stageIndex(total);
  const known = lang in w.stage;
  const lastStage = known ? w.stage[lang] : nowStage.stage;
  let coinsLevel = 0;
  for (let s = lastStage + 1; s <= nowStage.stage; s++) coinsLevel += s % 3 === 0 ? EARN.level : EARN.stage;
  const coins = coinsXp + coinsLevel;
  if (coins === 0 && known && earned >= seen) return { wallet: w, coins: 0 };
  return {
    wallet: { ...w, minted: w.minted + coins, xp: { ...w.xp, [lang]: base + coinsXp * EARN.xpPerCoin }, stage: { ...w.stage, [lang]: Math.max(lastStage, nowStage.stage) } },
    coins,
  };
}

/** The board's finished periods to pay for: the last four weeks and the last two months, in the device's time. */
export function finishedPeriods(now: Date): { kind: Period; key: string; end: Date }[] {
  const out: { kind: Period; key: string; end: Date }[] = [];
  let at = periodBounds("week", now).start;
  for (let i = 0; i < 4; i++) {
    const last = new Date(at.getTime() - 60_000);
    out.push({ kind: "week", key: `week:${periodKey("week", last)}`, end: last });
    at = periodBounds("week", last).start;
  }
  at = periodBounds("month", now).start;
  for (let i = 0; i < 2; i++) {
    const last = new Date(at.getTime() - 60_000);
    out.push({ kind: "month", key: `month:${periodKey("month", last)}`, end: last });
    at = periodBounds("month", last).start;
  }
  return out;
}

/** Where the reader finished a period: their XP in it against the practice readers of that period (the board they saw). Null if they did not read then. */
export function finishOf(kind: Period, end: Date, days: Record<string, { xp: number }>, seed: string, level: string): number | null {
  const mine = myXpIn(kind, days, end);
  if (mine <= 0) return null;
  const rivals = rivalsFor({ kind, now: end, seed, count: 20, pace: paceOf(days, end), level });
  const board = mergeBoard([{ rank: 1, code: "", name: "", level, xp: mine, me: true, username: "" }], rivals, 20);
  return board.find((r) => r.me)?.rank ?? null;
}

/** Pays the board prizes not yet paid. Returns the new wallet and what was won, newest first. */
export function payPrizes(w: Wallet, now: Date, days: Record<string, { xp: number }>, seed: string, level: string): { wallet: Wallet; won: { key: string; kind: Period; rank: number; coins: number }[] } {
  const won: { key: string; kind: Period; rank: number; coins: number }[] = [];
  const prizes = { ...w.prizes };
  for (const p of finishedPeriods(now)) {
    if (p.key in prizes) continue;
    const rank = finishOf(p.kind, p.end, days, seed, level);
    if (rank === null) continue;
    const coins = prizeFor(p.kind, rank);
    prizes[p.key] = { coins, rank };
    won.push({ key: p.key, kind: p.kind, rank, coins });
  }
  return { wallet: won.length ? { ...w, prizes } : w, won };
}

export type BuyResult = "bought" | "owned" | "poor" | "unknown";
export function buy(w: Wallet, id: string): { wallet: Wallet; result: BuyResult } {
  const item = itemById(id);
  if (!item) return { wallet: w, result: "unknown" };
  if (w.owned.includes(id)) return { wallet: w, result: "owned" };
  if (balance(w) < item.price) return { wallet: w, result: "poor" };
  return { wallet: { ...w, spent: w.spent + item.price, owned: [...w.owned, id], look: wear(w.look, item) }, result: "bought" };
}

const wear = (look: Look, item: Item): Look => ({ ...look, [item.slot]: item.id });

/** Puts on something owned, or takes a slot off (null; the colour goes back to cyan). */
export function equip(w: Wallet, slot: Slot, id: string | null): Wallet {
  if (id && (!w.owned.includes(id) || itemById(id)?.slot !== slot)) return w;
  return { ...w, look: { ...w.look, [slot]: id ?? (slot === "colour" ? "cyan" : null) } };
}

export const readWallet = (): Wallet => parseWallet(readRaw(WALLET_KEY));
export const saveWallet = (w: Wallet): boolean => writeRaw(WALLET_KEY, JSON.stringify(w));
export { ITEMS };
