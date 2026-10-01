"use client";

import { useEffect } from "react";
import { listenForNativeAuth } from "@/lib/auth/native";

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
  useEffect(() => listenForNativeAuth(), []);
  return null;
}
