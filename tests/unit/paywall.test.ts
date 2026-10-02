import { describe, expect, it } from "vitest";
import { savingPercent } from "@/components/paywall/Paywall";
import { PRICE } from "@/lib/plan";

describe("the paywall's saving", () => {
  it("is what a year saves against twelve months", () => {
    expect(savingPercent(500, 3000)).toBe(50);
    expect(savingPercent(PRICE.monthlyPence, PRICE.yearlyPence)).toBeGreaterThan(0);
  });
  it("is never negative or invented", () => {
    expect(savingPercent(100, 5000)).toBe(0);
    expect(savingPercent(0, 3000)).toBe(0);
  });
});

import { PREVIEW_BOOKS, shortBlurb } from "@/lib/preview/catalog";

describe("the blurb under a cover", () => {
  it("is cut at a whole word and ends in an ellipsis", () => {
    const long = "Follow a bored girl and a very late White Rabbit down a hole, into a world where cakes make you grow.";
    const s = shortBlurb(long);
    expect(s.endsWith("…")).toBe(true);
    expect(s.length).toBeLessThanOrEqual(65);
    expect(long.startsWith(s.slice(0, -1))).toBe(true);
  });
  it("leaves a short one alone, and shortens every book's", () => {
    expect(shortBlurb("A short line.")).toBe("A short line.");
    for (const b of PREVIEW_BOOKS) expect(shortBlurb(b.blurb).length).toBeLessThanOrEqual(65);
  });
});
