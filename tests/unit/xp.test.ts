import { describe, expect, it } from "vitest";
import { BAND_OF, CEFR, LEVEL_FLOOR, XP, levelFromXp, startingXp, xpForFinish, xpForPage } from "@/lib/xp/levels";
import { EMPTY_LEDGER, addSeconds, localDay, parseLedger, payFinish, payPage, series, streak, totalXp, type Ledger } from "@/lib/xp/ledger";

describe("levels from XP", () => {
  it("climb A1 to C2 and never skip or go backwards", () => {
    let last = -1;
    for (let xp = 0; xp < 140_000; xp += 250) {
      const i = CEFR.indexOf(levelFromXp(xp).level);
      expect(i).toBeGreaterThanOrEqual(last);
      expect(i - last).toBeLessThanOrEqual(1);
      last = i;
    }
    expect(last).toBe(5);
  });

  it("put the thresholds where they are written", () => {
    expect(levelFromXp(0).level).toBe("A1");
    expect(levelFromXp(4_999).level).toBe("A1");
    expect(levelFromXp(5_000).level).toBe("A2");
    expect(levelFromXp(LEVEL_FLOOR.C2).level).toBe("C2");
  });

  it("say how far along and how far to go", () => {
    const s = levelFromXp(5_000 + 2_500);
    expect(s).toMatchObject({ level: "A2", next: "B1", into: 2_500, span: 10_000, toGo: 7_500 });
    expect(s.fraction).toBeCloseTo(0.25);
  });

  it("have a top: C2 has nothing to go and a full bar", () => {
    const s = levelFromXp(200_000);
    expect(s).toMatchObject({ level: "C2", next: null, toGo: 0, fraction: 1 });
  });

  it("start a placed reader at the floor of their level, and an unplaced one at A1", () => {
    expect(startingXp("B2")).toBe(35_000);
    expect(levelFromXp(startingXp("C1")).level).toBe("C1");
    expect(startingXp(null)).toBe(0);
  });

  it("survive nonsense", () => {
    for (const bad of [NaN, -5, Infinity, 1.9]) expect(() => levelFromXp(bad)).not.toThrow();
    expect(levelFromXp(-5).level).toBe("A1");
  });

  it("pay full for a page at your band or above, half for a band below", () => {
    expect(xpForPage("A1A2", "A1")).toBe(XP.page);
    expect(xpForPage("B1B2", "A2")).toBe(XP.page);
    expect(xpForPage("A1A2", "B1")).toBe(XP.pageBelow);
    expect(xpForPage("B1B2", "C1")).toBe(XP.pageBelow);
    expect(xpForPage("C1C2", "C2")).toBe(XP.page);
    expect(BAND_OF.B2).toBe("B1B2");
    expect(xpForFinish(50)).toBe(100);
  });
});

const D1 = "2026-10-01";
const D2 = "2026-10-02";

describe("the ledger", () => {
  it("pays a page once, however often it is reread", () => {
    const a = payPage(EMPTY_LEDGER, "pp/a1a2-50", 1, "A1A2", D1);
    expect(a.xp).toBe(XP.page + XP.firstOfDay);
    const again = payPage(a.ledger, "pp/a1a2-50", 1, "A1A2", D1);
    expect(again.xp).toBe(0);
    expect(totalXp(again.ledger)).toBe(totalXp(a.ledger));
  });

  it("pays the day's first-read bonus once a day", () => {
    let l: Ledger = EMPTY_LEDGER;
    l = payPage(l, "v", 1, "A1A2", D1).ledger;
    const second = payPage(l, "v", 2, "A1A2", D1);
    expect(second.xp).toBe(XP.page);
    const nextDay = payPage(second.ledger, "v", 3, "A1A2", D2);
    expect(nextDay.xp).toBe(XP.page + XP.firstOfDay);
  });

  it("pays easier books less once the reader has moved up", () => {
    const placed: Ledger = { ...EMPTY_LEDGER, base: startingXp("B1"), days: { [D1]: { sec: 0, xp: 1, books: {} } } };
    expect(payPage(placed, "easy", 1, "A1A2", D1).xp).toBe(XP.pageBelow);
    expect(payPage(placed, "same", 1, "B1B2", D1).xp).toBe(XP.page);
  });

  it("pays a finish once", () => {
    const a = payFinish(EMPTY_LEDGER, "v", 50, D1);
    expect(a.xp).toBe(100);
    expect(payFinish(a.ledger, "v", 50, D1).xp).toBe(0);
  });

  it("can take a reader up a level, and the total includes where they started", () => {
    let l: Ledger = { ...EMPTY_LEDGER, base: 4_990, days: { [D1]: { sec: 0, xp: 1, books: {} } } };
    expect(levelFromXp(totalXp(l)).level).toBe("A1");
    l = payPage(l, "v", 1, "A1A2", D1).ledger;
    expect(levelFromXp(totalXp(l)).level).toBe("A2");
  });

  it("counts time per day and per book, and a streak from it", () => {
    const today = new Date(2026, 9, 3, 12);
    let l: Ledger = EMPTY_LEDGER;
    l = addSeconds(l, "pp", 120, "2026-10-01");
    l = addSeconds(l, "pp", 60, "2026-10-02");
    expect(streak(l, today)).toBe(2); // today not yet read: the run to yesterday stands
    l = addSeconds(l, "dracula", 30, "2026-10-03");
    expect(streak(l, today)).toBe(3);
    expect(l.days["2026-10-03"].books).toEqual({ dracula: 30 });
    expect(l.lastSlug).toBe("dracula");
    expect(streak(addSeconds(EMPTY_LEDGER, "pp", 60, "2026-09-20"), today)).toBe(0);
  });

  it("draws a series with a row for every day, empty ones included", () => {
    const l = addSeconds(EMPTY_LEDGER, "pp", 180, "2026-10-02");
    const s = series(l, "2026-10-01", "2026-10-03");
    expect(s.map((d) => d.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(s.map((d) => d.minutes)).toEqual([0, 3, 0]);
  });

  it("reads a corrupt ledger as an empty one, and keeps what is valid", () => {
    for (const bad of [null, "", "nope", "[]", "7", "null"]) expect(parseLedger(bad as string)).toEqual(EMPTY_LEDGER);
    const l = parseLedger(JSON.stringify({ base: 5000, earned: "x", pages: { v: [3, 1, 3, -2, "q"] }, days: { "2026-10-01": { sec: 60, xp: 5, books: { a: 60, b: -1 } }, nope: {} }, done: ["v", 3] }));
    expect(l.base).toBe(5000);
    expect(l.earned).toBe(0);
    expect(l.pages.v).toEqual([1, 3]);
    expect(l.days["2026-10-01"]).toEqual({ sec: 60, xp: 5, books: { a: 60 } });
    expect(Object.keys(l.days)).toHaveLength(1);
    expect(l.done).toEqual(["v"]);
  });

  it("names a local day as YYYY-MM-DD", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
