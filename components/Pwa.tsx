"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { BUILD } from "@/lib/build";
import { useT } from "@/lib/i18n/react";
import { captureInstallPrompt } from "@/lib/pwa/install";

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

  useUpdateReload();
  // The browser offers to install the app once, early; keep it for the first run's home-screen step.
  useEffect(() => captureInstallPrompt(), []);

  return <OfflinePill />;
}

/**
 * A page left open across a deploy keeps running the build it was loaded with, and
 * nothing tells it otherwise: a change can be live and a phone still be showing the
 * last one. So when the app comes back to the front, ask the server which build is
 * live, and reload once if it is not this one. Never while offline, never in
 * development, and at most once a minute. What a reader has done is on the device, and
 * the first run keeps its place in the address, so a reload loses nothing.
 */
function useUpdateReload() {
  useEffect(() => {
    if (BUILD === "dev") return;
    let last = 0;
    const check = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine || Date.now() - last < 60_000) return;
      last = Date.now();
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const live = String(((await res.json()) as { build?: string }).build ?? "").split(" ")[0];
        if (live && live !== BUILD) {
          // Not in the middle of a form: someone back from their mail app with a sign-in code would lose it. Asked again next time.
          if (document.querySelector("input:not([type=hidden]), textarea")) { last = 0; return; }
          // Once per live build: if the reload somehow lands on the same old bundle, do not loop.
          const key = `readfluent.reloaded.${live}`;
          if (sessionStorage.getItem(key)) return;
          sessionStorage.setItem(key, "1");
          window.location.reload();
        }
      } catch {
        // Offline, storage blocked, or the server is busy: try again next time the app comes forward.
      }
    };
    void check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);
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
  const t = useT();
  if (online || path === "/offline") return null;
  return (
    <div role="status" className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center [--pb:1rem]">
      <span className="rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background shadow-lg">
        {t("offline.title")}
      </span>
    </div>
  );
}
