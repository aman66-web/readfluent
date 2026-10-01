import { PACKAGE_TYPE, type PurchasesOffering, type PurchasesPackage } from "@revenuecat/purchases-capacitor";

/** Monthly first, then yearly — falling back to whatever the dashboard actually offers if either predefined slot is empty. */
export function orderedPackages(offering: PurchasesOffering | null): { pkg: PurchasesPackage; kind: "monthly" | "annual" | "other" }[] {
  if (!offering) return [];
  const out: { pkg: PurchasesPackage; kind: "monthly" | "annual" | "other" }[] = [];
  if (offering.monthly) out.push({ pkg: offering.monthly, kind: "monthly" });
  if (offering.annual) out.push({ pkg: offering.annual, kind: "annual" });
  if (out.length === 0) {
    for (const pkg of offering.availablePackages) {
      out.push({ pkg, kind: pkg.packageType === PACKAGE_TYPE.ANNUAL ? "annual" : "other" });
    }
  }
  return out;
}
