"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { BUILD } from "@/lib/build";

/**
 * What an installed app needs and a page does not: the service worker, and a
 * word when the connection is gone. Rendered once, in the layout.
 *
 * The worker keeps the app SHELL working offline and nothing else. Books are
 * kept only when a reader explicitly downloads one (M9); reading online leaves
 * nothing behind (CLAUDE.md, "Offline").
 */
export function Pwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    // The build is in the URL so a deploy is a different script: the browser
    // fetches it, the new worker takes over, and its `activate` drops the
    // cache the previous build filled. A worker whose URL never changes is only
    // re-fetched on a byte difference, which a content-hashed shell does not
    // have — and then a shipped change is not on the phone.
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(BUILD)}`, { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (cancelled || !reg.active) return;
        // Everything this page loaded before the worker took over — scripts,
        // styles, fonts — goes into the shell cache now, so the first visit is
        // the one that makes the app open offline.
        const urls = performance.getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => u.startsWith(`${location.origin}/_next/`) && !u.includes("webpack-hmr"));
        reg.active.postMessage({ type: "precache", urls: [...new Set([...urls, location.pathname])] });
      })
      .catch(() => {
        // No worker, no offline shell — the app still runs.
      });
    return () => { cancelled = true; };
  }, []);

  return <OfflinePill />;
}

const subscribeOnline = (fn: () => void) => {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => { window.removeEventListener("online", fn); window.removeEventListener("offline", fn); };
};
const onlineSnapshot = () => navigator.onLine;
const serverOnline = () => true;

/** A small pill at the bottom of the screen while navigator.onLine is false (not on /offline, which says so itself). */
function OfflinePill() {
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnline);
  const path = usePathname();
  if (online || path === "/offline") return null;
  return (
    <div role="status" className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4">
      <span className="rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background shadow-lg">
        You&apos;re offline
      </span>
    </div>
  );
}
