import { describe, expect, it } from "vitest";
import { mergeBoard, usernameProblem, type LeagueRow } from "@/lib/social/model";
import { daysLeft, myXpIn, paceOf, periodBounds, periodKey, rivalsFor } from "@/lib/social/rivals";

const at = (iso: string) => new Date(iso);
const base = { seed: "KP7QM2XA", count: 19, pace: 80, level: "A2.2" };

describe("practice readers", () => {
  it("are the same for the same reader and moment, and new every week and every month", () => {
    const now = at("2026-10-07T18:00:00");
    const a = rivalsFor({ ...base, kind: "week", now });
    expect(rivalsFor({ ...base, kind: "week", now })).toEqual(a);
    const nextWeek = rivalsFor({ ...base, kind: "week", now: at("2026-10-14T18:00:00") });
    expect(nextWeek.map((r) => r.name)).not.toEqual(a.map((r) => r.name));
    const month = rivalsFor({ ...base, kind: "month", now });
    const nextMonth = rivalsFor({ ...base, kind: "month", now: at("2026-11-07T18:00:00") });
    expect(nextMonth.map((r) => r.username)).not.toEqual(month.map((r) => r.username));
    expect(rivalsFor({ ...base, seed: "OTHER123", kind: "week", now }).map((r) => r.name)).not.toEqual(a.map((r) => r.name));
  });

  it("look like readers: a name, a username, a level near the reader's, and XP that grows through the week", () => {
    const monday = rivalsFor({ ...base, kind: "week", now: at("2026-10-05T08:00:00") });
    const sunday = rivalsFor({ ...base, kind: "week", now: at("2026-10-11T21:00:00") });
    expect(new Set(sunday.map((r) => r.name)).size).toBe(sunday.length);
    for (const r of sunday) {
      expect(r.name).toMatch(/^\S.* [A-Z]\.$/u);
      expect(r.username).toMatch(/^[a-z0-9][a-z0-9_.]{2,19}$/);
      expect(r.level).toMatch(/^(A1\.3|A2\.[123]|B1\.1)$/);
      expect(r.xp % 2).toBe(0);
    }
    const total = (xs: { xp: number }[]) => xs.reduce((a, r) => a + r.xp, 0);
    expect(total(sunday)).toBeGreaterThan(total(monday) * 4);
    // a spread: someone fast, someone slow
    const xs = sunday.map((r) => r.xp).sort((x, y) => y - x);
    expect(xs[0]).toBeGreaterThan(xs[xs.length - 1] * 3);
  });

  it("go at the reader's pace, so the race is always close", () => {
    const now = at("2026-10-11T21:00:00");
    const slow = rivalsFor({ ...base, pace: 40, kind: "week", now });
    const fast = rivalsFor({ ...base, pace: 300, kind: "week", now });
    const median = (xs: { xp: number }[]) => xs.map((r) => r.xp).sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    expect(median(fast)).toBeGreaterThan(median(slow) * 4);
  });

  it("are none when there is no room", () => {
    expect(rivalsFor({ ...base, count: 0, kind: "week", now: new Date() })).toEqual([]);
  });
});

describe("periods", () => {
  it("a week runs Monday to Sunday, a month from the 1st, each with its name", () => {
    const sun = at("2026-10-04T10:00:00");
    expect(periodBounds("week", sun).start.getDay()).toBe(1);
    expect(periodBounds("week", sun).start.getDate()).toBe(28);
    expect(periodKey("week", sun)).toBe("2026-W40");
    expect(periodKey("week", at("2026-10-05T10:00:00"))).toBe("2026-W41");
    expect(periodKey("month", sun)).toBe("2026-10");
    expect(daysLeft("week", sun)).toBe(1);
    expect(daysLeft("week", at("2026-10-05T10:00:00"))).toBe(7);
    expect(daysLeft("month", at("2026-10-30T10:00:00"))).toBe(2);
  });
  it("the reader's own XP in a period, and their pace on days they read", () => {
    const days = { "2026-10-01": { xp: 100 }, "2026-10-03": { xp: 40 }, "2026-09-27": { xp: 999 }, "2026-10-02": { xp: 0 } };
    const now = at("2026-10-04T10:00:00");
    expect(myXpIn("week", days, now)).toBe(140);
    expect(myXpIn("month", days, now)).toBe(140);
    expect(paceOf(days, now)).toBe(Math.round((100 + 40 + 999) / 3));
    expect(paceOf({}, now)).toBe(60);
  });
});

describe("a board", () => {
  const me: LeagueRow = { rank: 1, code: "AAAA2222", name: "Sam", level: "A2.1", xp: 300, me: true, username: "sam" };
  const real: LeagueRow[] = [me, { rank: 2, code: "BBBB3333", name: "Ana", level: "A2.2", xp: 500, me: false, username: "ana.reads" }];
  const rivals = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, name: `R${i} X.`, username: `r${i}x`, level: "A2.1", xp: 1000 - i * 50, hue: i }));
  it("tops the league up to the size with practice readers, ranked by XP", () => {
    const b = mergeBoard(real, rivals, 20);
    expect(b).toHaveLength(20);
    expect(b.filter((r) => r.rival)).toHaveLength(18);
    expect(b.map((r) => r.xp)).toEqual([...b.map((r) => r.xp)].sort((x, y) => y - x));
    expect(b.find((r) => r.me)?.username).toBe("sam");
  });
  it("needs no practice readers once the league is full", () => {
    const full = Array.from({ length: 25 }, (_, i) => ({ ...me, me: i === 0, code: `C${i}`, xp: i }));
    expect(mergeBoard(full, rivals, 20).some((r) => r.rival)).toBe(false);
  });
  it("puts the reader above a practice reader on the same XP, and shares a rank on a tie", () => {
    const b = mergeBoard([{ ...me, xp: 900 }], [{ id: "x", name: "X Y.", username: "xy", level: "A2.1", xp: 900, hue: 1 }], 20);
    expect(b[0].me).toBe(true);
    expect(b[0].rank).toBe(1);
    expect(b[1].rank).toBe(1);
  });
});

describe("usernames", () => {
  it("are 3 to 20 of a-z, 0-9, _ and ., and never look like a friend code", () => {
    for (const ok of ["maria", "maria.reads", "ben_42", "@Lena.K"]) expect(usernameProblem(ok), ok).toBeNull();
    for (const bad of ["ma", "maria lopez", "_maria", "maria..x", "maria.", "kp7qm2xa", "a".repeat(21), "héllo"]) expect(usernameProblem(bad), bad).toBe("invalid");
  });
});
