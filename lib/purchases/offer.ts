import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { LENGTHS } from "@/lib/content/limits";
import { ALWAYS_FREE, canOpen } from "@/lib/plan";
import { orderedPackages } from "./packages";
import { getOfferings, trialEligibility } from "./native";
import { offerTrial, trialDays } from "./trial";

/**
 * What the subscription screen shows, worked out from the store's own products (RevenueCat) and from the plan
 * rules (lib/plan.ts). Nothing here is a price typed in by hand: a price, what it comes to a week or a month,
 * the saving and the trial all come from the store, so another country shows its own currency.
 */

/** One plan on offer. `amount` and `currency` are the store's, for the sums; `price` is its own formatted string. */
export interface PlanRow {
  id: string;
  kind: "annual" | "monthly" | "other";
  price: string;
  amount: number;
  currency: string;
  /** Days free, when this person can still have the trial. */
  trial: number | null;
  pkg: PurchasesPackage | null;
}

/** The store's plans, yearly first, with the trial each can still give. Empty when there is no store (a browser) or no offering. */
export async function loadPlanRows(): Promise<PlanRow[]> {
  const found = orderedPackages(await getOfferings());
  if (found.length === 0) return [];
  const eligible = await trialEligibility(found.map(({ pkg }) => pkg.product.identifier));
  const rows = found.map(({ pkg, kind }): PlanRow => {
    const days = trialDays(pkg.product.introPrice);
    return {
      id: pkg.identifier,
      kind,
      price: pkg.product.priceString,
      amount: pkg.product.price,
      currency: pkg.product.currencyCode,
      trial: offerTrial(days, eligible[pkg.product.identifier] ?? null) ? days : null,
      pkg,
    };
  });
  return rows.sort((a, b) => Number(b.kind === "annual") - Number(a.kind === "annual"));
}

/** What a year costs against twelve months, as a whole percentage off; 0 without both prices in one currency. */
export function savingOf(rows: readonly PlanRow[] | null): number {
  const year = rows?.find((r) => r.kind === "annual");
  const month = rows?.find((r) => r.kind === "monthly");
  if (!year || !month || month.amount <= 0 || year.currency !== month.currency) return 0;
  return Math.max(0, Math.round((1 - year.amount / (month.amount * 12)) * 100));
}

/** The same sum from two bare prices (kept for the tests, which hold the rule). */
export const savingPercent = (monthly: number, yearly: number): number => (monthly > 0 && yearly > 0 ? Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)) : 0);

/** An amount in a currency, in the reader's language; null if the currency code is not one the browser knows. */
export function money(amount: number, currency: string, locale: string): string | null {
  try { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount); } catch { return null; }
}

/** The pages of the longest version a book has, and of the free one: the numbers the table speaks of. */
export const FULL_PAGES: number = Math.max(...LENGTHS.map((l) => l.pages));
export const SHORT_PAGES: number = Math.min(...LENGTHS.filter((l) => canOpen(l.pages, "free", false, true)).map((l) => l.pages));

export type CompareRow = { id: "short" | "full" | "keep"; key: "paywall.rowShort" | "paywall.rowFull" | "paywall.rowKeep"; pages?: number; free: boolean; pro: boolean };

/**
 * The Free and Pro columns, taken from the rules rather than written out: a tick is `canOpen` with the gates
 * closed (as they will be once payments are live). The last row is what the plan promises both (ALWAYS_FREE).
 * A row that is not locked would not be here.
 */
export function compareRows(): CompareRow[] {
  return [
    { id: "short", key: "paywall.rowShort", pages: SHORT_PAGES, free: canOpen(SHORT_PAGES, "free", false, true), pro: canOpen(SHORT_PAGES, "full", false, true) },
    { id: "full", key: "paywall.rowFull", pages: FULL_PAGES, free: canOpen(FULL_PAGES, "free", false, true), pro: canOpen(FULL_PAGES, "full", false, true) },
    { id: "keep", key: "paywall.rowKeep", free: ALWAYS_FREE.length > 0, pro: ALWAYS_FREE.length > 0 },
  ];
}
