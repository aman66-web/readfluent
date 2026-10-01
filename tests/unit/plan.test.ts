import { describe, expect, it } from "vitest";
import { ALWAYS_FREE, FREE_LENGTHS, PAYMENTS_LIVE, PLANS, PRICE, canOpen, effectivePlan, parsePlan, pounds } from "@/lib/plan";

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

describe("which versions a reader may open", () => {
  it("opens the free samples to everyone: the 50-page versions", () => {
    expect(FREE_LENGTHS).toEqual([50]);
  });

  it("opens everything while the gates are not live", () => {
    for (const length of [50, 100, 200]) expect(canOpen(length, "free")).toBe(true);
  });

  it("applies the rule when they are live: free reads 50, full reads all", () => {
    expect(canOpen(50, "free", false, true)).toBe(true);
    expect(canOpen(100, "free", false, true)).toBe(false);
    expect(canOpen(200, "free", false, true)).toBe(false);
    expect(canOpen(100, "full", false, true)).toBe(true);
    expect(canOpen(200, "full", false, true)).toBe(true);
  });

  it("keeps a version already started open, whatever the plan", () => {
    expect(canOpen(200, "free", true, true)).toBe(true);
    expect(canOpen(100, "free", true, true)).toBe(true);
  });

  it("is not fooled by a length that is not one of the three", () => {
    expect(canOpen(75, "free", false, true)).toBe(false);
    expect(canOpen(0, "free", false, true)).toBe(false);
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
