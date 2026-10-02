"use client";

import type { ReactNode } from "react";
import { ART, ArtDefs } from "@/components/welcome/art";
import type { CategoryId } from "@/lib/content/limits";

/**
 * The small pictures on the cards of the "what are you curious about" screen: one scene for each
 * of the nine shelves, drawn from the first run's own art pieces (components/welcome/art.tsx) and a
 * few more of the same kind. Each sits in a 200×112 frame, centred on (100, 56).
 */

/** One of the art pieces, placed: inside a group of its own motion, if it has one. */
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

const GLOW = (y = 56, s = 0.5) => piece("glowCyan", y === 56 ? 100 : 100, y, s);

/** A heart. */
const Heart = () => (
  <g className="fx-breathe" transform="translate(100 60)">
    <path d="M0 30 C-46 0 -34 -34 -12 -34 C-4 -34 0 -28 0 -22 C0 -28 4 -34 12 -34 C34 -34 46 0 0 30 Z" fill="#F9A8D4" />
    <path d="M-20 -22 C-30 -18 -32 -6 -26 2" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".6" />
  </g>
);

/** A magnifying glass. */
const Magnifier = () => (
  <g className="fx-rock" transform="translate(96 54) rotate(-14)">
    <circle r="26" fill="#0B2A38" fillOpacity=".55" stroke="#EAFBFF" strokeWidth="6" />
    <path d="M18 24 L40 48" stroke="#EAFBFF" strokeWidth="9" strokeLinecap="round" />
    <path d="M-14 -10 A16 16 0 0 1 -2 -18" fill="none" stroke="#67E8F9" strokeWidth="4" strokeLinecap="round" opacity=".8" />
  </g>
);

/** A crescent moon. */
const Moon = () => (
  <g className="fx-float" transform="translate(98 56)">
    <path d="M14 -36 A36 36 0 1 0 14 36 A28 28 0 1 1 14 -36 Z" fill="#E9D5FF" />
  </g>
);

/** A leaf. */
const Leaf = () => (
  <g className="fx-breathe" transform="translate(100 58) rotate(28)">
    <path d="M0 -42 C34 -30 36 20 0 42 C-36 20 -34 -30 0 -42 Z" fill="#6EE7B7" />
    <path d="M0 -34 L0 40 M0 -6 L14 -18 M0 8 L-14 -4 M0 22 L12 12" stroke="#0B4A3B" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55" />
  </g>
);

/** An hourglass. */
const Hourglass = () => (
  <g className="fx-rock" transform="translate(100 56)">
    <path d="M-22 -38 H22 M-22 38 H22" stroke="#FDE68A" strokeWidth="6" strokeLinecap="round" />
    <path d="M-16 -34 H16 C16 -10 4 -4 4 0 C4 4 16 10 16 34 H-16 C-16 10 -4 4 -4 0 C-4 -4 -16 -10 -16 -34 Z" fill="#FEF3C7" fillOpacity=".25" stroke="#FDE68A" strokeWidth="3" />
    <path d="M-10 30 H10 C8 20 2 14 0 14 C-2 14 -8 20 -10 30 Z" fill="#FDE68A" />
  </g>
);

const PICTURES: Record<CategoryId, { bg: string; pieces: ReactNode[] }> = {
  romance: { bg: "linear-gradient(160deg, #5B1A45, #1F0A22)", pieces: [GLOW(), <Motes key="m" n={5} />, <Heart key="h" />, <Glints key="g" at={[[40, 26, 3.6], [164, 30, 3], [34, 90, 2.8]]} />] },
  crime: { bg: "linear-gradient(160deg, #1B2250, #0A0E26)", pieces: [GLOW(), <Motes key="m" n={5} />, <Magnifier key="x" />, <Glints key="g" at={[[38, 26, 3.4], [166, 34, 3], [160, 92, 2.8]]} />] },
  "fantasy-scifi": { bg: "linear-gradient(160deg, #2A1B5A, #120A30)", pieces: [GLOW(), <Motes key="m" n={6} />, <Moon key="mo" />, piece("sparkles", 100, 56, 0.62), <Glints key="g" at={[[36, 26, 3.6], [168, 30, 3], [30, 92, 2.8]]} />] },
  "self-help": { bg: "linear-gradient(160deg, #0E7490, #082F3E)", pieces: [GLOW(), <Motes key="m" n={5} />, piece("compass", 100, 58, 0.78, 0, "fx-breathe"), piece("needle", 100, 58, 0.78, 38, "fx-rock"), <Glints key="g" at={[[40, 26, 4], [162, 34, 3.2], [158, 92, 3.6]]} />] },
  "business-money": { bg: "linear-gradient(160deg, #14407A, #0A1B3A)", pieces: [GLOW(), <Motes key="m" n={5} />, piece("stack", 100, 60, 0.74, 0, "fx-float"), <Glints key="g" at={[[38, 26, 3.6], [166, 30, 3], [34, 92, 2.8]]} />] },
  "religion-spirituality": { bg: "linear-gradient(160deg, #0B3B4A, #061A22)", pieces: [piece("glowLamp", 100, 54, 0.6), <Motes key="m" n={5} />, piece("lamp", 100, 58, 0.62, 0, "fx-breathe"), <Glints key="g" at={[[40, 28, 3.6], [164, 34, 3], [158, 92, 3]]} />] },
  health: { bg: "linear-gradient(160deg, #0F5A4A, #06231D)", pieces: [GLOW(), <Motes key="m" n={5} />, <Leaf key="l" />, <Glints key="g" at={[[40, 26, 3.6], [164, 34, 3], [158, 90, 3]]} />] },
  history: { bg: "linear-gradient(160deg, #5A3A12, #22160A)", pieces: [GLOW(), <Motes key="m" n={5} />, <Hourglass key="hg" />, <Glints key="g" at={[[40, 26, 3.6], [164, 32, 3], [34, 90, 2.8]]} />] },
  science: { bg: "linear-gradient(160deg, #0E7490, #082F3E)", pieces: [GLOW(), <Motes key="m" n={5} />, piece("orbit", 100, 57, 0.62, 0, "fx-breathe"), piece("globe", 100, 57, 0.52, 0, "fx-float"), <Glints key="g" at={[[40, 26, 4], [162, 34, 3.2], [154, 92, 3.6]]} />] },
};

/** The picture at the top of a shelf's card. The gradients the art pieces use are defined once, by `CategoryPictureDefs`, on the screen. */
export function CategoryPicture({ id }: { id: CategoryId }) {
  const p = PICTURES[id];
  return (
    <span aria-hidden className="block aspect-[16/9] w-full" style={{ background: p.bg, ["--ink" as string]: "#EAFBFF", ["--paper" as string]: "#F1FAFC" }}>
      <svg viewBox="0 0 200 112" className="block size-full" preserveAspectRatio="xMidYMid slice">{p.pieces}</svg>
    </span>
  );
}

/** Define the pieces' gradients once for the pictures on a screen. */
export function CategoryPictureDefs() {
  return <svg width={0} height={0} className="absolute" aria-hidden><defs><ArtDefs /></defs></svg>;
}
