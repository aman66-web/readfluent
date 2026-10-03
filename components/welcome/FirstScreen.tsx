"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { ART, ArtDefs } from "@/components/welcome/art";
import { C, type Cover } from "@/components/welcome/covers";
import { APP_NAME, BRAND } from "@/lib/brand";
import { sentenceGap } from "@/lib/i18n";
import { useLocale, useRich, useT } from "@/lib/i18n/react";

/**
 * The screen the app opens on: a wall of book covers drifting past in the dark,
 * and under it the name, one line, and the way in.
 *
 * Each cover is the shape of a book (two units wide to three tall) with its
 * title and author across the top and a small drawn icon below, so the first
 * thing anybody sees is what is in the library: real books. The rows slide slowly
 * in opposite directions and every icon keeps its own small motion; under reduced
 * motion all of it holds still. The name is set in plain heavy letters that rise one
 * after another (it was a dot-matrix readout, which read poorly at this size), with Dewey above it
 * and a cyan glow rising behind it.
 *
 * The layout and timing come from the first screen of the app this one was
 * adapted from; the covers, colours and copy are ReadFluent's own. Every title is
 * a public-domain classic, so the real name goes on the real cover.
 */
export function FirstScreen({ onStart, onSignIn, onBack }: { onStart: () => void; onSignIn?: () => void; /** Back to the choice of the app's language. */ onBack?: () => void }) {
  // "ReadFluent" → "Read" + "Fluent", one word, two colours.
  const [top, bottom] = APP_NAME.split(/(?=[A-Z])/);
  // "Real books. Your level." — the second sentence picked out in the brand colour.
  const t = useT();
  const locale = useLocale();
  const rich = useRich();

  return (
    <main className="ob first relative flex h-[100dvh] flex-col overflow-clip">
      <div className="first-glow" aria-hidden />
      {onBack && (
        <button type="button" onClick={onBack} aria-label={t("ui.back")}
                className="absolute start-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[2] grid size-11 place-items-center rounded-full bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur active:scale-95">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      )}
      <Wall />
      <div className="relative z-[1] flex shrink-0 flex-col items-center px-7 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
        {/* Dewey stands on the foot of the wall, where it has faded to white. */}
        <span className="first-owl wel-in -mt-16 block" style={{ animationDelay: "200ms" }} aria-hidden><Mascot mood="hello" className="w-[112px]" /></span>
        <h1 dir="ltr" className="first-name mt-1 flex items-baseline justify-center text-[clamp(40px,14.4vw,60px)] font-extrabold leading-none tracking-[-0.035em]" aria-label={APP_NAME}>
          {/* The name in plain, heavy letters rising one after another: "Read" in ink, "Fluent" in the brand's deep cyan. */}
          {Array.from(top).map((ch, i) => <span key={`t${i}`} aria-hidden className="wel-in inline-block" style={{ animationDelay: `${300 + i * 55}ms`, color: "var(--ob-ink)" }}>{ch}</span>)}
          {bottom && Array.from(bottom).map((ch, i) => <span key={`b${i}`} aria-hidden className="wel-in inline-block" style={{ animationDelay: `${300 + (top.length + i) * 55}ms`, color: BRAND.deep }}>{ch}</span>)}
        </h1>
        <span className="first-rule wel-in mt-3 block h-1 w-14 rounded-full" style={{ animationDelay: "800ms", background: BRAND.bright }} aria-hidden />
        <p className="first-tagline ed-serif wel-in mt-4 text-[23px] italic leading-snug" style={{ animationDelay: "900ms" }}>
          {t("first.tagline1")}{sentenceGap(locale)}<span style={{ color: BRAND.deep }}>{t("first.tagline2")}</span>
        </p>
        <button
          type="button"
          onClick={onStart}
          className="first-start wel-in mt-7 inline-flex h-[58px] w-full select-none items-center justify-center gap-2.5 rounded-full px-6 text-[17px] font-semibold tracking-[-0.01em] transition-[transform,filter] duration-[140ms] ease-[cubic-bezier(.22,1,.36,1)] active:scale-[0.98]"
          style={{ animationDelay: "900ms", background: BRAND.bright, color: BRAND.ink }}
        >
          {t("first.start")}
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 rtl:-scale-x-100" aria-hidden>
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
        {onSignIn && (
          <button type="button" onClick={onSignIn}
                  className="wel-in mt-1 flex h-12 w-full items-center justify-center text-[15px] font-semibold transition-opacity active:opacity-60"
                  style={{ animationDelay: "1000ms", color: BRAND.deep }}>
            {t("first.signIn")}
          </button>
        )}
        <p className="wel-in ob-faint mx-auto mt-4 max-w-[19rem] text-[12px] leading-relaxed" style={{ animationDelay: "1100ms" }}>
          {rich("first.agree", (text) => <Link href="/privacy" className="first-link">{text}</Link>)}
        </p>
      </div>
    </main>
  );
}

/* ── The wall ──────────────────────────────────────────────────────────── */

/** The wall, row by row: exported for the tests. */
export const ROWS: readonly (readonly Cover[])[] = [
  [C.pride, C.frank, C.hound, C.alice, C.verne],
  [C.darwin, C.medit, C.machine, C.dracula, C.treasure],
  [C.moby, C.great, C.women, C.war, C.walden],
];

function Wall() {
  return (
    <div dir="ltr" className="first-wall pointer-events-none relative min-h-0 flex-1 overflow-hidden" aria-hidden>
      {/* The gradients every icon fills with, defined once. */}
      <svg width={0} height={0} className="absolute">
        <defs><ArtDefs /></defs>
      </svg>
      <div className="first-rows absolute inset-x-[-30%] top-1/2 flex flex-col gap-3">
        {ROWS.map((row, r) => (
          <div key={r} className={`first-row flex w-max gap-3 ${r % 2 ? "first-row-back" : ""}`}
               style={{ animationDelay: `${-r * 17}s` } as CSSProperties}>
            {/* Three times over and slid by a third, so the row loops without a
                seam however wide the screen is. */}
            {[...row, ...row, ...row].map((cover, i) => <CoverView key={i} cover={cover} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * How each piece moves on a cover: every icon has something alive in it — the
 * book floats, the tortoise plods, the steam drifts, the lightning flickers, the
 * needle swings, the glows breathe. The motions are larger than a drawing's own
 * idle ones, because a cover is small and seen for a moment as it slides past.
 * Kept on an inner group, never on the one that places the piece (a transform
 * attribute and an animated transform on one element fight).
 */
export const MOTION: Readonly<Record<string, string>> = {
  glowCyan: "fs-glow", glowPale: "fs-glow", glowLamp: "fs-glow", sparkles: "fs-glow", stars: "fs-glow",
  book: "fs-float", bolt: "fs-glow", lens: "fs-sway", cup: "fs-breathe", steam: "fs-drift",
  globe: "fs-float", orbit: "fs-turn", turtle: "fs-drive", lamp: "fs-breathe", hourglass: "fs-sway",
  moon: "fs-float", compass: "fs-breathe", needle: "fs-sway", whale: "fs-float", spout: "fs-glow",
  waves: "fs-drift", frame: "fs-flutter", stack: "fs-breathe", pawn: "fs-float", leaf: "fs-sway",
};

function CoverView({ cover }: { cover: Cover }) {
  const vars = {
    "--ink": cover.light ? "#16323B" : "#EAFBFF",
    "--paper": cover.light ? "#FFFFFF" : "#F1FAFC",
  } as CSSProperties;
  return (
    <div className="first-cover" style={{ background: cover.bg, color: cover.light ? "#06202B" : "#EAFBFF", ...vars }}>
      <div className="first-cover-head">
        <p className="first-cover-title ed-serif" style={{ fontSize: cover.size ?? 15 }}>
          {cover.title.map((line, i) => <span key={i} className="block whitespace-nowrap">{line}</span>)}
        </p>
        <p className="first-cover-author">{cover.author}</p>
      </div>
      <svg viewBox="0 0 200 150" className="first-cover-art" preserveAspectRatio="xMidYMid meet">
        {cover.pieces.map((p, i) => {
          const draw = ART[p.id];
          return draw ? (
            <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r ?? 0}) scale(${p.s ?? 1})`}>
              <g className={MOTION[p.id] ?? "fs-float"} style={{ animationDelay: `${-(i * 0.7 + p.x / 90)}s` }}>{draw()}</g>
            </g>
          ) : null;
        })}
      </svg>
    </div>
  );
}
