"use client";

import { useEffect } from "react";
import { dbConfigured } from "@/lib/db/env";
import { onNativeShell } from "@/lib/auth/shell";

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
    if (!onNativeShell() || !dbConfigured()) return;
    let live = true;
    let unsubscribe: (() => void) | undefined;

    // Loaded only inside the native app: the Supabase client and RevenueCat are not sent to the web.
    void Promise.all([import("@/lib/db/client"), import("@/lib/purchases/native"), import("@/lib/pro/state")]).then(([db, purchases, pro]) => {
      if (!live) return;
      const supabase = db.createClient();
      supabase.auth.getUser().then(({ data }) => {
        // Once RevenueCat knows who this is, it can say whether they hold Pro.
        if (live && data.user) void purchases.configurePurchases(data.user.id).then(pro.refreshPlan);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) void purchases.configurePurchases(session.user.id).then(pro.refreshPlan);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });

    return () => {
      live = false;
      unsubscribe?.();
    };
  }, []);

  return null;
}
