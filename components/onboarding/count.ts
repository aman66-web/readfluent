"use client";

import { useEffect, useState } from "react";

/**
 * A count that works its way up in uneven stretches, as a real job does: a burst,
 * a slower crawl, a moment's pause, then on. `stops` are [value, ms] pairs, each
 * stretch eased in and out. Where motion is reduced it is simply at the last value.
 */
export function useStagedCount(stops: readonly (readonly [number, number])[], delay = 0): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const last = stops.length ? stops[stops.length - 1][0] : 0;
    let raf = 0;
    let start = 0;
    const total = stops.reduce((sum, [, ms]) => sum + ms, 0);
    const at = (elapsed: number) => {
      let from = 0;
      for (const [to, ms] of stops) {
        if (elapsed < ms) {
          const p = elapsed / ms;
          const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          return Math.round(from + (to - from) * eased);
        }
        elapsed -= ms;
        from = to;
      }
      return last;
    };
    const t = window.setTimeout(() => {
      if (still) { setN(last); return; }
      const step = (ts: number) => {
        if (!start) start = ts;
        const e = ts - start;
        setN(at(e));
        if (e < total) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, still ? 0 : delay);
    return () => { window.clearTimeout(t); cancelAnimationFrame(raf); };
  }, [stops, delay]);
  return n;
}
