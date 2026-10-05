"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isRealAccount, needsAccount, signInRedirect } from "@/lib/auth/gate";
import { dbConfigured } from "@/lib/db/env";
import { ONBOARDED_COOKIE } from "@/lib/onboarding";
import { hasAppSession } from "@/lib/site/hosts";

/**
 * The browser's half of the account gate (the proxy, proxy.ts, is the server's half). It covers what a page
 * request never sees: signing out in another tab, a session that ended while the app was open, and the phone's
 * Back or swipe restoring a page it kept in memory from before the sign-out. Any of them lands on the sign-in.
 *
 * It only acts when the session is known to be missing: if the auth service cannot be reached (no network),
 * nothing happens, because reading offline must not depend on it. Renders nothing.
 */
export function AccountGate() {
  const pathname = usePathname();
  useEffect(() => {
    if (!dbConfigured() || !needsAccount(pathname)) return;
    let live = true;
    let stop = () => {};
    const names = document.cookie.split("; ").map((c) => c.split("=")[0]);
    const toSignIn = () => window.location.replace(signInRedirect(names.includes(ONBOARDED_COOKIE)));
    // No session cookie at all: signed out, and the auth client need not even be loaded to know it.
    if (!hasAppSession(names)) { toSignIn(); return; }
    void import("@/lib/db/client").then(({ createClient }) => {
      if (!live) return;
      const supabase = createClient();
      const check = async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!live || error) return;
          if (!isRealAccount(data.session?.user)) toSignIn();
        } catch { /* cannot be asked: leave the page as it is */ }
      };
      void check();
      const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") toSignIn(); });
      const shown = (e: PageTransitionEvent) => { if (e.persisted) void check(); };
      window.addEventListener("pageshow", shown);
      stop = () => { data.subscription.unsubscribe(); window.removeEventListener("pageshow", shown); };
    });
    return () => { live = false; stop(); };
  }, [pathname]);
  return null;
}
