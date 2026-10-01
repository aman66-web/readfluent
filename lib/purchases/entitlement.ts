/**
 * The RevenueCat entitlement identifier that unlocks `lib/plan.ts`'s "full"
 * plan. Split into its own file, with no other imports, because the webhook
 * route (app/api/revenuecat/webhook/route.ts) needs this one string and
 * nothing else from lib/purchases/native.ts — which pulls in the Capacitor
 * and RevenueCat client SDKs, neither meant to load into a server route.
 *
 * "readfluent_pro", not "pro": whichever identifier gets typed into the
 * RevenueCat dashboard when the entitlement is created is the one that has
 * to match here, so create it with exactly this id.
 */
export const PRO_ENTITLEMENT = "readfluent_pro";
