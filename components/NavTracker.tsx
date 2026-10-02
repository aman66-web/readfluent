"use client";

import { useEffect } from "react";
import { startTracking } from "@/lib/nav";

/** Mirrors the tab's history so the back arrows know where they came from (lib/nav.ts). Draws nothing. */
export function NavTracker() {
  useEffect(() => { startTracking(); }, []);
  return null;
}
