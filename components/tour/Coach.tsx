"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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

/** The part of the screen a step points at, measured again as the page moves; null if it is not (yet) on screen. */
function useTargetBox(target: string | undefined, active: boolean): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    if (!active || !target) return;
    let scrolled = false;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      if (!el) { setBox((b) => (b === null ? b : null)); return; }
      if (!scrolled) { scrolled = true; el.scrollIntoView({ block: "center", behavior: "smooth" }); }
      const r = el.getBoundingClientRect();
      setBox((b) => (b && Math.abs(b.x - r.left) < 1 && Math.abs(b.y - r.top) < 1 && Math.abs(b.w - r.width) < 1 && Math.abs(b.h - r.height) < 1 ? b : { x: r.left, y: r.top, w: r.width, h: r.height }));
    };
    measure();
    const id = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => { window.clearInterval(id); window.removeEventListener("resize", measure); };
  }, [target, active]);
  return active && target ? box : null;
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
  const box = useTargetBox(step?.target, step !== null);
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
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const top = box ? box.y + box.h / 2 > vh * 0.5 : false;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      {box ? (
        <div className="coach-spot absolute rounded-[24px] ring-[3px] ring-accent-bright"
             style={{ left: box.x - PAD, top: box.y - PAD, width: box.w + PAD * 2, height: box.h + PAD * 2, boxShadow: "0 0 0 9999px rgba(8,47,60,.62)" }} />
      ) : (
        <div className="absolute inset-0 bg-[rgba(8,47,60,.62)]" />
      )}

      <div role="dialog" aria-label={t("coach.stepOf", { n: index + 1, total: TOUR.length })}
           className={`pointer-events-auto absolute inset-x-3 mx-auto max-w-[420px] ${top ? "top-[calc(env(safe-area-inset-top)+3.25rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]"}`}>
        <div className="coach-bubble relative flex items-start gap-3 rounded-[26px] bg-background p-4 shadow-[0_24px_50px_-18px_rgba(0,0,0,.6)]">
          <span className="-mt-9 block w-[68px] shrink-0"><Mascot mood={step.mood} talking className="w-full" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-semibold leading-snug">{t(step.text, { mascot: MASCOT_NAME })}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => finishTour()} className="h-10 rounded-full px-3 text-[13px] font-semibold text-muted active:bg-border/60">{t("coach.skip")}</button>
              {step.mode === "next" ? (
                <button type="button" onClick={next} className="h-11 rounded-full bg-accent px-6 text-[14.5px] font-bold text-white shadow-[0_10px_18px_-10px_rgba(14,116,144,.8)] active:opacity-90">
                  {last ? t("coach.finish.button") : t("coach.next")}
                </button>
              ) : (
                <span className="coach-hint text-[13px] font-bold text-accent">{t("coach.tapHere")}</span>
              )}
            </div>
            <div className="mt-2.5 flex gap-1" aria-hidden>
              {TOUR.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-accent-bright" : "bg-border"}`} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
