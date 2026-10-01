import { describe, expect, it } from "vitest";
import { headerHoldsSecret, planUpdateFromEvent } from "@/lib/purchases/webhook";
import { PRO_ENTITLEMENT } from "@/lib/purchases/entitlement";

describe("checking the webhook's Authorization header", () => {
  it("accepts the bare secret", () => {
    expect(headerHoldsSecret("abc123", "abc123")).toBe(true);
  });

  it("accepts the secret with a Bearer prefix", () => {
    expect(headerHoldsSecret("Bearer abc123", "abc123")).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(headerHoldsSecret(null, "abc123")).toBe(false);
  });

  it("rejects the wrong secret, bare or Bearer-prefixed", () => {
    expect(headerHoldsSecret("wrong", "abc123")).toBe(false);
    expect(headerHoldsSecret("Bearer wrong", "abc123")).toBe(false);
  });
});

/**
 * The one piece of app/api/revenuecat/webhook/route.ts worth testing without
 * a live database: what an event means for plan/plan_until. The route itself
 * (secret check, the actual Supabase write) is exercised by a real sandbox
 * purchase — see README, "RevenueCat webhook".
 */
describe("what a RevenueCat event means for a learner's plan", () => {
  it("ignores an event with no entitlement_ids at all — a dashboard test event", () => {
    expect(planUpdateFromEvent({ type: "TEST" })).toBeNull();
  });

  it("ignores an event for some other entitlement", () => {
    expect(planUpdateFromEvent({ type: "INITIAL_PURCHASE", entitlement_ids: ["some_other_thing"] })).toBeNull();
  });

  it("opens the plan on a purchase, carrying the new expiration", () => {
    const update = planUpdateFromEvent({
      type: "INITIAL_PURCHASE",
      entitlement_ids: [PRO_ENTITLEMENT],
      expiration_at_ms: Date.parse("2027-01-01T00:00:00Z"),
    });
    expect(update).toEqual({ plan: "full", planUntil: "2027-01-01T00:00:00.000Z" , planProduct: null, planPeriod: null });
  });

  it("carries a null expiration through as null, rather than a bogus date", () => {
    const update = planUpdateFromEvent({
      type: "INITIAL_PURCHASE",
      entitlement_ids: [PRO_ENTITLEMENT],
      expiration_at_ms: null,
    });
    expect(update).toEqual({ plan: "full", planUntil: null , planProduct: null, planPeriod: null });
  });

  it("treats a renewal the same as a fresh purchase — just a later expiration", () => {
    const update = planUpdateFromEvent({
      type: "RENEWAL",
      entitlement_ids: [PRO_ENTITLEMENT],
      expiration_at_ms: Date.parse("2027-06-01T00:00:00Z"),
    });
    expect(update).toEqual({ plan: "full", planUntil: "2027-06-01T00:00:00.000Z" , planProduct: null, planPeriod: null });
  });

  it("writes an EXPIRATION's already-past date through as-is, rather than special-casing the type", () => {
    // effective_plan() (0006_plan.sql) is what actually turns this into "free"
    // once the date has passed — this function's job is only to relay it.
    const update = planUpdateFromEvent({
      type: "EXPIRATION",
      entitlement_ids: [PRO_ENTITLEMENT],
      expiration_at_ms: Date.parse("2020-01-01T00:00:00Z"),
    });
    expect(update).toEqual({ plan: "full", planUntil: "2020-01-01T00:00:00.000Z" , planProduct: null, planPeriod: null });
  });

  it("still opens the plan on a cancellation, since access runs to the same unchanged expiration", () => {
    const update = planUpdateFromEvent({
      type: "CANCELLATION",
      entitlement_ids: [PRO_ENTITLEMENT],
      expiration_at_ms: Date.parse("2027-01-01T00:00:00Z"),
    });
    expect(update).toEqual({ plan: "full", planUntil: "2027-01-01T00:00:00.000Z" , planProduct: null, planPeriod: null });
  });
});
