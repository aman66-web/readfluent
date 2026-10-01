"use client";

import { useSyncExternalStore } from "react";
import { dbConfigured } from "@/lib/db/env";
import { createClient } from "@/lib/db/client";
import { effectivePlan, type Plan } from "@/lib/plan";
import { getCustomerInfo, hasProEntitlement } from "@/lib/purchases/native";
import { isReviewer } from "@/lib/auth/review";
import { storageKey } from "@/lib/brand";

/**
 * The learner's plan, on the client — what a screen reads to decide whether
 * to show a Pro tool or the card that explains it.
 *
 * Two sources, either of which is enough to say "full":
 *   - their `public.users` row, which the RevenueCat webhook writes, and which
 *     is what the paywall at a version's door (lib/plan.ts `canOpen`) checks;
 *   - on the phone, RevenueCat's own entitlement, which knows the instant a
 *     purchase goes through, a few seconds before the webhook lands.
 *
 * So an answer that cannot be had (offline, a failed query) keeps whatever
 * was known before rather than locking somebody out on a bad connection, and
 * the last answer is kept on the device so a returning Pro learner does not
 * see a lock flash up while the first query is in flight.
 */

const KEY = storageKey("plan");

export interface PlanState {
  plan: Plan;
  /** False until an answer has come back, from the network or from the device. */
  known: boolean;
}

const UNKNOWN: PlanState = { plan: "free", known: false };

let state: PlanState = UNKNOWN;
let started = false;
const listeners = new Set<() => void>();

function publish(next: PlanState) {
  if (next.plan === state.plan && next.known === state.known) return;
  state = next;
  try { localStorage.setItem(KEY, next.plan); } catch { /* private mode: fine, it just asks again */ }
  for (const l of listeners) l();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const kept = localStorage.getItem(KEY);
    if (kept === "full" || kept === "free") state = { plan: kept, known: true };
  } catch { /* nothing kept */ }
  void refreshPlan();
  if (dbConfigured()) {
    // Deferred: a Supabase call awaited inside this callback can deadlock the
    // client's auth lock.
    createClient().auth.onAuthStateChange(() => { setTimeout(() => void refreshPlan(), 0); });
  }
}

/** Ask both sources again. Called on start, on any change of account, and after a purchase or restore. */
export async function refreshPlan(): Promise<void> {
  if (hasProEntitlement(await getCustomerInfo())) {
    publish({ plan: "full", known: true });
    return;
  }
  if (!dbConfigured()) {
    publish({ plan: "free", known: true });
    return;
  }
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      publish({ plan: "free", known: true });
      return;
    }
    // A store reviewer is Pro by their address, as on the server.
    if (isReviewer(user)) {
      publish({ plan: "full", known: true });
      return;
    }
    const { data, error } = await supabase.from("users").select("plan, plan_until").eq("id", user.id).maybeSingle();
    if (error) return;
    publish({ plan: effectivePlan(data), known: true });
  } catch {
    // Offline: keep what was known.
  }
}

function subscribe(fn: () => void) {
  start();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function usePlan(): PlanState {
  return useSyncExternalStore(subscribe, () => state, () => UNKNOWN);
}

