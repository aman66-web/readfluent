"use client";

import { useEffect, useState } from "react";
import { isRealAccount } from "@/lib/auth/gate";
import { dbConfigured } from "@/lib/db/env";

/**
 * Whether a real account is signed in on this device, for the first run (which steps may open).
 * "unknown" until the device's own session has been read; "yes" always when no account service is connected
 * (local development: there is nothing to sign in to, so nothing is held back).
 */
export type AccountState = "unknown" | "yes" | "no";

export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>(dbConfigured() ? "unknown" : "yes");
  useEffect(() => {
    if (!dbConfigured()) return;
    let live = true;
    let stop = () => {};
    void import("@/lib/db/client").then(({ createClient }) => {
      if (!live) return;
      const supabase = createClient();
      const set = (user: Parameters<typeof isRealAccount>[0]) => { if (live) setState(isRealAccount(user) ? "yes" : "no"); };
      void supabase.auth.getSession().then(({ data, error }) => { if (!error) set(data.session?.user); }).catch(() => {});
      const { data } = supabase.auth.onAuthStateChange((_event, session) => set(session?.user));
      stop = () => data.subscription.unsubscribe();
    });
    return () => { live = false; stop(); };
  }, []);
  return state;
}
