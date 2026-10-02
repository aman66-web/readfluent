"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { APP_NAME, MASCOT_NAME } from "@/lib/brand";
import { useLocale, useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { HEARD_IDS, HEARD_OTHER_MAX, type HeardId } from "@/lib/onboarding/answers";
import { GuideFrame, GuideHead, Said, splitWords, useGuide } from "./Guide";
import { Mascot, type Mood } from "@/components/mascot/Mascot";
import { QUESTION_STEPS } from "@/lib/onboarding/steps";

/** The props every screen gets from the run: where it is, and the two ways to move. */
interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/* ── hello ───────────────────────────────────────────────────────────────── */

/**
 * The screen after "Get started": the guide says hello — Dewey, the mascot,
 * large in the middle of the white, and what it is saying set large under it.
 */
/**
 * Dewey in the middle of a bare screen, a speech bubble over its head, and (under it) a quieter
 * line. The words of the bubble arrive one by one and Dewey's mouth moves while they do. Just a
 * back arrow and Continue: nothing else on the screen to look at but Dewey.
 */
function MascotSays({ at, of, line, sub, mood, onBack, onContinue }: Nav & { line: string; sub: string; mood: Mood }) {
  const guide = useGuide(`${line} ${sub}`);
  const lineMs = Math.round(guide.perWordMs * splitWords(line, useLocale()).words.length);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} progress={false}>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center pb-10 text-center">
        <div className="wel-in relative w-full max-w-[19.5rem] rounded-[24px] border-2 border-[var(--ob-line)] bg-white px-5 py-4 shadow-[0_8px_24px_-16px_rgba(8,47,62,.4)]" style={{ animationDelay: "250ms" }}>
          <Said line={line} durationMs={lineMs} className="text-[22px] font-medium leading-[1.25] tracking-[-0.015em]" />
          <span className="absolute -bottom-[10px] start-1/2 size-[18px] -translate-x-1/2 rotate-45 border-b-2 border-e-2 border-[var(--ob-line)] bg-white rtl:translate-x-1/2" aria-hidden />
        </div>
        <Mascot mood={mood} talking={guide.talking} className="mt-3 w-[min(62vw,250px)]" />
        <p className="wel-in ob-muted mt-3 max-w-[19rem] text-[16px] leading-snug" style={{ animationDelay: `${lineMs + 200}ms` }}>{sub}</p>
      </div>
    </GuideFrame>
  );
}

/** Right after "Get started": Dewey waves and says hello. */
export function HelloScreen(nav: Nav) {
  const t = useT();
  return <MascotSays {...nav} mood="hello" line={t("hello.bubble", { app: APP_NAME, name: MASCOT_NAME })} sub={t("hello.sub")} />;
}

/** Then Dewey says how quick the questions are: the number is the number of screens that ask something. */
export function QuickScreen(nav: Nav) {
  const t = useT();
  return <MascotSays {...nav} mood="ready" line={t("quick.bubble", { n: QUESTION_STEPS.length })} sub={t("quick.sub")} />;
}

/* ── go ─────────────────────────────────────────────────────────────────── */

/** How long Dewey celebrates before the run moves on by itself. */
const GO_MS = 2600;

/** Confetti: where each piece flies to (px from Dewey), how it turns, its colour and when it leaves. */
const CONFETTI = [
  { x: -120, y: -150, r: -200, c: "var(--ob-cyan)", d: 480 }, { x: -70, y: -190, r: 140, c: "var(--ob-deep)", d: 520 },
  { x: -20, y: -210, r: -90, c: "var(--ob-cyan2)", d: 460 }, { x: 40, y: -200, r: 220, c: "var(--ob-teal)", d: 540 },
  { x: 95, y: -170, r: -160, c: "var(--ob-cyan)", d: 500 }, { x: 135, y: -120, r: 120, c: "var(--ob-deep)", d: 560 },
  { x: -150, y: -80, r: 180, c: "var(--ob-teal)", d: 600 }, { x: 150, y: -70, r: -240, c: "var(--ob-cyan2)", d: 620 },
  { x: -95, y: -120, r: 260, c: "var(--ob-cyan2)", d: 580 }, { x: 70, y: -140, r: -120, c: "var(--ob-cyan)", d: 640 },
  { x: -45, y: -150, r: 100, c: "var(--ob-teal)", d: 690 }, { x: 10, y: -170, r: -300, c: "var(--ob-deep)", d: 660 },
  { x: 110, y: -40, r: 200, c: "var(--ob-cyan)", d: 720 }, { x: -125, y: -30, r: -180, c: "var(--ob-deep)", d: 700 },
] as const;

/**
 * After "just N quick questions" Dewey celebrates: a jump and a spin, confetti, "Let's go!" in a
 * bubble. Then the run moves on by itself to the first question; there is nothing to press.
 */
export function GoScreen({ at, of, onBack, onContinue }: Nav) {
  const t = useT();
  const next = useRef(onContinue);
  useEffect(() => { next.current = onContinue; });
  useEffect(() => {
    const id = window.setTimeout(() => next.current(), GO_MS);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} progress={false} showContinue={false}>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center pb-10 text-center" aria-live="polite">
        <p className="go-pop relative rounded-[24px] border-2 border-[var(--ob-line)] bg-white px-7 py-3 text-[28px] font-semibold tracking-[-0.02em] shadow-[0_8px_24px_-16px_rgba(8,47,62,.4)]">
          {t("go.bubble")}
          <span className="absolute -bottom-[10px] start-1/2 size-[18px] -translate-x-1/2 rotate-45 border-b-2 border-e-2 border-[var(--ob-line)] bg-white rtl:translate-x-1/2" aria-hidden />
        </p>
        <div className="relative mt-4 w-[min(62vw,250px)]">
          <div className="pointer-events-none absolute start-1/2 top-[45%]" aria-hidden>
            {CONFETTI.map((c, n) => (
              <span key={n} className="go-bit" style={{ "--x": `${c.x}px`, "--y": `${c.y}px`, "--r": `${c.r}deg`, background: c.c, animationDelay: `${c.d}ms` } as React.CSSProperties} />
            ))}
          </div>
          <div className="go-lex"><Mascot mood="cheer" className="w-full" /></div>
        </div>
      </div>
    </GuideFrame>
  );
}

/* ── heard ───────────────────────────────────────────────────────────────── */

/**
 * "How did you hear about ReadFluent?" — the guide's second question. The answers
 * are chips that wrap, so all eleven fit on one screen of a small phone and the
 * question never scrolls away from its answers. One is picked; Continue waits for
 * it. "Somewhere else" opens a box to say where, which can be left empty.
 */
export function HeardScreen({ at, of, value, other, onPick, onOther, onBack, onContinue }: Nav & {
  value: HeardId | null;
  /** What was typed for "somewhere else". */
  other: string;
  onPick: (h: HeardId) => void;
  onOther: (text: string) => void;
}) {
  const t = useT();
  const line = t("heard.line", { app: APP_NAME });
  const guide = useGuide(line);
  const box = useRef<HTMLInputElement>(null);
  const asking = value === "other";
  // Straight to the box once "somewhere else" is picked. Not on arriving with it
  // already picked (Back from the next screen): a keyboard nobody asked for.
  const picked = useRef(false);
  useEffect(() => {
    if (asking && picked.current) box.current?.focus({ preventScroll: true });
    picked.current = false;
  }, [asking]);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={value !== null}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} />

        <div className="mt-8 flex flex-wrap gap-2.5" role="group" aria-label={line}>
          {HEARD_IDS.map((id, i) => {
            const on = value === id;
            const { icon, label } = CHANNELS[id];
            const name = typeof label === "string" && label.includes(".") ? t(label as MessageId) : label;
            return (
              <button key={id} type="button" aria-pressed={on}
                      onClick={() => { picked.current = id === "other" && !on; onPick(id); }}
                      className={`guide-card guide-chip wel-in relative flex h-12 items-center gap-2.5 rounded-full ps-3.5 pe-5 text-[15px] font-semibold ${on ? "guide-card-on" : ""}`}
                      style={{ animationDelay: `${800 + i * 45}ms` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="guide-chip-icon size-[19px] shrink-0" aria-hidden>{icon}</svg>
                {name}
              </button>
            );
          })}
        </div>

        {asking && (
          <input
            ref={box}
            type="text"
            value={other}
            onChange={(e) => onOther(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            maxLength={HEARD_OTHER_MAX}
            placeholder={t("heard.where")}
            aria-label={t("heard.whereLabel")}
            enterKeyHint="done"
            autoComplete="off"
            /* 16px so iOS does not zoom the field on focus. */
            className="heard-box mt-4 h-[52px] w-full shrink-0 rounded-full bg-[var(--ob-card)] px-5 text-[16px] font-semibold outline-none ring-1 ring-inset ring-[var(--ob-line)] placeholder:font-normal placeholder:text-[var(--ob-faint)] focus:ring-2 focus:ring-[var(--ob-teal)]"
          />
        )}
      </div>
    </GuideFrame>
  );
}

/* Each channel: a small plain glyph (not the company's logo) and its name. */
/* A brand's name is the brand's own and stays as it is; a message id (it has a dot) is translated. */
const CHANNELS: Record<HeardId, { icon: ReactNode; label: string }> = {
  tiktok: { label: "TikTok", icon: <><path d="M9 18.5V6l10-2v12" /><circle cx="6.5" cy="18.5" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></> },
  instagram: { label: "Instagram", icon: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.6" cy="7.4" r=".6" fill="currentColor" /></> },
  youtube: { label: "YouTube", icon: <><rect x="3" y="5.5" width="18" height="13" rx="3.5" /><path d="M10.5 9.5v5l4.2-2.5z" fill="currentColor" /></> },
  friend: { label: "heard.friend", icon: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M16 14.2a4.5 4.5 0 0 1 4.5 4.8" /></> },
  appstore: { label: "App Store", icon: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></> },
  search: { label: "heard.search", icon: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></> },
  x: { label: "X", icon: <path d="M5 5l14 14M19 5L5 19" /> },
  facebook: { label: "Facebook", icon: <><path d="M7.5 11H4.5v9h3z" /><path d="M7.5 11l3.8-6.8c1.6 0 2.6 1.2 2.1 2.9L12.6 10H18a2 2 0 0 1 2 2.3l-1.1 5.9A2.2 2.2 0 0 1 16.7 20H7.5" /></> },
  reddit: { label: "Reddit", icon: <path d="M5 5.5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-8l-4.5 3.5V17H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z" /> },
  ad: { label: "heard.ad", icon: <><path d="M4 10v4h3l7 4V6l-7 4z" /><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5" /></> },
  other: { label: "heard.other", icon: <><circle cx="6" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18" cy="12" r="1.3" fill="currentColor" /></> },
};

