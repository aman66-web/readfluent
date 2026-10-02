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
const PAD = 7;

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
  // A step with nothing to light (the hello and the goodbye) is a card in the middle of the screen.
  const centered = !step.target && !step.gesture;
  // The bubble goes where the highlighted part is not: at the top when it is low on the screen, else at the bottom.
  const vw = typeof window === "undefined" ? 390 : window.innerWidth;
  const bubbleTop = box ? top : step.place === "top";
  // Where the bubble's tail points: the middle of what is lit, kept inside the bubble.
  const cardW = Math.min(420, vw - 24);
  const tailX = box ? Math.min(cardW - 30, Math.max(bubbleTop ? 30 : 104, box.x + box.w / 2 - (vw - cardW) / 2)) : 0;
  const hole = box ? { left: box.x - PAD, top: box.y - PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 } : null;
  const pct = ((index + 1) / TOUR.length) * 100;
  const text = t(step.text, { mascot: MASCOT_NAME });
  const nextButton = (
    <button type="button" onClick={next} className="btn-cyan inline-flex h-12 items-center gap-2 rounded-full ps-6 pe-2 text-[15.5px] font-semibold active:scale-[0.98]">
      {last ? t("coach.finish.button") : t("coach.next")}
      <span className="grid size-8 place-items-center rounded-full bg-black/10" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] rtl:-scale-x-100"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </button>
  );
  const skip = (
    <button type="button" onClick={() => finishTour()} className="h-11 rounded-full px-1 text-[14px] font-semibold text-[rgba(11,27,34,.6)] underline decoration-[rgba(11,27,34,.25)] decoration-1 underline-offset-4 active:opacity-60">{t("coach.skip")}</button>
  );
  const steps = (
    <div className="flex items-center justify-center gap-1" aria-hidden>
      {TOUR.map((_, n) => <span key={n} className={`block h-1.5 rounded-full transition-all duration-300 ${n === index ? "w-5 bg-[#22D3EE]" : n < index ? "w-1.5 bg-[#22D3EE]/60" : "w-1.5 bg-[rgba(11,27,34,.14)]"}`} />)}
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      {hole ? (
        <>
          <div className="coach-spot absolute" style={{ ...hole, borderRadius: Math.min(hole.height / 2, 22) }} />
          {/* A step that asks for a tap shows how: a hand that taps the lit part, or, for a bar at the edge of the screen, an arrow that bounces towards it. */}
          {step.point === "hand" && <TapHand x={hole.left + hole.width / 2} y={hole.top + Math.min(hole.height / 2, 110)} />}
          {step.point === "arrow" && (
            <span aria-hidden className="coach-point absolute grid size-11 place-items-center rounded-full bg-accent-bright text-on-cyan shadow-[0_8px_18px_-6px_rgba(0,0,0,.55)] ring-[3px] ring-white"
                  style={{ left: hole.left + hole.width / 2 - 22, top: bubbleTop ? hole.top - 58 : hole.top + hole.height + 12 }}>
              <svg viewBox="0 0 24 24" className={`size-6 ${bubbleTop ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v13M6 13l6 6 6-6" /></svg>
            </span>
          )}
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
          <div className={`coach-dim absolute inset-0 ${step.gesture ? "coach-dim-soft" : ""}`} />
          <Shield className="inset-0" />
          {step.gesture === "swipe" && <SwipeHand />}
        </>
      )}

      {centered ? (
        <Dialog label={t("coach.stepOf", { n: index + 1, total: TOUR.length })} className="top-1/2 -translate-y-[44%]">
          <div key={step.id} className="coach-bubble relative rounded-[32px] bg-white px-6 pb-5 pt-0 text-center text-[#0B1B22]">
            <span className="coach-hero -mt-[76px] mx-auto block w-[148px]"><Mascot mood={step.mood} talking className="w-full" /></span>
            <p className="mt-2 text-[21px] font-semibold leading-[1.25] tracking-[-0.02em]">{text}</p>
            <div className="mt-5 flex justify-center">{nextButton}</div>
            <div className="mt-1.5 flex justify-center">{skip}</div>
            <div className="mt-1.5">{steps}</div>
          </div>
        </Dialog>
      ) : (
        <Dialog label={t("coach.stepOf", { n: index + 1, total: TOUR.length })}
                className={bubbleTop ? "top-[calc(env(safe-area-inset-top)+3.25rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]"}>
          <div key={step.id} className="coach-bubble relative rounded-[28px] bg-white px-5 pb-3.5 pt-4 text-[#0B1B22]">
            {box && <span className={`coach-tail absolute size-4 rotate-45 bg-white ${bubbleTop ? "-bottom-[7px]" : "-top-[7px]"}`} style={{ left: tailX - 8 }} aria-hidden />}
            <div className="flex items-start gap-3.5">
              <span className="-mt-12 block w-[76px] shrink-0"><Mascot mood={step.mood} talking className="w-full" /></span>
              <p className="min-w-0 flex-1 pt-0.5 text-[16.5px] font-medium leading-[1.32] tracking-[-0.012em]">{text}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              {skip}
              {step.mode === "next" ? nextButton : (
                <span className="coach-hint flex items-center gap-2 text-[14px] font-semibold text-[#0E7490]">
                  {t("coach.tapHere")}
                  <span className="coach-tap size-3 rounded-full bg-[#22D3EE]" aria-hidden />
                </span>
              )}
            </div>
            <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-[rgba(11,27,34,.08)]" aria-hidden>
              <span className="block h-full rounded-full bg-[#22D3EE] transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/** A hand that taps the spot (the fingertip is at x, y): it presses down, and rings spread out from where it lands. */
function TapHand({ x, y }: { x: number; y: number }) {
  const SIZE = 56;
  return (
    <div aria-hidden className="absolute" style={{ left: x, top: y }}>
      <span className="coach-ring absolute -ms-6 -mt-6 block size-12 rounded-full" />
      <span className="coach-ring coach-ring-2 absolute -ms-6 -mt-6 block size-12 rounded-full" />
      <span className="coach-hand absolute block" style={{ width: SIZE, height: SIZE, left: -SIZE * (8 / 24), top: -SIZE * (2.2 / 24) }}>
        <HandIcon />
      </span>
    </div>
  );
}

/** A hand that swipes from the right to the left across the middle of the page, as a reader's thumb does to turn it. */
function SwipeHand() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-[30%] flex justify-center">
      <span className="coach-swipe block">
        <span className="coach-trail absolute end-full top-6 me-1 block h-1.5 w-24 rounded-full" />
        <span className="block size-14"><HandIcon /></span>
      </span>
    </div>
  );
}

/** A pointing hand, white with a dark edge so it shows on the dim and on a page alike. */
function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-full drop-shadow-[0_6px_8px_rgba(0,0,0,.45)]" fill="#fff" stroke="#0B1B22" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V10a2 2 0 0 0-2-2 2 2 0 0 0-2 2V9a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1.5V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v10l-1.4-1.9a2 2 0 0 0-2.8-.1 2 2 0 0 0 0 2.8l3.6 3.6C9 19.9 10.8 21 13.5 21h.5a8 8 0 0 0 8-8v-2a2 2 0 0 0-4 0Z" />
    </svg>
  );
}

/** The bubble's place on the screen. */
function Dialog({ label, className, children }: { label: string; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useNoScroll(ref);
  return <div ref={ref} role="dialog" aria-label={label} className={`pointer-events-auto absolute inset-x-3 mx-auto max-w-[420px] touch-none ${className}`}>{children}</div>;
}
