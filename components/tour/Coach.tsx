"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { MASCOT_NAME } from "@/lib/brand";
import { useT } from "@/lib/i18n/react";
import { ONBOARDED_COOKIE } from "@/lib/onboarding";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { TOUR, advanceOnRoute, after, stepFor } from "@/lib/tour/steps";
import { TOUR_KEY, finishTour, parseTour, setTourStep } from "@/lib/tour/state";

const subscribe = subscribeTo(TOUR_KEY);
const server = () => "";
const subNone = () => () => {};
const hasOnboardedCookie = (): boolean => document.cookie.split("; ").some((c) => c.startsWith(`${ONBOARDED_COOKIE}=`));
const PAD = 8;

interface Box { x: number; y: number; w: number; h: number }

/** Room the bubble takes (its height, the gap, and the tab bar when it sits at the bottom). */
const BUBBLE = 200;
const TAB_BAR = 96;

const isFixed = (el: HTMLElement | null): boolean => {
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    const p = getComputedStyle(n).position;
    if (p === "fixed" || p === "sticky") return true;
  }
  return false;
};

/**
 * The part of the screen a step points at, followed frame by frame (so the spotlight stays on it while the
 * page settles); null if it is not (yet) on screen. When the step begins the page is moved once so that the lit
 * part sits in the free area (below the bubble when the bubble is at the top, above it when it is at the
 * bottom) and the bubble never covers it. `top` says where the bubble goes.
 */
function useTargetBox(target: string | undefined, active: boolean): { box: Box | null; top: boolean } {
  const [state, setState] = useState<{ box: Box | null; top: boolean }>({ box: null, top: false });
  useEffect(() => {
    if (!active || !target) return;
    let placed = false;
    let top = false;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      if (!el) setState((s) => (s.box === null ? s : { box: null, top: s.top }));
      else {
        const r = el.getBoundingClientRect();
        if (!placed) {
          placed = true;
          const vh = window.innerHeight;
          top = r.top + r.height / 2 > vh * 0.5;
          if (!isFixed(el)) {
            // The free area for the lit part, and where in it to put the part (centred, or at its edge if it is too tall).
            const lo = top ? 56 + BUBBLE + 12 : 56;
            const hi = top ? vh - TAB_BAR : vh - TAB_BAR - BUBBLE - 12;
            const to = r.height >= hi - lo ? lo : lo + (hi - lo - r.height) / 2;
            window.scrollBy({ top: r.top - to, behavior: "smooth" });
          }
        }
        setState((s) => (s.box && s.top === top && Math.abs(s.box.x - r.left) < 0.5 && Math.abs(s.box.y - r.top) < 0.5 && Math.abs(s.box.w - r.width) < 0.5 && Math.abs(s.box.h - r.height) < 0.5 ? s : { box: { x: r.left, y: r.top, w: r.width, h: r.height }, top }));
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return active && target ? state : { box: null, top: false };
}

/** Keeps touches and the wheel on an element from scrolling the page behind it (the page stays where the tour put it). */
function useNoScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener("touchmove", stop, { passive: false });
    el.addEventListener("wheel", stop, { passive: false });
    return () => { el.removeEventListener("touchmove", stop); el.removeEventListener("wheel", stop); };
  }, [ref]);
}

/** A layer that takes touches and does not let them scroll the page. */
function Shield({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useNoScroll(ref);
  return <div ref={ref} aria-hidden className={`pointer-events-auto absolute touch-none overscroll-contain ${className}`} style={style} />;
}

/**
 * Dewey's tour of the app: a bubble with the owl, and a spotlight on the part of the screen it is talking
 * about. The dimmed screen does not block taps, so a step that asks the reader to tap something (the
 * Library tab, a book, Read) is done by tapping it. Rules and order: lib/tour/steps.ts. It begins when a
 * reader who has finished the first run reaches the home screen, can be skipped at any step, and can be
 * started again from the profile.
 */
export function Coach() {
  const t = useT();
  const pathname = usePathname();
  const raw = useSyncExternalStore(subscribe, () => readRaw(TOUR_KEY), server);
  const state = useMemo(() => parseTour(raw), [raw]);
  // The tour belongs to someone who has been through the first run (the cookie it sets); not to the first run itself.
  const onboarded = useSyncExternalStore(subNone, hasOnboardedCookie, () => false);

  const index = state.step;
  // A reader's own tap moved the page where the step was leading: on to the step for that page.
  useEffect(() => {
    if (state.done || !onboarded) return;
    const next = advanceOnRoute(index, pathname);
    if (next !== index) setTourStep(next);
  }, [index, pathname, state.done, onboarded]);

  const step = !state.done && onboarded ? stepFor(index, pathname) : null;
  const { box, top } = useTargetBox(step?.target, step !== null);
  // A step whose target is not on this screen (no speaker on this device, say) is skipped.
  const [missing, setMissing] = useState<string | null>(null);
  useEffect(() => {
    if (!step?.target) return;
    const id = window.setTimeout(() => { if (!document.querySelector(`[data-tour="${step.target}"]`)) setMissing(step.id); }, 1200);
    return () => window.clearTimeout(id);
  }, [step]);
  useEffect(() => {
    if (step && missing === step.id && step.mode === "next") {
      const n = after(index);
      if (n === null) finishTour(); else setTourStep(n);
    }
  }, [missing, step, index]);

  if (!step) return null;
  const last = after(index) === null;
  const next = () => { const n = after(index); if (n === null) finishTour(); else setTourStep(n); };
  // The bubble goes where the highlighted part is not: at the top when it is low on the screen, else at the bottom.
  const vw = typeof window === "undefined" ? 390 : window.innerWidth;
  // Where the bubble's tail points: the middle of what is lit, kept inside the bubble.
  const cardW = Math.min(420, vw - 24);
  const tailX = box ? Math.min(cardW - 30, Math.max(top ? 30 : 104, box.x + box.w / 2 - (vw - cardW) / 2)) : 0;
  const hole = box ? { left: box.x - PAD, top: box.y - PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 } : null;
  const pct = ((index + 1) / TOUR.length) * 100;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      {hole ? (
        <>
          <div className="coach-spot absolute rounded-[24px]" style={hole} />
          {/* Touches on the dimmed part do nothing (not even scrolling); the lit part stays tappable, which is how a step that asks for a tap is done. */}
          {step.mode === "next" ? (
            <Shield className="inset-0" />
          ) : (
            <>
              <Shield className="inset-x-0 top-0" style={{ height: Math.max(0, hole.top) }} />
              <Shield className="inset-x-0 bottom-0" style={{ top: hole.top + hole.height }} />
              <Shield className="left-0" style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }} />
              <Shield className="right-0" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }} />
            </>
          )}
        </>
      ) : (
        <>
          <div className="coach-dim absolute inset-0" />
          <Shield className="inset-0" />
        </>
      )}

      <Dialog label={t("coach.stepOf", { n: index + 1, total: TOUR.length })}
              className={top ? "top-[calc(env(safe-area-inset-top)+3.25rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]"}>
        <div className="coach-bubble relative rounded-[28px] bg-white px-5 pb-4 pt-5 text-[#0B1B22]">
          {box && <span className={`coach-tail absolute size-4 rotate-45 bg-white ${top ? "-bottom-[7px]" : "-top-[7px]"}`} style={{ left: tailX - 8 }} aria-hidden />}
          <div className="flex items-start gap-3.5">
            <span className="-mt-14 block w-[84px] shrink-0"><Mascot mood={step.mood} talking className="w-full" /></span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="ed-serif text-[12.5px] font-medium italic tabular-nums text-[rgba(11,27,34,.55)]">{index + 1} / {TOUR.length}</p>
              <p className="mt-1 text-[17px] font-medium leading-[1.3] tracking-[-0.012em]">{t(step.text, { mascot: MASCOT_NAME })}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => finishTour()} className="h-11 rounded-full px-1 text-[14px] font-semibold text-[rgba(11,27,34,.6)] underline decoration-[rgba(11,27,34,.25)] decoration-1 underline-offset-4 active:opacity-60">{t("coach.skip")}</button>
            {step.mode === "next" ? (
              <button type="button" onClick={next} className="btn-cyan inline-flex h-12 items-center gap-2 rounded-full ps-6 pe-2 text-[15.5px] font-semibold active:scale-[0.98]">
                {last ? t("coach.finish.button") : t("coach.next")}
                <span className="grid size-8 place-items-center rounded-full bg-black/10" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] rtl:-scale-x-100"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </button>
            ) : (
              <span className="coach-hint flex items-center gap-2 text-[14px] font-semibold text-[#0E7490]">
                {t("coach.tapHere")}
                <span className="coach-tap size-3 rounded-full bg-[#22D3EE]" aria-hidden />
              </span>
            )}
          </div>
          <div className="mt-3.5 h-[3px] overflow-hidden rounded-full bg-[rgba(11,27,34,.08)]" aria-hidden>
            <span className="block h-full rounded-full bg-[#22D3EE] transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/** The bubble's place on the screen. */
function Dialog({ label, className, children }: { label: string; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useNoScroll(ref);
  return <div ref={ref} role="dialog" aria-label={label} className={`pointer-events-auto absolute inset-x-3 mx-auto max-w-[420px] touch-none ${className}`}>{children}</div>;
}
