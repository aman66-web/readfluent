import { serviceConfigured } from "@/lib/db/env";
import { createServiceClient } from "@/lib/db/service";
import { headerHoldsSecret, planUpdateFromEvent, type RevenueCatWebhookEvent } from "@/lib/purchases/webhook";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RevenueCat → Supabase.
 *
 * Configured in the RevenueCat dashboard (Project settings → Webhooks) as
 * this route's full URL, with `Authorization: <REVENUECAT_WEBHOOK_SECRET>`
 * as the header it sends on every call — see README, "RevenueCat webhook".
 *
 * Returns 2xx for anything that is not actually actionable (wrong secret
 * aside) rather than letting RevenueCat's retry loop hammer this endpoint
 * over an event it can never turn into a database write — a test event with
 * no entitlement, or a purchase whose app_user_id was never a real Supabase
 * session. Only a database error, which might clear on its own, is worth a
 * retry.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  if (!headerHoldsSecret(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { event?: RevenueCatWebhookEvent };
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const event = body.event;
  const update = event ? planUpdateFromEvent(event) : null;
  if (!update || !event?.app_user_id || !UUID_RE.test(event.app_user_id)) {
    return Response.json({ ok: true });
  }

  if (!serviceConfigured()) return new Response("Not configured", { status: 503 });

  const admin = createServiceClient();
  // The plan's product and period are kept with it (0001_init.sql) for
  // reporting: which of monthly and yearly, and whether it is a free trial.
  let query = admin
    .from("users")
    .update({ plan: update.plan, plan_until: update.planUntil, plan_product: update.planProduct, plan_period: update.planPeriod })
    .eq("id", event.app_user_id);
  // RevenueCat does not promise to deliver in order, so a late older event must not shorten a plan
  // a renewal has already extended. Only an expiration may move the date back.
  if (event.type !== "EXPIRATION" && update.planUntil) query = query.or(`plan_until.is.null,plan_until.lte.${update.planUntil}`);
  const { error } = await query;

  if (error) return new Response("Could not update plan", { status: 500 });

  return Response.json({ ok: true });
}
