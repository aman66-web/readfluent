"use client";

import { DotNumber } from "@/components/DotMatrix";
import { CATEGORIES, type CategoryId } from "@/lib/content/limits";
import { formatList, languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { hasPlacement } from "@/lib/placement";
import type { Cefr } from "@/lib/xp/levels";
import { useStagedCount } from "./count";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import { PrimaryButton, TickIcon } from "./ui";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * How "Building your library…" fills: about seven seconds, in uneven stretches that
 * slow and pause just before each line is ticked (at 22, 44, 66 and 88), so it
 * reads as work being done.
 */
const BUILDING: readonly (readonly [number, number])[] = [
  [12, 520], [20, 680], [22, 420],
  [35, 560], [42, 640], [44, 460],
  [57, 520], [64, 700], [66, 420],
  [79, 560], [86, 620], [88, 480],
  [96, 540], [100, 420],
];

/* ── the shelf ──────────────────────────────────────────────────────────────
   Two shelves of books standing up as the library is built, one book at a time, in the
   colours of the shelves the reader picked (every shelf when they picked none). Which
   book is next follows the percentage, so what is drawn is how far along it is. */

const WIDTHS = [20, 26, 18, 28, 22, 19, 26, 23, 18, 25, 21, 24, 19, 27, 21, 18, 25, 22, 28, 19, 23, 20] as const;
const HEIGHTS = [58, 70, 52, 74, 62, 56, 72, 64, 50, 68, 60, 66, 54, 72, 58, 62, 70, 52, 66, 60, 74, 56] as const;
const PER_ROW = 11;
/** The one book that is lit: where they will start. */
const LIT = 7;

function layout() {
  const out: { x: number; row: 0 | 1; w: number; h: number }[] = [];
  for (const row of [0, 1] as const) {
    let x = 22;
    for (let k = 0; k < PER_ROW; k++) {
      const i = row * PER_ROW + k;
      out.push({ x, row, w: WIDTHS[i], h: HEIGHTS[i] });
      x += WIDTHS[i] + 2.4;
    }
  }
  return out;
}
const BOOKS = layout();

function Shelf({ hues, pct }: { hues: readonly number[]; pct: number }) {
  const shown = Math.min(BOOKS.length, Math.floor((pct / 100) * BOOKS.length * 1.06));
  const done = pct >= 100;
  const board = (y: number) => <rect x="8" y={y} width="304" height="9" rx="4.5" fill="#0E7490" opacity=".9" />;
  return (
    <svg viewBox="0 0 320 196" className="mx-auto block h-[158px] w-full overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="rs-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#22D3EE" stopOpacity=".42" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="100" rx="170" ry="96" fill="url(#rs-glow)" style={{ opacity: 0.25 + 0.75 * (pct / 100), transition: "opacity .6s" }} />
      {BOOKS.map((b, i) => {
        const base = b.row === 0 ? 90 : 180;
        const hue = hues[i % hues.length];
        const lit = i === LIT && done;
        const body = lit ? "#22D3EE" : `hsl(${hue} 52% ${34 + (i % 4) * 4}%)`;
        const band = lit ? "#E6FBFF" : `hsl(${hue} 62% 70%)`;
        return (
          <g key={i} className={`shelf-book ${i < shown ? "shelf-book-in" : ""}`} style={{ ["--r" as string]: `${i % 7 === 3 ? -7 : 0}deg`, transitionDelay: `${(i % PER_ROW) * 25}ms` }}>
            <rect x={b.x} y={base - b.h} width={b.w} height={b.h} rx="2.5" fill={body} />
            <rect x={b.x} y={base - b.h + 8} width={b.w} height="3" fill={band} opacity=".85" />
            <rect x={b.x} y={base - 14} width={b.w} height="2.4" fill={band} opacity=".55" />
            <rect x={b.x + 3} y={base - b.h + 18} width={Math.max(4, b.w - 12)} height="2.2" rx="1.1" fill="#fff" opacity=".4" />
          </g>
        );
      })}
      {board(90)}
      {board(180)}
      {/* Once it is built, the shelf shines and a few sparks go up. */}
      {done && (
        <g>
          <rect className="ready-sheen" x="8" y="14" width="40" height="176" fill="#fff" opacity=".35" transform="skewX(-16)" />
          {[[44, 28, 5], [160, 10, 4], [286, 32, 5], [236, 6, 3.5]].map(([x, y, r], i) => (
            <path key={i} className="gb-spark" style={{ animationDelay: `${i * 0.4}s` }} fill="#7DE3F4"
                  d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} />
          ))}
        </g>
      )}
    </svg>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[19px]" aria-hidden><path d={d} /></svg>
);
const ICONS = [
  "M4 20V6a2 2 0 0 1 2-2h3v16M9 20V4h4v16M13 20l4-15 3 .8-4 14.4z",   // books on a shelf
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01", // a target
  "M8 12V6.5a1.7 1.7 0 0 1 3.4 0V11M11.4 10a1.7 1.7 0 0 1 3.4.4M14.8 10.8a1.7 1.7 0 0 1 3.2.8V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.7-2.3L4 15.6a1.6 1.6 0 0 1 2.4-2L8 15", // a tapping hand
  "M3 8h14v11H3zM7 4h14v11M7 12h6",                                       // cards
] as const;

/**
 * "Building your library…" — what they chose, built in front of them: a bookshelf filling
 * in the colours of their shelves, four things being set up and ticked off, and, when it is
 * done, their level, daily time and language as a plan they can see. Then the way in.
 */
export function ReadyScreen({ at, of, interests, minutes, level, learn, onTest, onBack, onContinue }: Nav & {
  interests: readonly CategoryId[];
  minutes: number;
  level: Cefr | null;
  learn: LanguageCode | null;
  /** Opens the level test, for a reader who would rather be placed than keep the level they picked. */
  onTest: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const pct = useStagedCount(BUILDING, 500);
  const done = pct >= 100;
  const line = done ? t("ready.done") : t("ready.building");
  const guide = useGuide(line);
  const picked = interests.length ? interests : CATEGORIES.map((c) => c.id);
  const hues = picked.map((id) => CATEGORIES.find((c) => c.id === id)?.hue ?? 195);
  const names = formatList(interests.slice(0, 2).map((id) => t(`cat.${id}`)), locale);
  const more = interests.length - 2;
  const shelves = interests.length === 0 ? t("ready.every") : more > 0 ? t("ready.shelvesMore", { names, more }) : t("ready.shelves", { names });
  const items = [shelves, t("ready.goal", { minutes }), t("ready.words"), t("ready.cards")];
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={done} continueLabel={t("ready.start")} showContinue={!done || !hasPlacement(learn)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-4">
        <GuideHead key={line} guide={guide} line={line} mood="cheer" />

        <div className="mt-3" dir="ltr"><Shelf hues={hues} pct={pct} /></div>

        {/* While it builds, how far along; once built, the plan it was built from. */}
        <div className="mt-2 min-h-10 shrink-0">
          {done ? (
            <ul className="wel-in flex flex-wrap items-center justify-center gap-2">
              {[
                level ? `${level} · ${t(`levelname.${level}`)}` : null,
                t("daily.minutesLabel", { minutes }),
                learn ? languageName(learn, locale) : null,
              ].filter((c): c is string => c !== null).map((chip) => (
                <li key={chip} className="guide-card relative inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold">{chip}</li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3" dir="ltr">
              <div className="guide-track h-2 flex-1 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={line}>
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#67E8F9,#22D3EE,#0E7490)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <span className="flex items-end gap-0.5">
                <DotNumber value={pct} cell={4} color="#0E7490" glow={false} label={`${pct}%`} />
                <span className="ob-muted pb-px text-[11px] font-bold">%</span>
              </span>
            </div>
          )}
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {items.map((text, i) => {
            const shown = pct >= 12 + i * 22;
            const ticked = pct >= 22 + i * 22;
            return (
              <li key={i} className={`guide-card relative flex min-h-[74px] flex-col justify-between gap-1.5 rounded-[18px] p-3 transition-[opacity,transform] duration-500 ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${ticked ? "guide-card-on" : ""}`}>
                <span className="flex items-center justify-between">
                  <span className={`grid size-8 place-items-center rounded-full transition-colors duration-300 ${ticked ? "bg-[var(--ob-teal)] text-white" : "bg-black/[0.06] text-[var(--ob-deep)]"}`}>
                    <Icon d={ICONS[i]} />
                  </span>
                  <span className={`grid size-5 place-items-center rounded-full transition-colors duration-300 ${ticked ? "bg-[var(--ob-teal)] text-white" : "bg-transparent"}`} aria-hidden>
                    {ticked ? <span className="ready-tick grid place-items-center">{TickIcon}</span> : <span className="ready-spin block size-3.5 rounded-full border-2 border-black/15 border-t-black/45" />}
                  </span>
                </span>
                <span className="text-[12.5px] font-semibold leading-snug">{text}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {/* Once the library is built: carry on at the level they picked, or let a short test place them. */}
      {done && hasPlacement(learn) && (
        <div data-guide-nav className="relative shrink-0">
          <PrimaryButton onClick={onContinue}>{t("ready.start")}</PrimaryButton>
          <button type="button" onClick={onTest} className="mt-1 block h-11 w-full text-[15px] font-semibold text-[var(--ob-deep)] active:opacity-60">
            {t("level.testButton")}
          </button>
        </div>
      )}
    </GuideFrame>
  );
}
