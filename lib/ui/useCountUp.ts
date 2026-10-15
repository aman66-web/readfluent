"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that glides to its new value (owner, 15 Oct 2026: elegant motion): when `to` changes, the shown number counts
 * from where it was to the new value over `ms`, easing out. The first render shows `to` itself, so a page rendered on the
 * server (or in a test) has the true number; on the home screen the stored XP and coins arrive just after hydration, so
 * they count up from zero. Reduced motion jumps straight to the value.
 */
export function useCountUp(to: number, ms = 900): number {
  const [shown, setShown] = useState(to);
  const at = useRef(to);
  useEffect(() => {
    const from = at.current;
    if (from === to || !Number.isFinite(to)) return;
    const still = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const span = still ? 0 : ms;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = span <= 0 ? 1 : Math.min(1, (now - t0) / span);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      at.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return shown;
}
