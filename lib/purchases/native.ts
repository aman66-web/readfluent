"use client";

import { Capacitor } from "@capacitor/core";
import { INTRO_ELIGIBILITY_STATUS, Purchases, PURCHASES_ERROR_CODE } from "@revenuecat/purchases-capacitor";
import type { CustomerInfo, PurchasesError, PurchasesOffering, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { isNative } from "@/lib/auth/native";
import { PRO_ENTITLEMENT } from "./entitlement";

/**
 * RevenueCat, wrapping StoreKit 2 (iOS) and Play Billing (Android).
 *
 * Every key is read out in full (`NEXT_PUBLIC_…`) rather than built from a
 * variable, so Next inlines it at build time — the same reasoning as
 * components/Account.tsx's provider flags.
 */
export { PRO_ENTITLEMENT };

function apiKey(): string | undefined {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;
  if (platform === "android") return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  return undefined;
}

/** True once there is both a native shell to sell inside and a key to sell with. */
export function purchasesAvailable(): boolean {
  return isNative() && Boolean(apiKey());
}

let configured = false;

/**
 * Configure once per app launch, with the learner's Supabase user id as
 * RevenueCat's own app user id.
 *
 * That id exists before anybody "signs in" for real — proxy.ts signs every
 * new device in anonymously — so it is already the same id
 * `public.users.plan` is keyed by (0006_plan.sql: "the SAME uuid"). Using it
 * here too means the webhook can write a purchase straight onto that row by
 * id, with no separate mapping table between RevenueCat and Supabase to keep
 * in sync or get wrong.
 *
 * Safe to call again after the id changes (a sign-out that lands on a
 * different account) — it switches identity with `logIn` instead of
 * reconfiguring, which RevenueCat's SDK does not support and does not need.
 */
export async function configurePurchases(userId: string): Promise<void> {
  if (!purchasesAvailable()) return;
  const key = apiKey();
  if (!key) return;

  if (!configured) {
    await Purchases.configure({ apiKey: key, appUserID: userId });
    configured = true;
    return;
  }
  await identifyPurchaser(userId);
}

/** Switches the already-configured SDK to a different app user id. A no-op before `configurePurchases` has run. */
export async function identifyPurchaser(userId: string): Promise<void> {
  if (!configured) return;
  try {
    const { appUserID: current } = await Purchases.getAppUserID();
    if (current === userId) return;
  } catch {
    // Couldn't read the current id — try to log in anyway rather than get stuck.
  }
  await Purchases.logIn({ appUserID: userId });
}

/** The dashboard's current offering, or null if purchases aren't set up here yet. */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!purchasesAvailable()) return null;
  try {
    const { current } = await Purchases.getOfferings();
    return current;
  } catch {
    return null;
  }
}

/**
 * Whether this Apple ID can still have each product's free trial (it is one
 * per subscription group, ever). true or false on iOS; null on Android and
 * wherever the store could not say — see lib/purchases/trial.ts.
 */
export async function trialEligibility(productIds: string[]): Promise<Record<string, boolean | null>> {
  const out: Record<string, boolean | null> = Object.fromEntries(productIds.map((id) => [id, null]));
  if (!purchasesAvailable() || Capacitor.getPlatform() !== "ios" || productIds.length === 0) return out;
  try {
    const map = await Purchases.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: productIds });
    for (const id of productIds) out[id] = map[id]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
  } catch {
    for (const id of productIds) out[id] = false;
  }
  return out;
}

export type PurchaseOutcome =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; cancelled: boolean; message: string };

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return { ok: true, customerInfo };
  } catch (e) {
    const err = e as PurchasesError;
    return {
      ok: false,
      cancelled: err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
      message: err?.message ?? "",
    };
  }
}

export type RestoreOutcome =
  | { ok: true; customerInfo: CustomerInfo }
  | { ok: false; message: string };

export async function restorePurchases(): Promise<RestoreOutcome> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return { ok: true, customerInfo };
  } catch (e) {
    return { ok: false, message: (e as PurchasesError)?.message ?? "" };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch {
    return null;
  }
}

/** Whether this customer currently holds the Pro entitlement — the one thing a paywall actually needs to know. */
export function hasProEntitlement(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[PRO_ENTITLEMENT]);
}
