import { describe, expect, it } from "vitest";
import { daysLeftInMonth, parseFriends, parseLeague, profilePayload, recentXpDays, tierOf, zoneOf } from "@/lib/social/model";
import { EMPTY_LEDGER, type Ledger } from "@/lib/xp/ledger";
import { parseSocial } from "@/lib/social/cache";

const day = (xp: number) => ({ sec: 60, xp, books: {}, pages: 1 });

describe("the league table", () => {
  it("marks the top five to move up and the bottom five to move down, in a table big enough for both", () => {
    expect(zoneOf(1, 30)).toBe("up");
    expect(zoneOf(5, 30)).toBe("up");
    expect(zoneOf(6, 30)).toBeNull();
    expect(zoneOf(26, 30)).toBe("down");
    expect(zoneOf(25, 30)).toBeNull();
    expect(zoneOf(1, 8)).toBeNull();
    expect(zoneOf(8, 8)).toBeNull();
  });
  it("keeps a tier in range", () => {
    expect([tierOf(-3), tierOf(2), tierOf(9), tierOf(NaN)]).toEqual([0, 2, 4, 0]);
  });
  it("counts the days left in the month, today included", () => {
    expect(daysLeftInMonth(new Date("2026-10-30T10:00:00Z"))).toBe(2);
    expect(daysLeftInMonth(new Date("2026-10-31T23:00:00Z"))).toBe(1);
    expect(daysLeftInMonth(new Date("2026-10-01T00:00:00Z"))).toBe(31);
  });
});

describe("what the server sends back", () => {
  it("tidies friends and drops what is not a row", () => {
    const rows = parseFriends([{ friendship_id: "a", friend_code: "ABCD2345", relation: "incoming", display_name: "Sam", level_code: "A2.1", streak: 3, xp_week: 10, xp_month: 40 }, null, { nope: 1 }]);
    expect(rows).toEqual([{ id: "a", code: "ABCD2345", relation: "incoming", name: "Sam", level: "A2.1", streak: 3, xpWeek: 10, xpMonth: 40, username: "" }]);
    expect(parseFriends("x")).toEqual([]);
  });
  it("reads a league, and an empty answer is no league", () => {
    const l = parseLeague([
      { rank: 1, friend_code: "AAAA2222", display_name: "Ana", level_code: "B1.1", xp: 90, is_me: false, tier: 2, period: "2026-10", size: 2 },
      { rank: 2, friend_code: "BBBB3333", display_name: "Me", level_code: "A1.2", xp: 20, is_me: true, tier: 2, period: "2026-10", size: 2 },
    ]);
    expect(l?.tier).toBe(2);
    expect(l?.rows.map((r) => r.me)).toEqual([false, true]);
    expect(parseLeague([])).toBeNull();
  });
});

describe("what the device reports", () => {
  const now = new Date("2026-10-02T12:00:00");
  const ledger: Ledger = { ...EMPTY_LEDGER, base: 100, earned: 50, days: { "2026-10-02": day(30), "2026-10-01": day(0), "2026-07-01": day(99), "2026-09-30": day(20) } };
  it("sends recent days with XP, oldest first", () => {
    expect(recentXpDays(ledger, now)).toEqual([{ day: "2026-09-30", xp: 20 }, { day: "2026-10-02", xp: 30 }]);
  });
  it("sends the total, the stage code and the streak", () => {
    const p = profilePayload(ledger, "Sam", now);
    expect(p.p_name).toBe("Sam");
    expect(p.p_xp).toBe(150);
    expect(p.p_level).toMatch(/^[A-C][1-2](\.[1-3])?$/);
    expect(p.p_streak).toBe(3);
  });
});

describe("the social cache", () => {
  it("keeps a good code and sync time and drops bad ones", () => {
    expect(parseSocial(JSON.stringify({ friends: 2, friendCode: "ABCD2345", syncedAt: 5 }))).toEqual({ friends: 2, friendCode: "ABCD2345", syncedAt: 5 });
    expect(parseSocial(JSON.stringify({ friends: -1, friendCode: "bad", syncedAt: "x" }))).toEqual({ friends: 0, friendCode: "", syncedAt: 0 });
  });
});
