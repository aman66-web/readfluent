"use client";

import { useEffect } from "react";
import { dbConfigured } from "@/lib/db/env";
import { createClient } from "@/lib/db/client";
import { isNative } from "@/lib/auth/native";
import { configurePurchases } from "@/lib/purchases/native";
import { refreshPlan } from "@/lib/pro/state";

/**
 * Configures RevenueCat once, on the native build only, with whatever
 * Supabase user id this device currently has — see lib/purchases/native.ts
 * for why that id is the right one. Renders nothing; mounted once from the
 * root layout, the same way NativeAuthBridge is.
 *
 * Re-runs `configurePurchases` (which becomes a `logIn` after the first
 * call) whenever auth state changes, so a sign-out that lands on a different
 * account is not left selling Pro against the previous one.
 */
export function PurchasesBridge() {
  useEffect(() => {
    if (!isNative() || !dbConfigured()) return;
    const supabase = createClient();
    let live = true;

    supabase.auth.getUser().then(({ data }) => {
      // Once RevenueCat knows who this is, it can say whether they hold Pro.
      if (live && data.user) void configurePurchases(data.user.id).then(refreshPlan);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void configurePurchases(session.user.id).then(refreshPlan);
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
