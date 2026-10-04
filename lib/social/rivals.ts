/**
 * The practice readers of the weekly and monthly boards (owner, 4 Oct 2026: boards that feel alive, a new race every week
 * and every month). Until a league has filled up with real readers, the board is topped up with practice readers: each
 * has a name, a username, a level near the reader's and a pace of their own, reads on some days and not others, and earns
 * through the day, so the race moves while the reader reads. They are made on the device, the same for the same reader,
 * period and moment, and different every week and every month. They are marked on the board as practice readers
 * (league.practiceNote): never presented as people.
 *
 * Pure: the clock and the reader's own pace are passed in.
 */
import { CEFR } from "@/lib/xp/levels";

export type Period = "week" | "month";

export interface Rival { id: string; name: string; username: string; level: string; xp: number; hue: number }

const FIRST = [
  "Lena", "Kenji", "Amira", "Tomasz", "Sofia", "Mateo", "Aisha", "Lucas", "Yuki", "Priya", "Jonas", "Chloé", "Diego", "Mei", "Omar",
  "Hannah", "Rafael", "Ingrid", "Arjun", "Elif", "Noah", "Zara", "Pablo", "Ana", "Felix", "Leila", "Marco", "Sara", "Daniel", "Nadia",
  "Hugo", "Ines", "Ravi", "Emma", "Kofi", "Julia", "Mikael", "Fatima", "Theo", "Lucía", "Hiro", "Maya", "Viktor", "Clara", "Samir",
  "Olivia", "Andrei", "Noor", "Luca", "Alice", "Tariq", "Greta", "Jin", "Bea", "Ömer", "Rosa", "Erik", "Lina", "Tomás", "Isla",
  "Yusuf", "Marta", "Kai", "Elena", "Sven", "Aditi", "Leo", "Camila", "Hamza", "Nina", "Oscar", "Ayşe", "Ben", "Valentina", "Seo-yeon",
  "Matteo", "Freya", "Ali", "Lotte", "Ibrahim", "Paula", "Ethan", "Mira", "Joon", "Bianca", "Karim", "Eva", "Rohan", "Alba", "Nils",
];
const LAST = "ABCDEFGHJKLMNOPRSTVWZ";
const SUFFIX = ["reads", "learns", "lingo", "words", "books", "pages"];

/** A small, fast, seeded generator (mulberry32) and a string hash to seed it. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const DAY = 86_400_000;
const midnight = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Where a period starts and ends, in the device's own time: a week runs Monday to Sunday, a month from the 1st. */
export function periodBounds(kind: Period, now: Date): { start: Date; end: Date } {
  if (kind === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  const today = midnight(now);
  const back = (today.getDay() + 6) % 7; // Monday = 0
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
  return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
}

/** The period's name: "2026-W40" (ISO week) or "2026-10". */
export function periodKey(kind: Period, now: Date): string {
  if (kind === "month") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / DAY + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Whole days left in the period, counting today (1 on its last day). */
export const daysLeft = (kind: Period, now: Date): number => Math.max(1, Math.round((periodBounds(kind, now).end.getTime() - midnight(now).getTime()) / DAY));

/** How much of a day's reading is done by this time: little in the early morning, most by the evening. */
const dayShare = (now: Date): number => Math.min(1, Math.max(0, (now.getHours() + now.getMinutes() / 60 - 7) / 15));

/** Level codes next to the reader's (A2.1 → A1.3, A2.1, A2.2 …), for practice readers to be near them. */
function nearLevels(level: string): string[] {
  const all = CEFR.flatMap((l) => [1, 2, 3].map((s) => `${l}.${s}`));
  const at = Math.max(0, all.indexOf(level));
  return all.slice(Math.max(0, at - 2), Math.min(all.length, at + 3));
}

/**
 * `count` practice readers for the period that `now` is in. `seed` is something of the reader's own (so two readers do not
 * meet the same ones), `pace` the XP the reader earns on a day they read (it sets how fast the practice readers go: from a
 * third of it to two and a half times it, so there is always somebody just ahead).
 */
export function rivalsFor(o: { kind: Period; now: Date; seed: string; count: number; pace: number; level: string }): Rival[] {
  const { kind, now, count } = o;
  if (count <= 0) return [];
  const key = periodKey(kind, now);
  const r = rng(hash(`${o.seed}|${key}`));
  const pace = Math.min(400, Math.max(30, Math.round(o.pace || 60)));
  const levels = nearLevels(o.level);
  const { start } = periodBounds(kind, now);
  const today = midnight(now);
  const days = Math.round((today.getTime() - start.getTime()) / DAY); // whole days before today
  const share = dayShare(now);
  const names = new Set<string>();
  const out: Rival[] = [];
  for (let i = 0; i < count; i++) {
    let first = FIRST[Math.floor(r() * FIRST.length)];
    for (let k = 0; k < 6 && names.has(first); k++) first = FIRST[Math.floor(r() * FIRST.length)];
    names.add(first);
    const initial = LAST[Math.floor(r() * LAST.length)];
    const plain = first.normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "") || "reader";
    const style = Math.floor(r() * 4);
    const username = style === 0 ? `${plain}.${initial.toLowerCase()}` : style === 1 ? `${plain}_${SUFFIX[Math.floor(r() * SUFFIX.length)]}` : style === 2 ? `${plain}${10 + Math.floor(r() * 89)}` : `${plain}.${SUFFIX[Math.floor(r() * SUFFIX.length)]}`;
    // A spread of paces, fastest first, each nudged so no two boards look alike.
    const place = count === 1 ? 0.5 : i / (count - 1);
    const speed = (0.33 + 2.2 * Math.pow(1 - place, 1.4)) * (0.85 + r() * 0.3);
    const keen = 0.45 + r() * 0.5; // how many days they read
    const personal = hash(`${o.seed}|${key}|${i}`);
    let xp = 0;
    for (let d = 0; d <= days; d++) {
      const dr = rng(personal + d * 7919);
      if (dr() > keen) continue;
      const amount = pace * speed * (0.55 + dr() * 0.9);
      xp += d === days ? amount * share : amount;
    }
    out.push({ id: `rival-${key}-${i}`, name: `${first} ${initial}.`, username, level: levels[Math.floor(r() * levels.length)] ?? o.level, xp: Math.round(xp / 2) * 2, hue: Math.floor(r() * 360) });
  }
  return out;
}

/** The XP a reader earns on a day they read, from their own last weeks (days with nothing are left out); a starting pace for a new reader. */
export function paceOf(days: Record<string, { xp: number }>, now: Date): number {
  const from = midnight(now).getTime() - 21 * DAY;
  const xs = Object.entries(days).filter(([d, s]) => s.xp > 0 && new Date(`${d}T12:00:00`).getTime() >= from).map(([, s]) => s.xp);
  if (!xs.length) return 60;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

/** The reader's own XP in the period, from the device's ledger days. */
export function myXpIn(kind: Period, days: Record<string, { xp: number }>, now: Date): number {
  const { start, end } = periodBounds(kind, now);
  let xp = 0;
  for (const [d, s] of Object.entries(days)) {
    const t = new Date(`${d}T12:00:00`).getTime();
    if (t >= start.getTime() && t < end.getTime()) xp += s.xp;
  }
  return xp;
}
