"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * What the native build does to the page so it behaves like an app, not a website in a frame (App Review 4.2).
 *
 * It marks <html> with `data-native="ios"` (or "android"). app/globals.css keys its native-only rules to that
 * attribute ("Inside the native app"): no Safari preview or drag on a long-pressed link or picture, no word selection
 * on buttons, tabs, titles and covers, no rubber-band bounce of the page itself. A browser never gets the attribute,
 * so the website is untouched. A data attribute rather than a class: React owns <html>'s className
 * (app/layout.tsx) and could write over a class it did not put there; it never touches an attribute it does not set.
 * app/layout.tsx's early script sets it from the first frame; this keeps it set after hydration.
 *
 * And the phone's own status bar — the clock, signal and battery — on the native build, where the page runs underneath
 * it (capacitor.config.ts, contentInset "never"). Its text has to be the opposite of the ground under it. The ground is
 * paper, so the text is dark: Capacitor's `Style.Light` ("for a light background"). In an older build without the
 * plugin, that part does nothing.
 *
 * Renders nothing; on the web, it does nothing at all.
 */
export function NativeChrome() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const root = document.documentElement;
    root.setAttribute("data-native", Capacitor.getPlatform());
    if (Capacitor.isPluginAvailable("StatusBar")) StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    return () => root.removeAttribute("data-native");
  }, []);
  return null;
}
