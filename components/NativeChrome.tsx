"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * The phone's own status bar — the clock, signal and battery — on the native
 * build, where the page runs underneath it (capacitor.config.ts, contentInset
 * "never").
 *
 * Its text has to be the opposite of the ground under it. The ground is paper,
 * so the text is dark: Capacitor's `Style.Light` ("for a light background").
 * Renders nothing; on the web, and in an older build without the plugin, it
 * does nothing at all.
 */
export function NativeChrome() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("StatusBar")) return;
    StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
  }, []);
  return null;
}
