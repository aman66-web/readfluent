import { describe, expect, it } from "vitest";
import { ALWAYS_FREE, FREE_BOOKS, PAYMENTS_LIVE, PLANS, PRICE, canOpenBook, effectivePlan, parsePlan, pounds } from "@/lib/plan";

describe("what a plan opens", () => {
  it("never gates what the reader has already earned", () => {
    // The promise in lib/plan.ts, as a test: progress, word cards, flashcards,
    // sync and downloads are not capabilities a plan can hold back.
    for (const k of ["progress", "word-cards", "flashcards", "sync", "offline"]) {
      expect(ALWAYS_FREE).toContain(k);
    }
  });

  it("reads anything unrecognised as free", () => {
    for (const v of [undefined, null, "", "FULL", "pro", 1, true, {}, "free"]) {
      expect(parsePlan(v), String(v)).toBe("free");
    }
    expect(parsePlan("full")).toBe("full");
  });

  it("prices in pence, rendered in pounds", () => {
    expect(pounds(599)).toBe("£5.99");
    expect(pounds(3900)).toBe("£39.00");
    expect(pounds(0)).toBe("£0.00");
    expect(pounds(5)).toBe("£0.05");
  });

  it("makes the year cheaper than twelve months", () => {
    expect(PRICE.yearlyPence).toBeLessThan(PRICE.monthlyPence * 12);
  });

  it("has exactly two plans", () => {
    expect(PLANS).toEqual(["free", "full"]);
  });

  it("keeps the gates open until there is a till", () => {
    // Charging for a thing nobody can buy is a closed door, not a business.
    // M10 flips this once a sandbox purchase has travelled the whole way.
    expect(PAYMENTS_LIVE).toBe(false);
  });
});

describe("which books a reader may open", () => {
  it("lets a free reader begin two books", () => {
    expect(FREE_BOOKS).toBe(2);
  });

  it("opens everything while the gates are not live", () => {
    expect(canOpenBook("free", false, 5)).toBe(true);
  });

  it("applies the rule when they are live: free begins two books, full reads all", () => {
    expect(canOpenBook("free", false, 0, true)).toBe(true);
    expect(canOpenBook("free", false, 1, true)).toBe(true);
    expect(canOpenBook("free", false, 2, true)).toBe(false);
    expect(canOpenBook("free", false, 9, true)).toBe(false);
    expect(canOpenBook("full", false, 9, true)).toBe(true);
  });

  it("keeps a book already begun open, whatever the plan and the count", () => {
    expect(canOpenBook("free", true, 2, true)).toBe(true);
    expect(canOpenBook("free", true, 9, true)).toBe(true);
  });
});

describe("the plan a row is on right now", () => {
  const now = new Date("2026-09-24T15:00:00Z");

  it("is full with no end date, as a hand-set grant is", () => {
    expect(effectivePlan({ plan: "full", plan_until: null }, now)).toBe("full");
    expect(effectivePlan({ plan: "full" }, now)).toBe("full");
  });

  it("is full until the subscription's end, and free the moment it passes", () => {
    expect(effectivePlan({ plan: "full", plan_until: "2026-09-24T15:05:00Z" }, now)).toBe("full");
    expect(effectivePlan({ plan: "full", plan_until: "2026-09-24T15:00:00Z" }, now)).toBe("free");
    expect(effectivePlan({ plan: "full", plan_until: "2026-09-24T14:58:31Z" }, now)).toBe("free");
  });

  it("never opens on anything it cannot read", () => {
    expect(effectivePlan(null, now)).toBe("free");
    expect(effectivePlan(undefined, now)).toBe("free");
    expect(effectivePlan({ plan: "free", plan_until: "2099-01-01T00:00:00Z" }, now)).toBe("free");
    expect(effectivePlan({ plan: "FULL" }, now)).toBe("free");
    expect(effectivePlan({ plan: "full", plan_until: "not a date" }, now)).toBe("free");
  });
});
