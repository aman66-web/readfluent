"use client";

import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import type { MouseEvent, ReactNode } from "react";

/** A sheet has been asked for and is not up yet (see the double-tap guard in openOver). */
let opening = false;

/**
 * Opens one of the app's own pages (the Terms, the Privacy Policy, Support) OVER the screen somebody is on,
 * instead of leaving it. Two screens need that. The subscription screen before the tour sits over every page
 * (components/paywall/OfferGate, in the root layout), so a page opened under it stayed hidden behind it and its
 * links looked dead. And the first run's sign-in keeps where it is in the run in memory, which leaving loses.
 *
 * In the app: the phone's own browser sheet (Safari's on the iPhone, a Custom Tab on Android) at the app's own
 * address; Done (or Back) lands exactly where they were, with nothing on the screen changed. In a browser: a new
 * tab. If neither can open, the link is simply followed, so it never does nothing.
 */
export function openOver(href: string): void {
  const target = new URL(href, window.location.origin);
  // The sheet has none of the app's storage: send the reader's language along (lib/i18n/react useLocale reads ?hl=).
  const lang = typeof document === "undefined" ? "" : document.documentElement.lang;
  if (target.origin === window.location.origin && lang && lang !== "en" && !target.searchParams.has("hl")) target.searchParams.set("hl", lang);
  const url = target.toString();
  const follow = () => window.location.assign(url);
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable("Browser")) { follow(); return; }
    // A second tap while the sheet is still sliding up: iOS refuses a second sheet, and following the link then would
    // move the screen underneath. Browser.open settles once the sheet is up, and from then on it covers every link.
    if (opening) return;
    opening = true;
    void Browser.open({ url }).then(() => { opening = false; }, () => { opening = false; follow(); });
    return;
  }
  const tab = window.open(url, "_blank");
  if (tab) tab.opener = null;
  else follow();
}

/** A link that opens its page over this screen (see openOver). Before the script has loaded it is an ordinary link. */
export function OverLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    // A click that asks for a new tab or window itself (a modifier key, the middle button) is left to the browser.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    openOver(href);
  };
  return <a href={href} onClick={open} className={className}>{children}</a>;
}
