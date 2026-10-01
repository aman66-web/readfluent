"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { DotNumber } from "@/components/DotMatrix";
import { ART, ArtDefs } from "@/components/welcome/art";
import { APP_NAME, BRAND } from "@/lib/brand";
import { useRich, useT } from "@/lib/i18n/react";

/**
 * The screen the app opens on: a wall of book covers drifting past in the dark,
 * and under it the name, one line, and the way in.
 *
 * Each cover is the shape of a book (two units wide to three tall) with its
 * title and author across the top and a small drawn icon below, so the first
 * thing anybody sees is what is in the library: real books. The rows slide slowly
 * in opposite directions and every icon keeps its own small motion; under reduced
 * motion all of it holds still. The name is spelt in lamps — a dot-matrix
 * readout — switching on one after another, with a cyan glow rising behind it.
 *
 * The layout and timing come from the first screen of the app this one was
 * adapted from; the covers, colours and copy are ReadFluent's own. Every title is
 * a public-domain classic, so the real name goes on the real cover.
 */
export function FirstScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn?: () => void }) {
  // "ReadFluent" → READ over FLUENT, one word per line: a 5x7 grid is about six
  // characters across on a phone, so two words side by side do not fit.
  const [top, bottom] = APP_NAME.split(/(?=[A-Z])/);
  // "Real books. Your level." — the second sentence picked out in the brand colour.
  const t = useT();
  const rich = useRich();

  return (
    <main className="ob first relative flex h-[100dvh] flex-col overflow-clip">
      <div className="first-glow" aria-hidden />
      <Wall />
      <div className="relative z-[1] flex shrink-0 flex-col items-center px-7 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
        <h1 className="first-name flex flex-col items-center gap-[8px]" aria-label={APP_NAME}>
          {/* On white the lamps are the deeper cyans (the bright one is too faint on
              a light ground) and the unlit field is a pale wash of the same blue. */}
          <DotNumber value={top} cell={8} color="#0B5F78" glow={false} field fieldColor="rgba(14,116,144,.06)" stagger label="" />
          {bottom && <DotNumber value={bottom} cell={8} color="#0891B2" glow={false} field fieldColor="rgba(14,116,144,.06)" stagger label="" />}
        </h1>
        <p className="first-tagline ed-serif wel-in mt-5 text-[23px] italic leading-snug" style={{ animationDelay: "700ms" }}>
          {t("first.tagline1")} <span style={{ color: BRAND.deep }}>{t("first.tagline2")}</span>
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
                  className="first-alt wel-in mt-1 flex h-12 w-full items-center justify-center text-[15px] font-semibold transition-opacity active:opacity-60"
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

interface Piece {
  id: string;
  x: number;
  y: number;
  s?: number;
  r?: number;
}

export interface Cover {
  /** The cover's ground. */
  bg: string;
  /** A light ground: dark title and ink. */
  light?: boolean;
  /** The title, one string per line, broken by hand so no word is split. */
  title: readonly string[];
  /** Title size in px; long words take less. */
  size?: number;
  author: string;
  /** The icon, drawn in a 200 × 150 area. */
  pieces: readonly Piece[];
}

/* Fifteen public-domain classics, three rows of five, with dark and light
   grounds alternating along each row and down the columns so the wall reads as
   a wall of books rather than a stripe. The palette is cyan, teal, navy, violet
   and cream — no orange. The icon is the book in one picture. */
const C = {
  pride: { bg: "#0B3B4A", title: ["Pride and", "Prejudice"], size: 16, author: "JANE AUSTEN", pieces: [{ id: "glowCyan", x: 100, y: 78, s: 0.9 }, { id: "book", x: 100, y: 82, s: 0.92 }, { id: "sparkles", x: 100, y: 78, s: 0.9 }] },
  frank: { bg: "#1B2250", title: ["Franken-", "stein"], size: 16, author: "MARY SHELLEY", pieces: [{ id: "glowCyan", x: 100, y: 78, s: 0.95 }, { id: "bolt", x: 100, y: 78, s: 1 }] },
  hound: { bg: "#E3F8FC", light: true, title: ["The Hound", "of the", "Baskervilles"], size: 13, author: "ARTHUR CONAN DOYLE", pieces: [{ id: "lens", x: 98, y: 82, s: 0.95 }] },
  alice: { bg: "#F3EDE3", light: true, title: ["Alice in", "Wonderland"], size: 14, author: "LEWIS CARROLL", pieces: [{ id: "steam", x: 100, y: 72, s: 0.8 }, { id: "cup", x: 100, y: 88, s: 0.82 }] },
  verne: { bg: "#0E7490", title: ["Around the", "World in", "Eighty Days"], size: 14, author: "JULES VERNE", pieces: [{ id: "orbit", x: 100, y: 80, s: 1 }, { id: "globe", x: 100, y: 80, s: 0.9 }] },

  darwin: { bg: "#123D2F", title: ["On the Origin", "of Species"], size: 13.5, author: "CHARLES DARWIN", pieces: [{ id: "glowPale", x: 100, y: 84, s: 0.8 }, { id: "turtle", x: 98, y: 86, s: 1 }] },
  medit: { bg: "#1C1C1F", title: ["Meditations"], size: 14, author: "MARCUS AURELIUS", pieces: [{ id: "glowLamp", x: 100, y: 84, s: 0.85 }, { id: "lamp", x: 100, y: 80, s: 0.92 }] },
  machine: { bg: "#2A1B5A", title: ["The Time", "Machine"], size: 16, author: "H. G. WELLS", pieces: [{ id: "stars", x: 100, y: 78, s: 1 }, { id: "hourglass", x: 100, y: 80, s: 0.9 }] },
  dracula: { bg: "#0A1428", title: ["Dracula"], size: 19, author: "BRAM STOKER", pieces: [{ id: "stars", x: 100, y: 78, s: 1.05 }, { id: "glowPale", x: 98, y: 78, s: 0.8 }, { id: "moon", x: 100, y: 80, s: 0.9 }] },
  treasure: { bg: "#22D3EE", light: true, title: ["Treasure", "Island"], size: 16, author: "R. L. STEVENSON", pieces: [{ id: "compass", x: 100, y: 80, s: 0.95 }, { id: "needle", x: 100, y: 80, s: 0.95 }] },

  moby: { bg: "#164E63", title: ["Moby-Dick"], size: 14.5, author: "HERMAN MELVILLE", pieces: [{ id: "waves", x: 100, y: 96, s: 1 }, { id: "whale", x: 96, y: 84, s: 0.74 }, { id: "spout", x: 96, y: 84, s: 0.74 }] },
  great: { bg: "#D4F4FA", light: true, title: ["Great", "Expectations"], size: 13, author: "CHARLES DICKENS", pieces: [{ id: "frame", x: 100, y: 82, s: 0.88, r: -4 }] },
  women: { bg: "#3B1D4A", title: ["Little", "Women"], size: 17, author: "LOUISA M. ALCOTT", pieces: [{ id: "glowPale", x: 100, y: 82, s: 0.7 }, { id: "stack", x: 100, y: 84, s: 0.92 }] },
  war: { bg: "#26262A", title: ["The Art", "of War"], size: 16, author: "SUN TZU", pieces: [{ id: "glowCyan", x: 100, y: 82, s: 0.85 }, { id: "pawn", x: 100, y: 82, s: 1 }] },
  walden: { bg: "#0F3B38", title: ["Walden"], size: 19, author: "H. D. THOREAU", pieces: [{ id: "glowPale", x: 100, y: 82, s: 0.8 }, { id: "leaf", x: 100, y: 82, s: 1.02 }] },
} satisfies Record<string, Cover>;

/** The wall, row by row: exported for the tests. */
export const ROWS: readonly (readonly Cover[])[] = [
  [C.pride, C.frank, C.hound, C.alice, C.verne],
  [C.darwin, C.medit, C.machine, C.dracula, C.treasure],
  [C.moby, C.great, C.women, C.war, C.walden],
];

function Wall() {
  return (
    <div className="first-wall pointer-events-none relative min-h-0 flex-1 overflow-hidden" aria-hidden>
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
