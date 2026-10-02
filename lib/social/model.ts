import { levelFromXp } from "@/lib/xp/levels";
import { streak, totalXp, type Ledger } from "@/lib/xp/ledger";

/** The leagues, lowest first. */
export const TIERS = ["bronze", "silver", "gold", "sapphire", "diamond"] as const;
export const tierOf = (n: number): number => Math.min(TIERS.length - 1, Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)));

/** How many finish a league's month moving up, and how many moving down (matches `my_league()`). */
export const PROMOTE = 5;
export const DEMOTE = 5;

export interface FriendRow {
  id: string;
  code: string;
  relation: "friend" | "incoming" | "outgoing";
  name: string;
  level: string;
  streak: number;
  xpWeek: number;
  xpMonth: number;
}
export interface LeagueRow { rank: number; code: string; name: string; level: string; xp: number; me: boolean }
export interface League { tier: number; period: string; size: number; rows: LeagueRow[] }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** The rows `my_friends()` returned, tidied; anything that is not a row is left out. */
export function parseFriends(data: unknown): FriendRow[] {
  if (!Array.isArray(data)) return [];
  const out: FriendRow[] = [];
  for (const r of data) {
    if (!isObject(r) || typeof r.friendship_id !== "string") continue;
    const relation = r.relation === "incoming" || r.relation === "outgoing" ? r.relation : "friend";
    out.push({ id: r.friendship_id, code: str(r.friend_code), relation, name: str(r.display_name), level: str(r.level_code), streak: num(r.streak), xpWeek: num(r.xp_week), xpMonth: num(r.xp_month) });
  }
  return out;
}

/** The rows `my_league()` returned, as a league (null when there are none). */
export function parseLeague(data: unknown): League | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const rows: LeagueRow[] = [];
  let tier = 0;
  let period = "";
  let size = 0;
  for (const r of data) {
    if (!isObject(r)) continue;
    tier = tierOf(num(r.tier));
    period = str(r.period);
    size = num(r.size);
    rows.push({ rank: num(r.rank), code: str(r.friend_code), name: str(r.display_name), level: str(r.level_code), xp: num(r.xp), me: r.is_me === true });
  }
  return rows.length ? { tier, period, size: size || rows.length, rows } : null;
}

/** Which end of the table a place is in: the ones who move up, the ones who move down, or neither. Nobody moves in a table too small for both. */
export function zoneOf(rank: number, size: number): "up" | "down" | null {
  if (size < PROMOTE + DEMOTE + 1) return null;
  if (rank <= PROMOTE) return "up";
  if (rank > size - DEMOTE) return "down";
  return null;
}

/** Whole days from `now` to the end of the (UTC) month, counting today; 1 on the last day. */
export function daysLeftInMonth(now: Date): number {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((end - now.getTime()) / 86_400_000));
}

/** The `p_days` the server adds a month up from: the last 62 days with any XP. */
export function recentXpDays(l: Ledger, now: Date): { day: string; xp: number }[] {
  const out: { day: string; xp: number }[] = [];
  const from = now.getTime() - 62 * 86_400_000;
  for (const [day, stat] of Object.entries(l.days)) {
    const t = new Date(`${day}T12:00:00`).getTime();
    if (stat.xp > 0 && t >= from) out.push({ day, xp: stat.xp });
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** What the device tells the server about the reader, for friends and the league to see. */
export function profilePayload(l: Ledger, name: string, now: Date) {
  return { p_name: name, p_level: levelFromXp(totalXp(l)).code, p_xp: totalXp(l), p_streak: streak(l, now), p_days: recentXpDays(l, now) };
}
