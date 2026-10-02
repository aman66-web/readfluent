import { describe, expect, it } from "vitest";
import { currentMoment, pageOfMoment, windOf } from "@/components/book/Pathway";

describe("the book's path", () => {
  it("maps each moment to a page of the chosen length", () => {
    expect(pageOfMoment(0, 50, 50)).toBe(0);
    expect(pageOfMoment(49, 50, 50)).toBe(49);
    expect(pageOfMoment(10, 50, 100)).toBe(20);
    expect(pageOfMoment(11, 12, 50)).toBeLessThanOrEqual(49);
  });
  it("is at the last moment whose page has been reached", () => {
    expect(currentMoment(undefined, 50, 50)).toBeNull();
    expect(currentMoment(0, 50, 50)).toBe(0);
    expect(currentMoment(13, 50, 50)).toBe(13);
    expect(currentMoment(30, 50, 100)).toBe(15);
  });
  it("winds left and right and starts on the left", () => {
    expect(windOf(0)).toBeLessThan(0);
    expect(Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map(windOf))).toBeGreaterThan(0);
  });
});
