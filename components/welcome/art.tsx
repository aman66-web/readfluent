import type { ReactNode } from "react";

/**
 * The icons on the first screen's book covers: ReadFluent's own, in a flat,
 * glowing, always-moving style, in the brand's cyan. Every piece is drawn round
 * its own middle (0 0) in a 200-wide drawing area, and is placed, scaled and
 * turned by the cover that uses it (FirstScreen.tsx).
 *
 * Colour comes from two variables the cover sets: `--ink` (line art: light on a
 * dark cover, dark on a light one) and `--paper` (a page). No orange anywhere:
 * the palette is cyan, teal, navy, violet and cream (tests/unit/first-screen.test.ts).
 */

/** The ink for anything printed on a page: always dark, whatever the cover's ground, because a page is always light. */
const PAGE_INK = "#16323B";

/** The gradients every cover fills with, defined once on the wall. */
export function ArtDefs() {
  return (
    <>
      <linearGradient id="rf-cy" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#CFFAFE" /><stop offset=".5" stopColor="#22D3EE" /><stop offset="1" stopColor="#0891B2" />
      </linearGradient>
      <linearGradient id="rf-cover" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3EDCF2" /><stop offset="1" stopColor="#0A7C95" />
      </linearGradient>
      <linearGradient id="rf-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#BDEFF7" /><stop offset="1" stopColor="#F2FCFE" />
      </linearGradient>
      <linearGradient id="rf-globe" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#5BC8E8" /><stop offset="1" stopColor="#14538C" />
      </linearGradient>
      <linearGradient id="rf-shell" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8BE0B4" /><stop offset="1" stopColor="#2A8F69" />
      </linearGradient>
      <linearGradient id="rf-whale" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5AD8EE" /><stop offset="1" stopColor="#0B6E8A" />
      </linearGradient>
      <linearGradient id="rf-leaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#B6F2CE" /><stop offset="1" stopColor="#2FA37A" />
      </linearGradient>
      <radialGradient id="rf-glow-cyan"><stop offset="0" stopColor="#22D3EE" stopOpacity=".75" /><stop offset="1" stopColor="#22D3EE" stopOpacity="0" /></radialGradient>
      <radialGradient id="rf-glow-pale"><stop offset="0" stopColor="#E6FBFF" stopOpacity=".8" /><stop offset="1" stopColor="#E6FBFF" stopOpacity="0" /></radialGradient>
      <radialGradient id="rf-glow-lamp"><stop offset="0" stopColor="#FFF3C4" stopOpacity=".9" /><stop offset="1" stopColor="#FFF3C4" stopOpacity="0" /></radialGradient>
    </>
  );
}

function glow(id: "cyan" | "pale" | "lamp") {
  return function Glow() {
    return <circle r="72" fill={`url(#rf-glow-${id})`} />;
  };
}

/** A drawn landscape, the same stand-in the reader uses for a page's photograph, here in cyan. */
function landscape(w: number, h: number): ReactNode {
  return (
    <g>
      <clipPath id={`rf-clip-${w}`}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx="7" /></clipPath>
      <g clipPath={`url(#rf-clip-${w})`}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="url(#rf-sky)" />
        <circle cx={w * 0.2} cy={-h * 0.18} r={h * 0.15} fill="#FFF7D6" />
        <path d={`M${-w / 2},${h * 0.1} L${-w * 0.16},${-h * 0.12} L${w * 0.08},${h * 0.1} L${w * 0.28},${-h * 0.04} L${w / 2},${h * 0.14} L${w / 2},${h / 2} L${-w / 2},${h / 2} Z`} fill="#7FC8D8" />
        <path d={`M${-w / 2},${h * 0.26} L${-w * 0.2},${h * 0.08} L${w * 0.14},${h * 0.28} L${w / 2},${h * 0.12} L${w / 2},${h / 2} L${-w / 2},${h / 2} Z`} fill="#1E7F95" />
      </g>
    </g>
  );
}

/** A few short lines standing for text. They sit on paper, so they use the page's ink. */
const lines = (x: number, y: number, widths: number[], gap = 9, opacity = 0.3) => (
  <g stroke={PAGE_INK} strokeWidth="4" strokeLinecap="round" opacity={opacity}>
    {widths.map((w, i) => <path key={i} d={`M${x} ${y + i * gap} h${w}`} />)}
  </g>
);

export const ART: Record<string, () => ReactNode> = {
  glowCyan: glow("cyan"),
  glowPale: glow("pale"),
  glowLamp: glow("lamp"),

  sparkles: () => (
    <g fill="#CFFAFE">
      {[[-52, -44, 7], [58, -30, 5], [40, 52, 6], [-60, 40, 4]].map(([x, y, s], i) => (
        <path key={i} d="M0 -1 C.3 -.3 .3 -.3 1 0 C.3 .3 .3 .3 0 1 C-.3 .3 -.3 .3 -1 0 C-.3 -.3 -.3 -.3 0 -1 Z" transform={`translate(${x} ${y}) scale(${s * 2})`} />
      ))}
    </g>
  ),

  stars: () => (
    <g fill="#E6FBFF">
      {[[-58, -34, 3], [54, -44, 4], [60, 20, 2.6], [-46, 34, 2.4], [8, -56, 2.6]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
    </g>
  ),

  /** An open book with a ribbon marking the place. */
  book: () => (
    <g>
      <path d="M-4 -40 C-24 -50 -52 -50 -64 -42 L-64 38 C-52 30 -24 30 -4 40 Z" fill="var(--paper)" />
      <path d="M4 -40 C24 -50 52 -50 64 -42 L64 38 C52 30 24 30 4 40 Z" fill="var(--paper)" opacity=".94" />
      <path d="M-70 -44 L-70 46 C-52 36 -24 36 0 46 C24 36 52 36 70 46 L70 -44" fill="none" stroke="url(#rf-cover)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {lines(-52, -26, [38, 34, 40, 30], 12, 0.28)}
      {lines(14, -26, [36, 40, 32, 38], 12, 0.28)}
      <path d="M30 -47 L30 -6 L38 -14 L46 -6 L46 -49 Z" fill="#22D3EE" />
    </g>
  ),

  /** Lightning, for Frankenstein. */
  bolt: () => (
    <path d="M10 -58 L-28 8 H-4 L-14 58 L30 -12 H6 Z" fill="url(#rf-cy)" stroke="#E6FBFF" strokeWidth="2.5" strokeLinejoin="round" />
  ),

  /** A magnifying glass over a clue. */
  lens: () => (
    <g>
      <circle cx="-8" cy="-8" r="34" fill="#E6FBFF" fillOpacity=".16" stroke="var(--ink)" strokeWidth="9" />
      <path d="M17 17 L48 48" stroke="var(--ink)" strokeWidth="11" strokeLinecap="round" />
      <path d="M-26 -18 A22 22 0 0 1 -8 -32" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".7" />
    </g>
  ),

  /** A teacup on its saucer, for a certain tea party. */
  cup: () => (
    <g>
      <path d="M-34 -14 h68 v22 a34 34 0 0 1 -68 0 Z" fill="var(--paper)" />
      <path d="M34 -6 h10 a12 12 0 0 1 0 24 h-12" fill="none" stroke="var(--paper)" strokeWidth="6" strokeLinecap="round" />
      <ellipse cy="46" rx="48" ry="8" fill="var(--paper)" opacity=".85" />
      <path d="M-24 4 h48" stroke="#22D3EE" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  steam: () => (
    <g fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" opacity=".5">
      <path d="M-14 -26 c-8 -10 8 -16 0 -30" /><path d="M6 -26 c-8 -10 8 -16 0 -30" /><path d="M24 -26 c-6 -8 6 -12 0 -22" />
    </g>
  ),

  /** A globe, with an orbit round it. */
  globe: () => (
    <g>
      <circle r="46" fill="url(#rf-globe)" />
      <g fill="none" stroke="#fff" strokeWidth="1.6" opacity=".32">
        <ellipse rx="46" ry="15" /><ellipse rx="15" ry="46" /><ellipse rx="31" ry="46" /><path d="M-46 0 h92" />
      </g>
      <path d="M-30 -20 C-16 -34 -2 -24 -8 -10 C-14 2 -28 -2 -30 -20 Z" fill="#7FE0B0" opacity=".9" />
      <path d="M10 6 C24 -2 36 8 30 22 C24 34 8 28 10 6 Z" fill="#7FE0B0" opacity=".9" />
    </g>
  ),
  orbit: () => (
    <g fill="none" stroke="#fff" opacity=".55">
      <ellipse rx="68" ry="20" strokeWidth="1.6" strokeDasharray="3 6" transform="rotate(-22)" />
      <circle cx="-64" cy="14" r="5" fill="#E6FBFF" stroke="none" transform="rotate(-22)" />
    </g>
  ),

  /** A tortoise, for the slow patient work of evolution. */
  turtle: () => (
    <g>
      <path d="M-38 10 A38 34 0 0 1 38 10 Z" fill="url(#rf-shell)" />
      <path d="M-20 10 L-11 -16 M0 10 L0 -22 M20 10 L11 -16 M-29 -2 h58" stroke="#1F6E4B" strokeWidth="2.2" fill="none" opacity=".7" />
      <circle cx="52" cy="0" r="11" fill="#8BE0B4" /><circle cx="55" cy="-3" r="2.4" fill="#12302A" />
      <rect x="-30" y="10" width="16" height="13" rx="6.5" fill="#5DBB8A" /><rect x="14" y="10" width="16" height="13" rx="6.5" fill="#5DBB8A" />
      <path d="M-38 8 L-52 14 L-38 14 Z" fill="#5DBB8A" />
    </g>
  ),

  /** A reading lamp. */
  lamp: () => (
    <g>
      <path d="M-28 -36 L28 -36 L48 16 L-48 16 Z" fill="#FFF3C4" opacity=".16" />
      <path d="M-15 -52 L15 -52 L28 -36 L-28 -36 Z" fill="url(#rf-cy)" />
      <path d="M0 -36 L0 -4 L-22 26 L-8 46" fill="none" stroke="var(--ink)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="-4" cy="50" rx="28" ry="7.5" fill="var(--ink)" opacity=".9" />
    </g>
  ),

  /** An hourglass, for time. */
  hourglass: () => (
    <g>
      <path d="M-26 -50 H26 M-26 50 H26" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round" />
      <path d="M-20 -46 C-20 -10 -4 -6 0 0 C-4 6 -20 10 -20 46 H20 C20 10 4 6 0 0 C4 -6 20 -10 20 -46 Z" fill="#E6FBFF" fillOpacity=".14" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M-14 -40 C-12 -18 -4 -10 0 -6 C4 -10 12 -18 14 -40 Z" fill="url(#rf-cy)" />
      <path d="M0 -4 V32" stroke="#22D3EE" strokeWidth="2.4" />
      <path d="M-16 46 C-12 28 12 28 16 46 Z" fill="url(#rf-cy)" />
    </g>
  ),

  /** A crescent moon. */
  moon: () => <path d="M22 -50 A54 54 0 1 0 22 50 A42 42 0 1 1 22 -50 Z" fill="#FBF6DC" />,

  /** A compass, for a treasure map. */
  compass: () => (
    <g>
      <circle r="50" fill="#E6FBFF" fillOpacity=".12" stroke="var(--ink)" strokeWidth="6" />
      <g stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" opacity=".7">
        <path d="M0 -50 V-40 M0 50 V40 M-50 0 H-40 M50 0 H40" />
      </g>
    </g>
  ),
  needle: () => (
    <g>
      <path d="M0 -40 L9 0 L-9 0 Z" fill="#22D3EE" />
      <path d="M0 40 L9 0 L-9 0 Z" fill="#E6FBFF" />
      <circle r="4.5" fill="var(--ink)" />
    </g>
  ),

  /** A whale, with its spout. */
  whale: () => (
    <g>
      <path d="M-62 8 C-62 -26 -12 -38 22 -24 C44 -14 52 4 62 -16 C66 -24 78 -26 82 -17 C78 -4 72 8 60 14 C40 36 -46 40 -62 8 Z" fill="url(#rf-whale)" />
      <path d="M-56 12 C-40 30 20 32 48 14 C20 22 -28 22 -56 12 Z" fill="#E6FBFF" opacity=".5" />
      <circle cx="-38" cy="-4" r="3.4" fill="#05222B" />
    </g>
  ),
  spout: () => (
    <g fill="none" stroke="#E6FBFF" strokeWidth="4" strokeLinecap="round" opacity=".8">
      <path d="M-30 -34 V-52" /><path d="M-30 -52 l-9 -8 M-30 -52 l9 -8" />
    </g>
  ),
  waves: () => (
    <path d="M-72 40 q9 -9 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" fill="none" stroke="#7FE6F6" strokeWidth="4" strokeLinecap="round" opacity=".7" />
  ),

  /** A framed photograph. */
  frame: () => (
    <g>
      <rect x="-60" y="-46" width="120" height="92" rx="12" fill="var(--paper)" />
      <g transform="translate(0 -2)">{landscape(104, 74)}</g>
    </g>
  ),

  /** A stack of books. */
  stack: () => (
    <g>
      <rect x="-56" y="24" width="112" height="22" rx="4" fill="#7C6FD8" />
      <rect x="-50" y="2" width="100" height="22" rx="4" fill="#22D3EE" transform="rotate(-2)" />
      <rect x="-46" y="-20" width="92" height="22" rx="4" fill="#5EEAD4" transform="rotate(2)" />
      <g fill="#fff" opacity=".55"><rect x="-42" y="31" width="52" height="3.5" rx="1.75" /><rect x="-36" y="9" width="46" height="3.5" rx="1.75" /><rect x="-32" y="-13" width="42" height="3.5" rx="1.75" /></g>
    </g>
  ),

  /** A chess pawn, for strategy. */
  pawn: () => (
    <g fill="url(#rf-cy)">
      <circle cy="-34" r="16" />
      <rect x="-20" y="-20" width="40" height="8" rx="4" />
      <path d="M-14 -12 C-14 10 -26 24 -30 34 H30 C26 24 14 10 14 -12 Z" />
      <rect x="-36" y="34" width="72" height="12" rx="6" />
    </g>
  ),

  /** A leaf, for a life in the woods. */
  leaf: () => (
    <g>
      <path d="M-4 52 C-48 36 -50 -18 -2 -52 C44 -22 46 28 -4 52 Z" fill="url(#rf-leaf)" />
      <path d="M-4 52 C-8 20 -6 -10 -2 -46" fill="none" stroke="#1F7F5A" strokeWidth="3" strokeLinecap="round" />
      <path d="M-6 10 l-18 -14 M-5 -8 l16 -12 M-5 26 l16 -12" fill="none" stroke="#1F7F5A" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </g>
  ),
};
