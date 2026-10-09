import { cleanName, isOffensive } from "./clean";
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
  /** Their username, without the @ (empty until they choose one). */
  username: string;
}
export interface LeagueRow { rank: number; code: string; name: string; level: string; xp: number; me: boolean; username: string }
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
    out.push({ id: r.friendship_id, code: str(r.friend_code), relation, name: cleanName(str(r.display_name)), level: str(r.level_code), streak: num(r.streak), xpWeek: num(r.xp_week), xpMonth: num(r.xp_month), username: cleanName(str(r.username)) });
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
    rows.push({ rank: num(r.rank), code: str(r.friend_code), name: cleanName(str(r.display_name)), level: str(r.level_code), xp: num(r.xp), me: r.is_me === true, username: cleanName(str(r.username)) });
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

/** A username as a reader may choose it: 3 to 20 of a-z, 0-9, _ and . (lower case, no leading _ or ., no ".." or trailing .), and not shaped like a friend code. Mirrors set_username() in 0007. */
export function usernameProblem(raw: string): "invalid" | null {
  const name = raw.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9_.]{2,19}$/.test(name) || /\.\./.test(name) || /\.$/.test(name)) return "invalid";
  if (/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(name.toUpperCase())) return "invalid";
  if (isOffensive(name)) return "invalid";
  return null;
}

/** One row of a weekly or monthly board, real or practice. */
export interface BoardRow { key: string; rank: number; name: string; username: string; level: string; xp: number; me: boolean; rival: boolean; code: string; hue: number }

/**
 * A board: the real readers of the league (or, before signing in, just the reader) topped up with practice readers to `size`,
 * ranked by XP. Ties keep real readers above practice readers and the reader above both, so a tie never reads as a loss.
 */
export function mergeBoard(real: readonly LeagueRow[], rivals: readonly { id: string; name: string; username: string; level: string; xp: number; hue: number }[], size: number): BoardRow[] {
  const people: BoardRow[] = real.map((r, i) => ({ key: `real-${r.code || i}`, rank: 0, name: r.name, username: r.username, level: r.level, xp: r.xp, me: r.me, rival: false, code: r.code, hue: hueOf(r.username || r.name || r.code) }));
  const room = Math.max(0, size - people.length);
  const bots: BoardRow[] = rivals.slice(0, room).map((r) => ({ key: r.id, rank: 0, name: r.name, username: r.username, level: r.level, xp: r.xp, me: false, rival: true, code: "", hue: r.hue }));
  const all = [...people, ...bots].sort((a, b) => b.xp - a.xp || Number(b.me) - Number(a.me) || Number(a.rival) - Number(b.rival) || a.name.localeCompare(b.name));
  let rank = 0;
  return all.map((r, i) => { if (i === 0 || r.xp !== all[i - 1].xp) rank = i + 1; return { ...r, rank }; });
}

/** A steady colour for a name's avatar. */
export function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
