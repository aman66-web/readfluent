"use client";

import { useEffect, useRef } from "react";

/**
 * Press and hold: `onDown` when a finger or button goes down on the element,
 * `onUp` when it comes up or leaves. Touch is handled separately from pointer
 * events because preventDefault on the touch is what stops iOS scrolling the page,
 * and popping up its long-press menu, while the button is being held.
 */
export function useHold<T extends Element>(onDown: () => void, onUp: () => void) {
  const ref = useRef<T>(null);
  const cbs = useRef({ onDown, onUp });
  useEffect(() => { cbs.current = { onDown, onUp }; });
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el) return;
    const touchStart = (e: TouchEvent) => { e.preventDefault(); cbs.current.onDown(); };
    const touchEnd = (e: TouchEvent) => { e.preventDefault(); cbs.current.onUp(); };
    const down = (e: PointerEvent) => { if (e.pointerType !== "touch") cbs.current.onDown(); };
    const up = (e: PointerEvent) => { if (e.pointerType !== "touch") cbs.current.onUp(); };
    el.addEventListener("touchstart", touchStart, { passive: false });
    el.addEventListener("touchend", touchEnd, { passive: false });
    el.addEventListener("touchcancel", touchEnd, { passive: false });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchend", touchEnd);
      el.removeEventListener("touchcancel", touchEnd);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);
  return ref;
}
