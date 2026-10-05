import type { PlanRow } from "@/lib/purchases/offer";

/**
 * Fake store plans, to look at the subscription screen in a browser (`/paywall?preview=GBP`). Development only:
 * the screen imports this behind a `process.env.NODE_ENV !== "production"` check, so a production build never
 * contains it, and the route ignores `preview` there.
 */
const PLANS: Record<string, { year: number; month: number }> = {
  GBP: { year: 39.99, month: 5.99 },
  EUR: { year: 44.99, month: 6.99 },
  USD: { year: 49.99, month: 7.99 },
  JPY: { year: 7500, month: 1100 },
};

/** `GBP`, or `GBP:notrial` for a reader the store says has had the free trial already. */
export function previewRows(spec: string): PlanRow[] {
  const [code, flag] = spec.toUpperCase().split(":");
  const trial = flag === "NOTRIAL" ? null : 7;
  const p = PLANS[code] ?? PLANS.GBP;
  const currency = PLANS[code] ? code : "GBP";
  const price = (n: number) => new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: currency === "JPY" ? 0 : 2 }).format(n);
  return [
    { id: "preview-annual", kind: "annual", price: price(p.year), amount: p.year, currency, trial, pkg: null },
    { id: "preview-monthly", kind: "monthly", price: price(p.month), amount: p.month, currency, trial, pkg: null },
  ];
}
