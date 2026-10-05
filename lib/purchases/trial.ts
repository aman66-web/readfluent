/**
 * A subscription's free trial, as the subscription screen shows it.
 *
 * The trial itself lives in the store: App Store Connect (an introductory
 * offer, "Free", one week, on each subscription) and Google Play (a free-trial
 * offer on each base plan). RevenueCat reads it from there onto each product
 * as `introPrice`, so nothing here decides that there is a trial: only how to
 * say so, and whether this person can still have one.
 */
export interface IntroLike {
  price: number;
  periodUnit: string;
  periodNumberOfUnits: number;
  cycles: number;
}

const DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** How many days free a product's introductory offer gives, or null if it is not a free trial. */
export function trialDays(intro: IntroLike | null | undefined): number | null {
  if (!intro || intro.price !== 0) return null;
  const unit = DAYS[intro.periodUnit?.toUpperCase?.() ?? ""];
  if (!unit) return null;
  const days = unit * Math.max(1, intro.periodNumberOfUnits || 1) * Math.max(1, intro.cycles || 1);
  return days > 0 ? days : null;
}

/**
 * Whether to offer the trial. `eligible` is the store's answer: true or false
 * on iOS, where RevenueCat can check whether this Apple ID has had one; null
 * on Android, where Google Play decides at purchase and shows it in its own
 * sheet. On iOS an unknown answer comes back false: RevenueCat's advice is to
 * show the normal price rather than promise a trial that may not come.
 */
export function offerTrial(days: number | null, eligible: boolean | null): days is number {
  return days !== null && eligible !== false;
}
