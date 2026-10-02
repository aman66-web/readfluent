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

/* One object for each shelf, drawn to be known at a glance. Each is centred on (0, 0) inside a group that places it, and
   moves in an inner group of its own (a class that animates `transform` on the placing group would undo the placement). */
const at = (fx: string, children: ReactNode, y = 56): ReactNode => (
  <g transform={`translate(100 ${y})`}><g className={fx}>{children}</g></g>
);

/** Romance: a big heart and a small one. */
const Heart = () => at("fx-breathe", (
  <>
    <path d="M-6 30 C-52 -2 -38 -38 -16 -38 C-8 -38 -6 -32 -6 -26 C-6 -32 0 -38 8 -38 C30 -38 42 -2 -6 30 Z" fill="#F9A8D4" />
    <path d="M-26 -26 C-36 -20 -38 -8 -32 2" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity=".55" />
    <path d="M30 -8 C14 -20 18 -36 28 -36 C33 -36 34 -32 34 -30 C34 -32 36 -36 42 -36 C52 -36 54 -20 30 -8 Z" fill="#FB7185" transform="translate(6 -2) scale(.9)" />
  </>
));

/** Crime: a magnifying glass over a fingerprint. */
const Magnifier = () => at("fx-rock", (
  <g transform="rotate(-18)">
    <circle cx="-4" cy="-6" r="30" fill="#0B2A38" fillOpacity=".6" stroke="#EAFBFF" strokeWidth="6" />
    <path d="M18 17 L42 42" stroke="#EAFBFF" strokeWidth="10" strokeLinecap="round" />
    <g fill="none" stroke="#67E8F9" strokeWidth="2.6" strokeLinecap="round">
      <path d="M-4 8 C-4 -2 -4 -8 -4 -12" /><path d="M-12 8 C-14 -6 -12 -16 -4 -20 C4 -16 8 -8 6 8" />
      <path d="M-20 4 C-22 -10 -16 -24 -4 -28 C10 -24 16 -12 14 4" />
    </g>
  </g>
));

/** Fantasy and science fiction: a castle on a hill, under a moon. */
const Castle = () => at("fx-float", (
  <>
    <circle cx="26" cy="-22" r="19" fill="#F5F3FF" opacity=".92" />
    <circle cx="33" cy="-27" r="19" fill="#2A1B5A" />
    <path d="M-48 38 Q0 12 48 38 Z" fill="#3B2A8C" />
    <rect x="-34" y="-10" width="15" height="46" fill="#8B7CF6" /><path d="M-37 -10 L-26.5 -32 L-16 -10 Z" fill="#6D5BD0" />
    <rect x="19" y="-10" width="15" height="46" fill="#8B7CF6" /><path d="M16 -10 L26.5 -32 L37 -10 Z" fill="#6D5BD0" />
    <rect x="-12" y="-2" width="24" height="38" fill="#A596FA" /><path d="M-16 -2 L0 -30 L16 -2 Z" fill="#6D5BD0" />
    <path d="M0 -30 L0 -42 L11 -38 L0 -35" fill="#A5F3FC" stroke="#A5F3FC" strokeWidth="1.5" strokeLinejoin="round" />
    <g fill="#1B1450"><rect x="-29" y="2" width="5" height="9" rx="2.5" /><rect x="24" y="2" width="5" height="9" rx="2.5" /><rect x="-3" y="8" width="6" height="11" rx="3" /><path d="M-5 36 V26 A5 5 0 0 1 5 26 V36 Z" /></g>
  </>
));

/** Self-help: steps up to a flag. */
const Steps = () => at("fx-breathe", (
  <>
    <rect x="-44" y="14" width="29" height="26" rx="3" fill="#67E8F9" />
    <rect x="-15" y="-2" width="29" height="42" rx="3" fill="#22D3EE" />
    <rect x="14" y="-18" width="30" height="58" rx="3" fill="#0EA5C4" />
    <path d="M29 -18 V-46" stroke="#EAFBFF" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M29 -46 L50 -39 L29 -32 Z" fill="#FDE68A" />
    <path d="M-38 8 q10 -4 18 -12" fill="none" stroke="#EAFBFF" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="1 6" />
  </>
));

/** Business and money: rising bars, and a coin. */
const Chart = () => at("fx-float", (
  <>
    <rect x="-40" y="8" width="17" height="30" rx="3" fill="#67E8F9" />
    <rect x="-16" y="-6" width="17" height="44" rx="3" fill="#22D3EE" />
    <rect x="8" y="-22" width="17" height="60" rx="3" fill="#0EA5C4" />
    <path d="M-42 -10 L-14 -26 L6 -38 L36 -46" fill="none" stroke="#EAFBFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M26 -50 L38 -46 L32 -35" fill="none" stroke="#EAFBFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="38" cy="14" r="15" fill="#FDE68A" stroke="#F5C451" strokeWidth="3" />
    <text x="38" y="20.5" textAnchor="middle" fontSize="18" fontWeight="800" fill="#8A6A12" fontFamily="Georgia, serif">$</text>
  </>
));

/** Religion and spirituality: a lotus. */
const Lotus = () => at("fx-breathe", (
  <>
    {[-62, -31, 31, 62].map((r) => <ellipse key={r} cx="0" cy="-2" rx="11" ry="30" fill="#F0ABFC" opacity=".85" transform={`rotate(${r} 0 32)`} />)}
    <ellipse cx="0" cy="-4" rx="12" ry="34" fill="#FAE8FF" />
    <path d="M-46 36 Q-23 30 0 36 T46 36" fill="none" stroke="#67E8F9" strokeWidth="3" strokeLinecap="round" opacity=".8" />
  </>
), 54);

/** Health: an apple. */
const Apple = () => at("fx-breathe", (
  <>
    <path d="M0 -14 C-14 -28 -42 -20 -40 8 C-38 30 -18 42 0 33 C18 42 38 30 40 8 C42 -20 14 -28 0 -14 Z" fill="#4ADE80" />
    <path d="M-26 -8 C-32 -2 -32 10 -26 18" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity=".5" />
    <path d="M0 -14 C0 -24 3 -32 10 -40" fill="none" stroke="#14532D" strokeWidth="4" strokeLinecap="round" />
    <path d="M12 -34 C22 -46 38 -42 40 -36 C32 -28 20 -28 12 -34 Z" fill="#22C55E" />
  </>
));

/** History: a temple. */
const Temple = () => at("fx-float", (
  <>
    <path d="M-48 -6 L0 -38 L48 -6 Z" fill="#F1E7D0" /><rect x="-46" y="-6" width="92" height="7" fill="#E4D5B2" />
    {[-34, -17, 0, 17, 34].map((x) => <rect key={x} x={x - 4.5} y="3" width="9" height="30" rx="2" fill="#F1E7D0" />)}
    <rect x="-50" y="33" width="100" height="7" rx="2" fill="#E4D5B2" /><rect x="-44" y="40" width="88" height="5" rx="2" fill="#D6C59B" />
  </>
), 54);

/** Science: an atom. */
const Atom = () => at("fx-float", (
  <>
    {[0, 60, 120].map((r) => <ellipse key={r} rx="44" ry="16" fill="none" stroke="#67E8F9" strokeWidth="3" transform={`rotate(${r})`} />)}
    <circle r="9" fill="#EAFBFF" />
    <g fill="#A5F3FC"><circle cx="44" cy="0" r="4.5" /><circle cx="-22" cy="38" r="4.5" transform="rotate(0)" /><circle cx="-22" cy="-38" r="4.5" /></g>
  </>
));

const PICTURES: Record<CategoryId, { bg: string; pieces: ReactNode[] }> = {
  romance: { bg: "linear-gradient(160deg, #5B1A45, #1F0A22)", pieces: [GLOW(), <Motes key="m" n={5} />, <Heart key="o" />, <Glints key="g" at={[[34, 26, 3.6], [168, 30, 3.2], [30, 90, 2.8]]} />] },
  crime: { bg: "linear-gradient(160deg, #1B2250, #0A0E26)", pieces: [GLOW(), <Motes key="m" n={5} />, <Magnifier key="o" />, <Glints key="g" at={[[36, 26, 3.4], [166, 34, 3], [160, 92, 2.8]]} />] },
  "fantasy-scifi": { bg: "linear-gradient(160deg, #2A1B5A, #120A30)", pieces: [<Motes key="m" n={6} />, <Castle key="o" />, <Glints key="g" at={[[30, 24, 4], [170, 22, 3.4], [26, 80, 3], [172, 84, 3.2]]} />] },
  "self-help": { bg: "linear-gradient(160deg, #0E7490, #082F3E)", pieces: [GLOW(), <Motes key="m" n={5} />, <Steps key="o" />, <Glints key="g" at={[[34, 26, 4], [166, 30, 3.2], [36, 92, 3]]} />] },
  "business-money": { bg: "linear-gradient(160deg, #14407A, #0A1B3A)", pieces: [GLOW(), <Motes key="m" n={5} />, <Chart key="o" />, <Glints key="g" at={[[32, 26, 3.6], [170, 24, 3], [30, 92, 2.8]]} />] },
  "religion-spirituality": { bg: "linear-gradient(160deg, #3B1D5A, #170A2A)", pieces: [piece("glowPale", 100, 54, 0.6), <Motes key="m" n={6} />, <Lotus key="o" />, <Glints key="g" at={[[34, 28, 3.6], [166, 30, 3], [164, 90, 3]]} />] },
  health: { bg: "linear-gradient(160deg, #0F5A4A, #06231D)", pieces: [GLOW(), <Motes key="m" n={5} />, <Apple key="o" />, <Glints key="g" at={[[34, 26, 3.6], [168, 34, 3], [160, 92, 3]]} />] },
  history: { bg: "linear-gradient(160deg, #5A3A12, #22160A)", pieces: [GLOW(), <Motes key="m" n={5} />, <Temple key="o" />, <Glints key="g" at={[[32, 26, 3.6], [168, 30, 3], [30, 92, 2.8]]} />] },
  science: { bg: "linear-gradient(160deg, #0E7490, #082F3E)", pieces: [GLOW(), <Motes key="m" n={5} />, <Atom key="o" />, <Glints key="g" at={[[32, 24, 4], [168, 34, 3.2], [158, 92, 3.6]]} />] },
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
