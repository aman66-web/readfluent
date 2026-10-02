"use client";

import { DotNumber } from "@/components/DotMatrix";
import { C, CoverFace } from "@/components/welcome/covers";
import type { CategoryId } from "@/lib/content/limits";
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
   Two shelves of real book covers dropping into place as the library is built, one book at a
   time. Which book is next follows the percentage, so what is drawn is how far along it is.
   When it is done the shelf shines, and the book they will start with lights up. */

const SHELF: readonly (keyof typeof C)[] = ["pride", "frank", "hound", "alice", "verne", "treasure", "machine", "dracula", "darwin", "great"];
const PER_ROW = 5;
/** The one book that is lit: where they will start. */
const LIT = 2;
const TILT = [-3, 2, 0, -2, 3, 2, -3, 0, 3, -2] as const;

function Shelf({ pct }: { pct: number }) {
  const shown = Math.min(SHELF.length, Math.floor((pct / 100) * SHELF.length * 1.06));
  const done = pct >= 100;
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 rounded-full bg-accent-bright/25 blur-2xl transition-opacity duration-700" style={{ opacity: 0.2 + 0.8 * (pct / 100) }} aria-hidden />
      {[0, 1].map((row) => (
        <div key={row} className="relative">
          <ul className="relative flex items-end justify-between gap-1.5 px-1.5">
            {SHELF.slice(row * PER_ROW, row * PER_ROW + PER_ROW).map((id, k) => {
              const i = row * PER_ROW + k;
              const lit = done && i === LIT;
              return (
                <li key={id} className={`shelf-cover w-[17.5%] ${i < shown ? "shelf-cover-in" : ""} ${lit ? "ready-lit" : ""}`}
                    style={{ ["--r" as string]: `${TILT[i]}deg`, transitionDelay: `${k * 25}ms` }}>
                  <CoverFace cover={C[id]} className={`drop-shadow-[0_6px_8px_rgba(8,47,60,.3)] ${lit ? "ring-2 ring-accent-bright rounded-md" : ""}`} />
                </li>
              );
            })}
          </ul>
          <div className="relative h-2.5 rounded-full bg-accent shadow-[0_4px_8px_-3px_rgba(8,47,60,.5)]" />
        </div>
      ))}
      {/* Once it is built, the shelf shines and a few sparks go up. */}
      {done && (
        <svg viewBox="0 0 320 196" className="pointer-events-none absolute inset-0 size-full overflow-hidden" aria-hidden>
          <rect className="ready-sheen" x="8" y="0" width="40" height="196" fill="#fff" opacity=".35" transform="skewX(-16)" />
          {[[44, 28, 5], [160, 10, 4], [286, 32, 5], [236, 6, 3.5]].map(([x, y, r], i) => (
            <path key={i} className="gb-spark" style={{ animationDelay: `${i * 0.4}s` }} fill="#7DE3F4"
                  d={`M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`} />
          ))}
        </svg>
      )}
    </div>
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
  const names = formatList(interests.slice(0, 2).map((id) => t(`cat.${id}`)), locale);
  const more = interests.length - 2;
  const shelves = interests.length === 0 ? t("ready.every") : more > 0 ? t("ready.shelvesMore", { names, more }) : t("ready.shelves", { names });
  const items = [shelves, t("ready.goal", { minutes }), t("ready.words"), t("ready.cards")];
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={done} continueLabel={t("ready.start")} showContinue={!done || !hasPlacement(learn)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-4">
        <GuideHead key={line} guide={guide} line={line} mood="cheer" />

        <div className="mt-3" dir="ltr"><Shelf pct={pct} /></div>

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
