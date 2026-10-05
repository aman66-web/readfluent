import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { ALWAYS_FREE, canOpenBook } from "@/lib/plan";
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

/** How many different books a free reader may begin: counted from the plan's own rule (lib/plan.ts `canOpenBook`), not copied from a constant. */
export function freeBookCount(): number {
  let n = 0;
  while (n < 1000 && canOpenBook("free", false, n, true)) n += 1;
  return n;
}

/** Whether a paid reader can begin any number of books (the rule says so for a count no reader will reach). */
export const proReadsEveryBook = (): boolean => canOpenBook("full", false, 100000, true);

export type CompareRow =
  | { id: "books"; key: "paywall.rowBooks"; /** What the Free column says, when it is a limit rather than a tick. */ freeLimit: number | null; free: boolean; pro: boolean }
  | { id: "keep"; key: "paywall.rowKeep"; freeLimit: null; free: boolean; pro: boolean };

/**
 * The Free and Pro columns, taken from the rules rather than written out. A row is here only because the
 * rules lock it: the books (free begins `freeBookCount()` of them, Pro begins any), and what both always have
 * (ALWAYS_FREE). Full-length editions are not a row: a free reader opens the books they begin in full.
 */
export function compareRows(): CompareRow[] {
  const limit = freeBookCount();
  const unlimitedFree = canOpenBook("free", false, 100000, true);
  return [
    { id: "books", key: "paywall.rowBooks", freeLimit: unlimitedFree ? null : limit, free: limit > 0, pro: proReadsEveryBook() },
    { id: "keep", key: "paywall.rowKeep", freeLimit: null, free: ALWAYS_FREE.length > 0, pro: ALWAYS_FREE.length > 0 },
  ];
}
