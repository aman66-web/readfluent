"use client";

import { useEffect } from "react";
import { onNativeShell } from "@/lib/auth/shell";

/**
 * Catches an OAuth sign-in coming back from the system browser, on the
 * native build.
 *
 * A no-op on the web — everything that matters lives in lib/auth/native.
 * This exists only to run it once, from somewhere that is always mounted;
 * the root layout is that somewhere, the same reason Sync and OnboardingGate
 * are there.
 */
export function NativeAuthBridge() {
  useEffect(() => {
    // The sign-in code (and the Supabase client under it) is fetched only inside the native app.
    if (!onNativeShell()) return;
    let stop: (() => void) | undefined;
    let gone = false;
    void import("@/lib/auth/native").then((m) => {
      if (gone) return;
      stop = m.listenForNativeAuth();
    });
    return () => { gone = true; stop?.(); };
  }, []);
  return null;
}
