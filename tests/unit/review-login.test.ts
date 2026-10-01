import { describe, expect, it } from "vitest";
import { isReviewEmail, isReviewer, reviewEmails } from "@/lib/auth/review";

describe("the app-store reviewer's password sign-in", () => {
  it("reads a comma-separated list, trimmed and lower-cased", () => {
    expect(reviewEmails(" Review@Example.com , play@example.com,, ")).toEqual(["review@example.com", "play@example.com"]);
  });

  it("is off when nothing is configured", () => {
    expect(reviewEmails(undefined)).toEqual([]);
    expect(reviewEmails("")).toEqual([]);
    expect(isReviewEmail("anyone@example.com", [])).toBe(false);
  });

  it("matches only a listed address, whatever its case or spacing", () => {
    const list = reviewEmails("review@example.com");
    expect(isReviewEmail("  REVIEW@example.com ", list)).toBe(true);
    expect(isReviewEmail("review@example.co", list)).toBe(false);
    expect(isReviewEmail("", list)).toBe(false);
  });
});

describe("the reviewer's Pro", () => {
  const list = reviewEmails("review@example.com");

  it("is Pro when the listed address is confirmed", () => {
    expect(isReviewer({ email: "review@example.com", email_confirmed_at: "2026-09-25T08:00:00Z" }, list)).toBe(true);
  });

  it("is not Pro on an unconfirmed address, another address, or nobody", () => {
    expect(isReviewer({ email: "review@example.com", email_confirmed_at: null }, list)).toBe(false);
    expect(isReviewer({ email: "someone@example.com", email_confirmed_at: "2026-09-25T08:00:00Z" }, list)).toBe(false);
    expect(isReviewer({ email: null, email_confirmed_at: "2026-09-25T08:00:00Z" }, list)).toBe(false);
    expect(isReviewer(null, list)).toBe(false);
  });
});
