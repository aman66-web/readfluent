import { describe, expect, it, vi } from "vitest";

/**
 * Only the pure part of lib/purchases/native.ts: what counts as holding Pro,
 * given a CustomerInfo. Everything else in that file is a thin wrapper around
 * the RevenueCat SDK, exercised for real by a sandbox purchase — see README,
 * "RevenueCat webhook".
 */
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
vi.mock("@revenuecat/purchases-capacitor", () => ({
  Purchases: {},
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: "1" },
}));

describe("whether a customer holds the Pro entitlement", () => {
  it("is false with no customer info", async () => {
    const { hasProEntitlement } = await import("@/lib/purchases/native");
    expect(hasProEntitlement(null)).toBe(false);
  });

  it("is false when the entitlement exists but is not active", async () => {
    const { hasProEntitlement, PRO_ENTITLEMENT } = await import("@/lib/purchases/native");
    const info = { entitlements: { active: {}, all: { [PRO_ENTITLEMENT]: {} } } };
    expect(hasProEntitlement(info as never)).toBe(false);
  });

  it("is true when the entitlement is active", async () => {
    const { hasProEntitlement, PRO_ENTITLEMENT } = await import("@/lib/purchases/native");
    const info = { entitlements: { active: { [PRO_ENTITLEMENT]: {} }, all: {} } };
    expect(hasProEntitlement(info as never)).toBe(true);
  });

  it("is never available outside the native shell, whatever the key", async () => {
    const { purchasesAvailable } = await import("@/lib/purchases/native");
    process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY = "appl_test";
    expect(purchasesAvailable()).toBe(false);
  });
});
