import { describe, expect, it } from "vitest";
import { CARDS_GOAL, WORDS_GOAL, dailyTargets, pagesGoal, progressOf } from "@/lib/targets";
import { parseSocial } from "@/lib/social/cache";

const empty = { sec: 0, xp: 0, books: {}, pages: 0 };

describe("today's targets", () => {
  it("size the pages from the daily goal, to the nearest five", () => {
    expect(pagesGoal(15)).toBe(45);
    expect(pagesGoal(10)).toBe(30);
    expect(pagesGoal(5)).toBe(15);
    expect(pagesGoal(1)).toBe(5);
    expect(pagesGoal(0)).toBe(5);
  });

  it("start with nothing done, and count what has been", () => {
    const base = { minutes: 15, day: empty, savedToday: 0, reviewedToday: 0, friend: "todo" as const };
    const none = dailyTargets(base);
    expect(none.map((t) => t.id)).toEqual(["pages", "flashcards", "xp", "words", "friend"]);
    expect(progressOf(none)).toEqual({ done: 0, total: 5 });
    const some = dailyTargets({ ...base, day: { ...empty, pages: 45, xp: 20 }, savedToday: WORDS_GOAL, reviewedToday: 3 });
    expect(some.find((t) => t.id === "pages")).toMatchObject({ current: 45, goal: 45, done: true });
    expect(some.find((t) => t.id === "words")?.done).toBe(true);
    expect(some.find((t) => t.id === "flashcards")).toMatchObject({ current: 3, goal: CARDS_GOAL, done: false });
    expect(progressOf(some).done).toBe(2);
  });

  it("never shows more than the goal, and leaves out the friend target where it makes no sense", () => {
    const t = dailyTargets({ minutes: 10, day: { ...empty, pages: 999 }, savedToday: 0, reviewedToday: 0, friend: "hidden" });
    expect(t.find((x) => x.id === "pages")?.current).toBe(30);
    expect(t.some((x) => x.id === "friend")).toBe(false);
    expect(dailyTargets({ minutes: 10, day: empty, savedToday: 0, reviewedToday: 0, friend: "done" }).find((x) => x.id === "friend")?.done).toBe(true);
  });
});

describe("what the device remembers of the social side", () => {
  it("reads a bad value as nothing", () => {
    expect(parseSocial(null)).toEqual({ friends: 0, friendCode: "", syncedAt: 0 });
    expect(parseSocial('{"friends":-3,"friendCode":"abc"}')).toEqual({ friends: 0, friendCode: "", syncedAt: 0 });
    expect(parseSocial('{"friends":2,"friendCode":"ABCD2345"}')).toEqual({ friends: 2, friendCode: "ABCD2345", syncedAt: 0 });
    expect(parseSocial("not json")).toEqual({ friends: 0, friendCode: "", syncedAt: 0 });
  });
});
