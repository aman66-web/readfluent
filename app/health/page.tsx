"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dbConfigured } from "@/lib/db/env";
import { buildLine } from "@/lib/build";
import { CACHE_PREFIX } from "@/lib/brand";

/**
 * What the BROWSER believes, which is a different question from /api/health.
 *
 * The two read the same settings from different places. `NEXT_PUBLIC_` values
 * are compiled into the JavaScript when the app is built, so the server picks a
 * changed one up at once while a browser only sees it in a newly built bundle —
 * and a browser running a cached old bundle sees the value from whenever that
 * bundle was made. That split is invisible from either side alone: /api/health
 * says everything is configured while the sign-in screen says there is no
 * database, and both are telling the truth about what they can see.
 *
 * So this page answers the other half: what the code actually running in this
 * browser was built with, and whether a service worker is serving it from
 * yesterday. Public values only — the host of the project URL, never a key.
 */
export default function BrowserHealth() {
  // Read once the page is on screen rather than during render: the server has
  // no navigator, and a value read during render would differ between the two
  // and be thrown away as a hydration mismatch.
  const [sw, setSw] = useState<"checking" | "none" | "controlling">("checking");
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const read = () =>
      setSw(
        "serviceWorker" in navigator && navigator.serviceWorker.controller
          ? "controlling"
          : "none",
      );
    // A worker can take control a moment after load, so listen as well as look.
    read();
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.addEventListener("controllerchange", read);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", read);
  }, []);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host = "";
  try { host = url ? new URL(url).host : ""; } catch { host = "(not a URL)"; }

  /**
   * Unregister every worker and drop the app's stored shell, then reload from
   * the network. A downloaded version lives in a cache of its own
   * (`readfluent-dl-…`, public/sw.js) and is the reader's, not ours to delete.
   */
  const clear = async () => {
    setCleared(true);
    try {
      if ("serviceWorker" in navigator) {
        for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      }
      if ("caches" in window) {
        for (const k of await caches.keys()) {
          if (!k.startsWith(`${CACHE_PREFIX}dl-`)) await caches.delete(k);
        }
      }
    } catch {
      // Blocked in a private window, or unsupported. The reload still helps.
    }
    location.reload();
  };

  const rows: [string, string][] = [
    ["Build", buildLine()],
    ["Database configured in this bundle", dbConfigured() ? "yes" : "NO — sign-in will be hidden"],
    ["Project host", host || "(not set in this bundle)"],
    ["Service worker", sw === "controlling" ? "serving this page" : sw === "none" ? "not serving" : "…"],
  ];

  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <h1 className="text-[22px] font-semibold">What this browser is running</h1>
      <p className="mt-2 text-[13px] leading-snug text-muted">
        <code>/api/health</code> reports the server. This reports the JavaScript you actually
        have. If they disagree, the bundle is older than the settings.
      </p>

      <dl className="mt-6 space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-md border border-border bg-surface p-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{k}</dt>
            <dd className="tabular mt-1 text-[14px] font-semibold break-all">{v}</dd>
          </div>
        ))}
      </dl>

      <button type="button" onClick={clear} disabled={cleared}
              className="mt-6 h-12 w-full btn-cyan rounded-full px-5 text-[14px] font-bold">
        {cleared ? "Clearing…" : "Clear the cache and reload"}
      </button>
      <p className="mt-2.5 text-[12px] leading-snug text-faint">
        Removes the service worker and the app&apos;s stored copy, then fetches the current build. Your
        reading progress and anything you&apos;ve downloaded are not touched.
      </p>

      {/* Installed, there is no address bar and no browser Back, so a page with
          no way out is a page somebody has to force-quit the app to leave. */}
      <Link href="/" className="mt-6 inline-flex h-11 items-center text-[13px] font-semibold text-muted underline underline-offset-4">
        Back to the app
      </Link>
    </main>
  );
}
