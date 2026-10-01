"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DotNumber } from "@/components/DotMatrix";
import { ART, ArtDefs } from "@/components/welcome/art";
import { APP_NAME } from "@/lib/brand";
import { languageName } from "@/lib/i18n";
import { formatReadingTime } from "@/lib/i18n/format";
import { useLocale, useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { HEARD_IDS, HEARD_OTHER_MAX, WHY_IDS, type HeardId, type WhyId } from "@/lib/onboarding/answers";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { SCROLL_HOURS, SCROLL_IDS, SWAP_MINUTES, scrollDaysAYear, type ScrollId } from "@/lib/onboarding/firstrun";
import { useCountUp } from "./count";
import { GuideFrame, GuideHead, Said, useGuide } from "./Guide";
import { GuideBook } from "./GuideBook";
import { TickIcon } from "./ui";

/** The props every screen gets from the run: where it is, and the two ways to move. */
interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/* ── hello ───────────────────────────────────────────────────────────────── */

/**
 * The screen after "Get started": the guide says hello — the living book
 * large in the middle of the white, and what it is saying set large under it.
 */
export function HelloScreen({ at, of, onBack, onContinue }: Nav) {
  const t = useT();
  const line = t("hello.line", { app: APP_NAME });
  const sub = t("hello.sub");
  const guide = useGuide(`${line} ${sub}`);
  const lineMs = Math.round(guide.perWordMs * line.split(/\s+/).length);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center pb-6 text-center">
        <GuideBook talking={guide.talking} className="w-[min(70vw,290px)]" />
        <p className="ed-serif ob-muted mt-8 text-[15px] italic">{t("guide.name")}</p>
        <Said line={line} durationMs={lineMs} className="mt-2 max-w-[20rem] text-[34px] font-light leading-[1.15] tracking-[-0.025em]" />
        <p className="wel-in ob-muted mt-3 max-w-[19rem] text-[17px] leading-snug" style={{ animationDelay: `${lineMs}ms` }}>{sub}</p>
      </div>
    </GuideFrame>
  );
}

/* ── why ────────────────────────────────────────────────────────────────── */

/**
 * "Why are you learning {language}?" — the guide asks, small beside the question, and
 * eight cards answer: friends and family, travel, work, study, moving abroad, books
 * and films, fun, or something else (just "Other": nothing more is asked). Each card
 * carries a small picture. Any number can be ticked, and a second tap unticks;
 * Continue waits for at least one. The answers shape the promises on the screen that
 * shows where their daily time takes them.
 */
export function WhyScreen({ at, of, learn, value, onToggle, onBack, onContinue }: Nav & {
  learn: LanguageCode | null;
  value: readonly WhyId[];
  onToggle: (w: WhyId) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const line = t("why.line", { language: languageName(learn ?? "en", locale) });
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={value.length > 0}>
      {/* The pieces' gradients, defined once for the pictures. */}
      <svg width={0} height={0} className="absolute" aria-hidden><defs><ArtDefs /></defs></svg>
      <div className="focus-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead key={line} guide={guide} line={line} sub={t("why.sub")} />

        <div className="mt-5 grid grid-cols-2 gap-2.5" role="group" aria-label={line}>
          {WHY_IDS.map((id, i) => {
            const on = value.includes(id);
            return (
              <button key={id} type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(id)}
                      className={`guide-card wel-in relative flex flex-col overflow-hidden rounded-[20px] text-start ${on ? "guide-card-on" : ""}`}
                      style={{ animationDelay: `${850 + i * 70}ms` }}>
                <span className="block aspect-[16/9] w-full" style={{ background: PICTURES[id].bg, ["--ink" as string]: "#EAFBFF", ["--paper" as string]: "#F1FAFC" }}>
                  <svg viewBox="0 0 200 112" className="block size-full" preserveAspectRatio="xMidYMid slice">{PICTURES[id].pieces}</svg>
                </span>
                <span className="flex min-h-[54px] items-center gap-2 px-3 py-2 text-[14px] font-semibold leading-[1.2]">
                  <span className="flex-1">{t(`why.${id}`)}</span>
                  <span className={`guide-tick grid size-5 shrink-0 place-items-center rounded-full ${on ? "guide-tick-on" : ""}`} aria-hidden>{TickIcon}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </GuideFrame>
  );
}

/** One of the art pieces, placed — inside a group of its own motion, if it has one. */
const piece = (id: string, x: number, y: number, s = 1, r = 0, fx = ""): ReactNode => {
  const draw = ART[id];
  if (!draw) return null;
  const placed = <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>{draw()}</g>;
  return fx ? <g key={`${id}${x}${y}`} className={fx}>{placed}</g> : <g key={`${id}${x}${y}`}>{placed}</g>;
};

/** Specks of light drifting up through a card. */
function Motes({ n = 7 }: { n?: number }) {
  return (
    <g aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} className="fx-mote" cx={24 + ((i * 53) % 152)} cy={130} r={1.1 + (i % 3) * 0.5} fill="#67E8F9"
                style={{ animationDelay: `${(i * 0.73) % 4.4}s`, animationDuration: `${4.2 + (i % 4) * 0.7}s` }} />
      ))}
    </g>
  );
}

/** Four-pointed glints that come and go. */
function Glints({ at }: { at: readonly (readonly [number, number, number])[] }) {
  return (
    <g aria-hidden>
      {at.map(([x, y, r], i) => (
        <path key={i} className="fx-glint" d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`}
              fill="#E6FBFF" style={{ animationDelay: `${i * 0.55}s` }} />
      ))}
    </g>
  );
}

/** Two speech bubbles, one with a heart in it: people talking. */
function Chat() {
  return (
    <g>
      <g transform="translate(74 48) rotate(-5)" className="fx-float">
        <path d="M-32 -20 H32 A12 12 0 0 1 44 -8 V8 A12 12 0 0 1 32 20 H-18 L-34 34 V20 H-32 A12 12 0 0 1 -44 8 V-8 A12 12 0 0 1 -32 -20 Z" fill="#F1FAFC" />
        <g stroke="#0E7490" strokeWidth="4" strokeLinecap="round" opacity=".45"><path d="M-28 -5 H22" /><path d="M-28 6 H8" /></g>
      </g>
      <g transform="translate(128 66) rotate(4)" className="fx-breathe">
        <path d="M-28 -17 H28 A12 12 0 0 1 40 -5 V7 A12 12 0 0 1 28 19 H22 V32 L8 19 H-28 A12 12 0 0 1 -40 7 V-5 A12 12 0 0 1 -28 -17 Z" fill="url(#rf-cy)" />
        <path d="M0 9 C-14 -1 -12 -13 -5 -13 C-2 -13 0 -11 0 -8 C0 -11 2 -13 5 -13 C12 -13 14 -1 0 9 Z" fill="#fff" />
      </g>
    </g>
  );
}

/* The eight pictures, each a small scene from the reason it stands for. They sit in a
   200×112 frame, centred on (100, 56). */
const GLOW = (y = 56, s = 0.5) => piece("glowCyan", 100, y, s);
const PICTURES: Record<WhyId, { bg: string; pieces: ReactNode[] }> = {
  friends: { bg: "linear-gradient(160deg, #164E63, #0A1E28)", pieces: [
    GLOW(), <Motes key="m" n={5} />, <Chat key="chat" />,
    <Glints key="g" at={[[44, 24, 3.6], [160, 28, 3], [150, 92, 3.2]]} />,
  ] },
  travel: { bg: "linear-gradient(160deg, #0E7490, #082F3E)", pieces: [
    GLOW(), <Motes key="m" n={5} />, piece("compass", 100, 58, 0.78, 0, "fx-breathe"), piece("needle", 100, 58, 0.78, 38, "fx-rock"),
    <Glints key="g" at={[[40, 26, 4], [162, 34, 3.2], [158, 92, 3.6]]} />,
  ] },
  work: { bg: "linear-gradient(160deg, #1B2250, #0D1030)", pieces: [
    GLOW(), <Motes key="m" n={5} />, piece("stack", 100, 60, 0.74, 0, "fx-float"),
    <Glints key="g" at={[[38, 26, 3.6], [166, 30, 3], [34, 92, 2.8]]} />,
  ] },
  study: { bg: "linear-gradient(160deg, #0B3B4A, #061A22)", pieces: [
    piece("glowLamp", 100, 54, 0.6), <Motes key="m" n={5} />, piece("lamp", 100, 58, 0.62, 0, "fx-breathe"),
    <Glints key="g" at={[[40, 28, 3.6], [164, 34, 3], [158, 92, 3]]} />,
  ] },
  abroad: { bg: "linear-gradient(160deg, #0E7490, #082F3E)", pieces: [
    GLOW(), <Motes key="m" n={5} />, piece("orbit", 100, 57, 0.62, 0, "fx-breathe"), piece("globe", 100, 57, 0.52, 0, "fx-float"),
    <Glints key="g" at={[[40, 26, 4], [162, 34, 3.2], [154, 92, 3.6]]} />,
  ] },
  culture: { bg: "linear-gradient(160deg, #2A1B5A, #120A30)", pieces: [
    GLOW(), <Motes key="m" n={6} />, piece("frame", 100, 60, 0.6, -4, "fx-rock"), piece("sparkles", 100, 56, 0.62),
    <Glints key="g" at={[[36, 26, 3.6], [168, 30, 3], [30, 92, 2.8]]} />,
  ] },
  fun: { bg: "linear-gradient(160deg, #0E7490, #0A3B52)", pieces: [
    GLOW(), <Motes key="m" n={5} />, piece("whale", 98, 58, 0.5, 0, "fx-float"), piece("waves", 100, 86, 0.9),
    <Glints key="g" at={[[44, 26, 3.6], [160, 26, 3], [158, 74, 3]]} />,
  ] },
  other: { bg: "linear-gradient(160deg, #164E63, #0A1E28)", pieces: [
    piece("glowPale", 100, 56, 0.45), <Motes key="m" n={5} />,
    <g key="dots" fill="#EAFBFF" className="fx-breathe"><circle cx="76" cy="58" r="5.5" /><circle cx="100" cy="58" r="5.5" /><circle cx="124" cy="58" r="5.5" /></g>,
    <Glints key="g" at={[[44, 28, 3.6], [162, 32, 3.2], [150, 90, 3]]} />,
  ] },
};

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

        <div className="mt-8 flex flex-wrap gap-2.5" role="radiogroup" aria-label={line}>
          {HEARD_IDS.map((id, i) => {
            const on = value === id;
            const { icon, label } = CHANNELS[id];
            const name = typeof label === "string" && label.includes(".") ? t(label as MessageId) : label;
            return (
              <button key={id} type="button" role="radio" aria-checked={on}
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

/* ── scroll and mirror ───────────────────────────────────────────────────── */

/** "How long do you spend scrolling each day?" — four answers, one picked. */
export function ScrollScreen({ at, of, value, onPick, onBack, onContinue }: Nav & {
  value: ScrollId | null;
  onPick: (s: ScrollId) => void;
}) {
  const t = useT();
  const line = t("scroll.line");
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={value !== null}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} sub={t("scroll.sub")} />
        <div className="mt-7 flex flex-col gap-2.5" role="radiogroup" aria-label={line}>
          {SCROLL_IDS.map((id, i) => {
            const on = value === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onPick(id)}
                      className={`guide-card wel-in relative flex h-[62px] items-center gap-4 rounded-[20px] px-5 text-start ${on ? "guide-card-on" : ""}`}
                      style={{ animationDelay: `${850 + i * 80}ms` }}>
                <span className="flex-1 text-[16px] font-semibold">{t(`scroll.${id}`)}</span>
                {/* How much of the day it is: a meter that grows with the answer. */}
                <span className="guide-track relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full" aria-hidden>
                  <span className="scroll-fill absolute inset-y-0 start-0 rounded-full"
                        style={{ width: `${(SCROLL_HOURS[id] / SCROLL_HOURS["4plus"]) * 100}%`, animationDelay: `${1000 + i * 80}ms` }} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </GuideFrame>
  );
}

/**
 * The mirror: what their scrolling adds up to over a year, as a field of lamps, and
 * what a sliver of it would be as reading instead. Every number is arithmetic on
 * what they said (lib/onboarding/firstrun.ts).
 */
export function MirrorScreen({ at, of, scroll, onBack, onContinue }: Nav & { scroll: ScrollId | null }) {
  const t = useT();
  const locale = useLocale();
  const days = scroll ? scrollDaysAYear(scroll) : 0;
  const swap = t("mirror.swap", { minutes: SWAP_MINUTES, app: APP_NAME });
  const line = days ? t("mirror.days", { days }) : swap;
  const guide = useGuide(line);
  const shown = useCountUp(days, 1500, 900);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 pt-5">
        <GuideHead guide={guide} line={line} />

        {days > 0 && (
          <div className="mt-7">
            <div className="flex items-end gap-3">
              <DotNumber value={shown} cell={11} color="#0E7490" glow={false} field fieldColor="rgba(14,116,144,.08)" label={String(days)} />
              <p className="ob-muted pb-1 text-[14px] font-semibold leading-tight">{t("mirror.daysLabel")}</p>
            </div>
            <Year lit={days} />
          </div>
        )}

        {/* The swap, a beat after the year has filled. */}
        <div className="wel-in guide-card relative mt-6 rounded-[22px] p-5" style={{ animationDelay: days ? "2700ms" : "900ms" }}>
          <p className="text-[17px] font-semibold leading-snug">{swap}</p>
          <p className="ob-muted mt-2 text-[15px] leading-snug">{t("mirror.reading", { time: formatReadingTime(365 * SWAP_MINUTES, locale) })}</p>
        </div>
      </div>
    </GuideFrame>
  );
}

/**
 * A year of days as a field of lamps, one for every day. The first `lit` light one
 * after another, all of them inside about a second and a half.
 */
function Year({ lit }: { lit: number }) {
  const cols = 25;
  const rows = Math.ceil(365 / cols);
  const pitch = 10;
  const r = 3.3;
  const pace = 1500 / Math.max(1, lit);
  return (
    <svg viewBox={`0 0 ${cols * pitch} ${rows * pitch}`} className="mt-5 block w-full" aria-hidden>
      {Array.from({ length: 365 }, (_, i) => {
        const x = (i % cols) * pitch + pitch / 2;
        const y = Math.floor(i / cols) * pitch + pitch / 2;
        const on = i < lit;
        return (
          <circle key={i} cx={x} cy={y} r={r} className={on ? "year-lit" : undefined}
                  fill={on ? "#0891B2" : "rgba(11,27,34,.1)"} style={on ? { animationDelay: `${900 + i * pace}ms` } : undefined} />
        );
      })}
    </svg>
  );
}
