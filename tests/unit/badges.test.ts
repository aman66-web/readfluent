import { describe, expect, it } from "vitest";
import { BADGES, newlyEarned, parseBadges, statsFrom, unseen, type Stats } from "@/lib/badges";
import { EMPTY_LEDGER } from "@/lib/xp/ledger";

const none: Stats = { pages: 0, streak: 0, finished: 0, words: 0, cards: 0, friends: 0 };

describe("achievements", () => {
  it("earns nothing at the start and each one when its number is reached", () => {
    expect(newlyEarned(none, {})).toEqual([]);
    expect(newlyEarned({ ...none, pages: 1 }, {})).toEqual(["firstPage"]);
    expect(newlyEarned({ ...none, pages: 100, streak: 7, words: 25 }, {})).toEqual(["firstPage", "streak3", "streak7", "pages100", "words25"]);
    expect(newlyEarned({ pages: 5000, streak: 99, finished: 2, words: 99, cards: 99, friends: 3 }, {}).length).toBe(BADGES.length);
  });
  it("does not offer one twice, and keeps one the streak has since lost", () => {
    expect(newlyEarned({ ...none, pages: 1 }, { firstPage: 5 })).toEqual([]);
    expect(newlyEarned(none, { streak7: 5 })).toEqual([]);
  });
  it("reads the device's numbers", () => {
    const l = { ...EMPTY_LEDGER, pages: { "a/A1A2-50": [0, 1, 2], "b/B1B2-50": [0] }, done: ["a/A1A2-50"] };
    const s = statsFrom(l, 7, 12, 1);
    expect(s).toMatchObject({ pages: 4, finished: 1, words: 7, cards: 12, friends: 1 });
  });
  it("reads a bad record as empty and lists what is new since the reader looked", () => {
    expect(parseBadges("nope")).toEqual({ earned: {}, seen: 0 });
    expect(parseBadges(JSON.stringify({ earned: { firstPage: 10, bogus: 5 }, seen: 1 })).earned).toEqual({ firstPage: 10 });
    expect(unseen({ earned: { firstPage: 10, streak3: 20 }, seen: 15 })).toEqual(["streak3"]);
    expect(unseen({ earned: { firstPage: 10, streak3: 20 }, seen: 0 })).toEqual(["streak3", "firstPage"]);
  });
});
