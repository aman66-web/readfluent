import { createHash, timingSafeEqual } from "node:crypto";
import { PRO_ENTITLEMENT } from "./entitlement";

/**
 * The pure half of app/api/revenuecat/webhook/route.ts.
 *
 * Kept out of the route file because a Next route may export only its
 * handlers and route config; anything else there fails `next build`'s type
 * check. Kept pure so the tests can reach it without a request or a database.
 */

/** The fields the webhook reads out of RevenueCat's event payload. RevenueCat sends many more; nothing else here matters. */
export interface RevenueCatWebhookEvent {
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
  /** The store product bought — which of monthly and yearly. */
  product_id?: string | null;
  /** TRIAL during a free trial, NORMAL once paying (also INTRO, PROMOTIONAL). */
  period_type?: string | null;
}

export interface PlanUpdate {
  plan: "full";
  planUntil: string | null;
  /** Kept with the plan (0008_credits.sql), for reporting. */
  planProduct: string | null;
  planPeriod: string | null;
}

/**
 * What a RevenueCat event means for `public.users.plan` / `plan_until`.
 *
 * Null when the event says nothing about the Pro entitlement — a purchase of
 * some other product, or a "Send Test Event" from the RevenueCat dashboard,
 * which carries no entitlements at all.
 *
 * Every event that DOES carry the entitlement is handled the same way,
 * whatever its `type`: write `plan_until` to the entitlement's new expiration
 * and let `effective_plan()` (0006_plan.sql) decide whether that date has
 * passed. That single rule already covers the cases that would otherwise need
 * a branch each:
 *   - INITIAL_PURCHASE / RENEWAL / UNCANCELLATION: a new, later expiration —
 *     `effective_plan` reads "full" until it passes.
 *   - CANCELLATION: auto-renew is off, but access runs to the SAME
 *     expiration either way — nothing to change here yet.
 *   - EXPIRATION: the expiration RevenueCat sends is already in the past, so
 *     `effective_plan` reads "free" the moment this lands, with no separate
 *     "turn it off" branch required.
 */
export function planUpdateFromEvent(event: RevenueCatWebhookEvent): PlanUpdate | null {
  if (!event.entitlement_ids?.includes(PRO_ENTITLEMENT)) return null;
  return {
    plan: "full",
    planUntil: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    planProduct: event.product_id ?? null,
    planPeriod: event.period_type ?? null,
  };
}

/**
 * Whether an incoming `Authorization` header carries the configured secret.
 *
 * Accepts it bare (`Authorization: <secret>`, what README's setup steps ask
 * for) or Bearer-prefixed (`Authorization: Bearer <secret>`) — some senders
 * add that prefix to any header value entered as a bare string, and there is
 * no reason to make the exact scheme a second thing that has to match.
 */
export function headerHoldsSecret(header: string | null, secret: string): boolean {
  if (!header) return false;
  const bearer = /^Bearer\s+(.+)$/i.exec(header);
  // Compared as digests, so the time taken says nothing about how much of the secret matched.
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(bearer ? bearer[1] : header), digest(secret));
}
