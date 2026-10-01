"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { DotNumber } from "@/components/DotMatrix";
import { ART, ArtDefs } from "@/components/welcome/art";
import { APP_NAME, TAGLINE } from "@/lib/brand";

/**
 * The screen the app opens on: a wall of the app's own pictures drifting past in
 * the dark, and under it the name, one line, and the way in.
 *
 * The layout, timing and motion are the first screen of the app this one was
 * adapted from, kept exactly: the wall is tilted and fades into the same black
 * ground, the rows slide slowly in opposite directions and every drawing keeps
 * its own small motion; under reduced motion all of it holds still. The name is
 * spelt in lamps — a dot-matrix readout — switching on one after another. Only
 * the pictures are new: reading, not money.
 */
export function FirstScreen({ onStart }: { onStart: () => void }) {
  // "ReadFluent" → READ over FLUENT, one word per line: a 5x7 grid is about six
  // characters across on a phone, so two words side by side do not fit.
  const [top, bottom] = APP_NAME.split(/(?=[A-Z])/);

  return (
    <main className="first relative flex h-[100dvh] flex-col overflow-clip text-white">
      <Wall />
      <div className="relative z-[1] flex shrink-0 flex-col items-center px-7 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
        <h1 className="flex flex-col items-center gap-[7px]" aria-label={APP_NAME}>
          <DotNumber value={top} cell={7} color="#FFD27A" field fieldColor="rgba(255,255,255,.055)" stagger label="" />
          {bottom && <DotNumber value={bottom} cell={7} color="#F26A3A" field fieldColor="rgba(255,255,255,.055)" stagger label="" />}
        </h1>
        <p className="ed-serif wel-in mt-5 text-[22px] italic leading-snug text-white/80" style={{ animationDelay: "700ms" }}>
          {TAGLINE}
        </p>
        <button
          type="button"
          onClick={onStart}
          className="first-start wel-in mt-8 inline-flex h-[58px] w-full select-none items-center justify-center gap-2.5 rounded-full bg-white px-6 text-[17px] font-semibold tracking-[-0.01em] text-[#0a0a0c] transition-[transform,background-color] duration-[140ms] ease-[cubic-bezier(.22,1,.36,1)] active:scale-[0.98]"
          style={{ animationDelay: "900ms" }}
        >
          Get started
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
        <p className="wel-in mx-auto mt-4 max-w-[19rem] text-[12px] leading-relaxed text-white/45" style={{ animationDelay: "1100ms" }}>
          By continuing, you agree to our{" "}
          <Link href="/privacy" className="first-link">Privacy Policy</Link>.
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

interface Tile {
  /** The tile's ground. */
  bg: string;
  /** Line art on a light ground is ink; on a dark one, white. */
  light?: boolean;
  pieces: readonly Piece[];
}

/* Each tile is 200 across, drawn from art.tsx's pieces. Dark and light grounds
   alternate along a row and down the columns, so the wall reads as a wall of
   pictures rather than a stripe. */
const T = {
  book: { bg: "#1C1C1F", pieces: [{ id: "glowWarm", x: 100, y: 100, s: 0.85 }, { id: "book", x: 100, y: 104, s: 0.95 }, { id: "sparkles", x: 100, y: 100, s: 0.9 }] },
  quote: { bg: "#F3EDE3", light: true, pieces: [{ id: "quote", x: 106, y: 98, s: 0.92 }] },
  levels: { bg: "#231A4A", pieces: [{ id: "ripple", x: 100, y: 110, s: 0.85 }, { id: "levels", x: 100, y: 108, s: 0.92 }] },
  word: { bg: "#1F5F5B", pieces: [{ id: "sentence", x: 100, y: 70, s: 1 }, { id: "wordcard", x: 100, y: 128, s: 0.95 }] },
  page: { bg: "#F4EFE6", light: true, pieces: [{ id: "pagecard", x: 100, y: 100, s: 0.95, r: -4 }] },
  globe: { bg: "#17223F", pieces: [{ id: "orbit", x: 100, y: 100, s: 1 }, { id: "globe", x: 100, y: 100, s: 0.95 }] },
  audio: { bg: "#F5B83D", light: true, pieces: [{ id: "headphones", x: 100, y: 84, s: 0.95 }, { id: "soundbars", x: 100, y: 142, s: 0.95 }] },
  cards: { bg: "#26262A", pieces: [{ id: "flashcards", x: 100, y: 100, s: 1.05 }] },
  shelf: { bg: "#0F3B38", pieces: [{ id: "rays", x: 100, y: 96, s: 0.8 }, { id: "glowGold", x: 100, y: 110, s: 0.6 }, { id: "shelf", x: 100, y: 96, s: 0.95 }] },
  progress: { bg: "#F7D6E0", light: true, pieces: [{ id: "progress", x: 100, y: 92, s: 0.98 }, { id: "tick", x: 152, y: 150, s: 0.9 }] },
  lamp: { bg: "#102A22", pieces: [{ id: "glowGold", x: 100, y: 110, s: 0.85 }, { id: "lamp", x: 100, y: 100, s: 0.95 }] },
  turtle: { bg: "#5B1236", pieces: [{ id: "glowPink", x: 100, y: 100, s: 0.75 }, { id: "turtle", x: 92, y: 128, s: 1.05 }, { id: "bubble", x: 100, y: 56, s: 0.95 }] },
  stack: { bg: "#9CC3E0", light: true, pieces: [{ id: "stack", x: 100, y: 124, s: 0.9 }, { id: "cup", x: 100, y: 100, s: 0.9 }, { id: "steam", x: 100, y: 100, s: 0.9 }] },
  lens: { bg: "#EE5A2A", pieces: [{ id: "aa", x: 96, y: 100, s: 1 }, { id: "lens", x: 134, y: 130, s: 1 }] },
  frame: { bg: "#2B1B3D", pieces: [{ id: "frame", x: 100, y: 100, s: 0.95, r: -5 }] },
  words: { bg: "#182A4A", pieces: [{ id: "wordlist", x: 100, y: 104, s: 0.95 }] },
} satisfies Record<string, Tile>;

/** The wall, row by row: exported for the tests. */
export const ROWS: readonly (readonly Tile[])[] = [
  [T.book, T.quote, T.levels, T.word],
  [T.page, T.globe, T.audio, T.cards],
  [T.shelf, T.progress, T.lamp, T.turtle],
  [T.stack, T.lens, T.frame, T.words],
];

function Wall() {
  return (
    <div className="first-wall pointer-events-none relative min-h-0 flex-1 overflow-hidden" aria-hidden>
      {/* The gradients every tile fills with, defined once. */}
      <svg width={0} height={0} className="absolute">
        <defs><ArtDefs /></defs>
      </svg>
      <div className="first-rows absolute inset-x-[-30%] top-1/2 flex flex-col gap-3">
        {ROWS.map((row, r) => (
          <div key={r} className={`first-row flex w-max gap-3 ${r % 2 ? "first-row-back" : ""}`}
               style={{ animationDelay: `${-r * 17}s` } as CSSProperties}>
            {/* Twice over, so the row loops without a seam. */}
            {[...row, ...row].map((tile, i) => <TileView key={i} tile={tile} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * How each piece moves on the wall: every tile has something alive in it — the
 * book floats, the quote sways, the tortoise plods, the steam drifts, the glows
 * breathe. The motions are larger than a drawing's own idle ones, because a tile
 * is small and seen for a moment as it slides past. Kept on an inner group, never
 * on the one that places the piece (a transform attribute and an animated
 * transform on one element fight).
 */
export const MOTION: Readonly<Record<string, string>> = {
  glowWarm: "fs-glow", glowGold: "fs-glow", glowPink: "fs-glow", ripple: "fs-pulse", rays: "fs-turn", sparkles: "fs-glow",
  book: "fs-float", quote: "fs-sway", levels: "fs-breathe", sentence: "fs-breathe", wordcard: "fs-float",
  pagecard: "fs-drift", globe: "fs-float", orbit: "fs-turn", headphones: "fs-breathe", soundbars: "fs-pulse",
  flashcards: "fs-sway", shelf: "fs-breathe", progress: "fs-breathe", tick: "fs-thump", lamp: "fs-breathe",
  turtle: "fs-drive", bubble: "fs-float", stack: "fs-breathe", cup: "fs-breathe", steam: "fs-drift",
  aa: "fs-float", lens: "fs-sway", frame: "fs-flutter", wordlist: "fs-flutter",
};

function TileView({ tile }: { tile: Tile }) {
  const vars = { "--ink": tile.light ? "#232323" : "#F4F1EA", "--paper": tile.light ? "#FFFFFF" : "#F4F1EA" } as CSSProperties;
  return (
    <div className="first-tile size-[132px] shrink-0 overflow-hidden rounded-[24px]" style={{ background: tile.bg, ...vars }}>
      <svg viewBox="0 0 200 200" className="block size-full">
        {tile.pieces.map((p, i) => {
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
