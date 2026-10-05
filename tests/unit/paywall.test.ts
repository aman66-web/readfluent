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

import { ALWAYS_FREE, FREE_BOOKS, canOpenBook } from "@/lib/plan";
import { compareRows, freeBookCount, money, proReadsEveryBook, savingOf, type PlanRow } from "@/lib/purchases/offer";
import { offerTrial, trialDays } from "@/lib/purchases/trial";

const plan = (kind: PlanRow["kind"], amount: number, currency = "GBP", trial: number | null = 7): PlanRow => ({ id: kind, kind, price: "", amount, currency, trial, pkg: null });

describe("the Free and Pro table is the plan's rules, not a list written by hand", () => {
  it("says free readers may begin as many books as canOpenBook lets them, once payments are live", () => {
    expect(freeBookCount()).toBe(FREE_BOOKS);
    expect(canOpenBook("free", false, freeBookCount() - 1, true)).toBe(true);
    expect(canOpenBook("free", false, freeBookCount(), true)).toBe(false);
    const books = compareRows().find((r) => r.id === "books")!;
    expect(books.freeLimit).toBe(FREE_BOOKS);
    expect(books.pro).toBe(true);
    expect(proReadsEveryBook()).toBe(true);
  });
  it("has no row for something a free reader already has, so nothing is claimed as Pro-only that is not locked", () => {
    // Full-length editions are not locked: a free reader opens the books they begin in full. Only the count of books is.
    expect(compareRows().map((r) => r.id)).toEqual(["books", "keep"]);
  });
  it("keeps the promise that progress, word cards and flashcards are free for both", () => {
    const keep = compareRows().find((r) => r.id === "keep")!;
    expect(ALWAYS_FREE.length).toBeGreaterThan(0);
    expect(keep.free && keep.pro).toBe(true);
    expect(keep.freeLimit).toBeNull();
  });
});

describe("the plans come from the store's own prices", () => {
  it("works the saving out from the two plans, in one currency", () => {
    expect(savingOf([plan("annual", 39.99), plan("monthly", 5.99)])).toBe(44);
    expect(savingOf([plan("annual", 4500, "JPY"), plan("monthly", 600, "JPY")])).toBe(38);
  });
  it("gives no saving without both plans, or across two currencies", () => {
    expect(savingOf([plan("annual", 39.99)])).toBe(0);
    expect(savingOf([plan("annual", 39.99, "GBP"), plan("monthly", 5.99, "EUR")])).toBe(0);
    expect(savingOf(null)).toBe(0);
  });
  it("formats the per-week and per-month sums in the store's currency and the reader's language", () => {
    expect(money(39.99 / 52, "GBP", "en")).toBe("£0.77");
    expect(money(39.99 / 12, "GBP", "en")).toBe("£3.33");
    expect(money(7500 / 52, "JPY", "en")).toBe("¥144");
    expect(money(44.99 / 12, "EUR", "de")).toMatch(/3,75\s€/);
    expect(money(1, "NOT-A-CURRENCY", "en")).toBeNull();
  });
});

describe("the trial", () => {
  it("is read from the store's introductory offer, and only when it is free", () => {
    expect(trialDays({ price: 0, periodUnit: "WEEK", periodNumberOfUnits: 1, cycles: 1 })).toBe(7);
    expect(trialDays({ price: 0, periodUnit: "DAY", periodNumberOfUnits: 3, cycles: 1 })).toBe(3);
    expect(trialDays({ price: 0.99, periodUnit: "WEEK", periodNumberOfUnits: 1, cycles: 1 })).toBeNull();
    expect(trialDays(null)).toBeNull();
  });
  it("is not promised to somebody the store says has had it", () => {
    expect(offerTrial(7, true)).toBe(true);
    expect(offerTrial(7, null)).toBe(true);
    expect(offerTrial(7, false)).toBe(false);
    expect(offerTrial(null, true)).toBe(false);
  });
});
