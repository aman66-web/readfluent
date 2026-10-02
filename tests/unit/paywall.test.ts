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
