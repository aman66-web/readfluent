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

  /** A phone, for the scrolling this app would replace. */
  phone: () => (
    <g>
      <rect x="-30" y="-56" width="60" height="112" rx="12" fill="#10222B" stroke="#CFFAFE" strokeWidth="3" />
      <rect x="-24" y="-48" width="48" height="90" rx="6" fill="url(#rf-cy)" opacity=".9" />
      <g stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".85"><path d="M-14 -30 h28" /><path d="M-14 -18 h20" /><path d="M-14 -6 h24" /></g>
      <circle cy="49" r="3.4" fill="#CFFAFE" opacity=".8" />
    </g>
  ),

  /** The dictionary card that opens when a word is tapped. */
  wordcard: () => (
    <g>
      <rect x="-56" y="-34" width="112" height="70" rx="13" fill="var(--paper)" />
      <text x="-42" y="-8" fontSize="24" fontWeight="700" fontFamily="var(--font-display), Georgia, serif" fill="#0E7490">fortune</text>
      <text x="-42" y="8" fontSize="9" letterSpacing="1" fill={PAGE_INK} opacity=".55" fontFamily="var(--font-jakarta), sans-serif">NOUN · /ˈfɔː.tʃuːn/</text>
      {lines(-42, 20, [68, 42], 9, 0.3)}
    </g>
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

  /* ── More pictures, so that a library of hundreds of books has one for each ───────────── */
  heart: () => <path d="M0 44 C-66 -4 -48 -54 -20 -46 C-9 -43 0 -33 0 -24 C0 -33 9 -43 20 -46 C48 -54 66 -4 0 44 Z" fill="url(#rf-cy)" stroke="#E6FBFF" strokeWidth="2.5" strokeLinejoin="round" />,
  key: () => (
    <g fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="-34" cy="0" r="19" /><path d="M-15 0 H58 M40 0 V18 M54 0 V12" />
    </g>
  ),
  house: () => (
    <g>
      <path d="M-56 -4 L0 -52 L56 -4" fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M-42 -8 V46 H42 V-8 L0 -42 Z" fill="var(--paper)" opacity=".95" /><rect x="-10" y="14" width="20" height="32" rx="3" fill="url(#rf-cover)" />
    </g>
  ),
  crown: () => <path d="M-54 36 L-60 -28 L-30 -2 L0 -46 L30 -2 L60 -28 L54 36 Z" fill="url(#rf-cy)" stroke="#E6FBFF" strokeWidth="3" strokeLinejoin="round" />,
  mountain: () => (
    <g>
      <path d="M-70 46 L-22 -34 L6 10 L28 -18 L70 46 Z" fill="url(#rf-whale)" />
      <path d="M-22 -34 L-36 -10 L-24 -16 L-14 -8 Z M28 -18 L18 -2 L28 -6 L36 0 Z" fill="#F2FCFE" />
    </g>
  ),
  rocket: () => (
    <g>
      <path d="M0 -58 C26 -34 28 4 20 30 H-20 C-28 4 -26 -34 0 -58 Z" fill="var(--paper)" />
      <circle cx="0" cy="-12" r="10" fill="url(#rf-cover)" />
      <path d="M-20 14 L-40 40 L-20 34 Z M20 14 L40 40 L20 34 Z" fill="url(#rf-cy)" /><path d="M-8 34 L0 58 L8 34 Z" fill="#E6FBFF" />
    </g>
  ),
  tree: () => (
    <g>
      <rect x="-6" y="14" width="12" height="40" rx="3" fill="#1F7F5A" />
      <circle cx="0" cy="-22" r="30" fill="url(#rf-leaf)" /><circle cx="-24" cy="2" r="22" fill="url(#rf-leaf)" /><circle cx="24" cy="2" r="22" fill="url(#rf-leaf)" />
    </g>
  ),
  flame: () => <path d="M0 -58 C8 -30 38 -16 38 14 C38 40 20 52 0 52 C-20 52 -38 40 -38 14 C-38 -2 -24 -10 -20 -26 C-10 -16 -2 -34 0 -58 Z" fill="#E6FBFF" stroke="#22D3EE" strokeWidth="4" strokeLinejoin="round" />,
  sun: () => (
    <g>
      <circle r="26" fill="#FBF6DC" />
      <g stroke="#FBF6DC" strokeWidth="6" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M0 -40 V-56" transform={`rotate(${a})`} />)}</g>
    </g>
  ),
  feather: () => (
    <g>
      <path d="M44 -52 C-6 -44 -46 -6 -44 44 C-6 38 40 8 44 -52 Z" fill="var(--paper)" />
      <path d="M44 -52 C10 -20 -22 10 -48 54" fill="none" stroke="url(#rf-cover)" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  shield: () => (
    <g>
      <path d="M0 -54 L46 -38 V6 C46 34 22 48 0 56 C-22 48 -46 34 -46 6 V-38 Z" fill="url(#rf-cy)" stroke="#E6FBFF" strokeWidth="3" strokeLinejoin="round" />
      <path d="M0 -34 V36 M-24 -8 H24" stroke="#E6FBFF" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  anchor: () => (
    <g fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-42" r="9" /><path d="M0 -33 V50 M-20 -14 H20 M-48 10 C-44 40 -20 52 0 50 C20 52 44 40 48 10" />
    </g>
  ),
  scroll: () => (
    <g>
      <rect x="-44" y="-40" width="88" height="80" rx="6" fill="var(--paper)" />
      <rect x="-54" y="-48" width="20" height="96" rx="10" fill="url(#rf-cover)" /><rect x="34" y="-48" width="20" height="96" rx="10" fill="url(#rf-cover)" />
      {lines(-26, -22, [52, 44, 50, 36], 14, 0.3)}
    </g>
  ),
  brain: () => (
    <g>
      <path d="M-4 -44 C-30 -56 -58 -36 -50 -10 C-64 0 -58 30 -34 32 C-30 50 -6 54 -4 40 Z" fill="url(#rf-cy)" />
      <path d="M4 -44 C30 -56 58 -36 50 -10 C64 0 58 30 34 32 C30 50 6 54 4 40 Z" fill="url(#rf-cover)" />
      <path d="M-30 -20 C-18 -14 -18 0 -30 6 M30 -20 C18 -14 18 0 30 6" fill="none" stroke="#E6FBFF" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  dumbbell: () => (
    <g fill="url(#rf-cy)" stroke="#E6FBFF" strokeWidth="2">
      <rect x="-56" y="-28" width="14" height="56" rx="4" /><rect x="-42" y="-18" width="12" height="36" rx="3" />
      <rect x="42" y="-28" width="14" height="56" rx="4" /><rect x="30" y="-18" width="12" height="36" rx="3" /><rect x="-30" y="-6" width="60" height="12" rx="4" />
    </g>
  ),
  apple: () => (
    <g>
      <path d="M0 -26 C-30 -44 -56 -14 -44 18 C-38 40 -18 54 0 46 C18 54 38 40 44 18 C56 -14 30 -44 0 -26 Z" fill="url(#rf-leaf)" />
      <path d="M0 -26 C0 -38 6 -46 12 -50" fill="none" stroke="#1F7F5A" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  coin: () => (
    <g>
      <circle r="50" fill="url(#rf-cy)" stroke="#E6FBFF" strokeWidth="4" /><circle r="36" fill="none" stroke="#E6FBFF" strokeWidth="3" opacity=".8" />
      <path d="M0 -20 V20 M-12 -8 C-12 -22 12 -22 12 -8 C12 4 -12 4 -12 14 C-12 26 12 26 12 14" fill="none" stroke="#E6FBFF" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  chart: () => (
    <g>
      <path d="M-56 50 H56" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      <rect x="-46" y="8" width="20" height="36" rx="3" fill="url(#rf-cover)" /><rect x="-10" y="-16" width="20" height="60" rx="3" fill="url(#rf-cy)" /><rect x="26" y="-44" width="20" height="88" rx="3" fill="#E6FBFF" />
    </g>
  ),
  castle: () => (
    <g fill="var(--paper)">
      <path d="M-56 50 V-10 H-44 V-22 H-32 V-10 H-18 V-22 H-6 V-34 H6 V-22 H18 V-10 H32 V-22 H44 V-10 H56 V50 Z" />
      <path d="M-12 50 V22 C-12 4 12 4 12 22 V50 Z" fill="url(#rf-cover)" />
    </g>
  ),
  sword: () => (
    <g>
      <path d="M0 -58 L9 22 H-9 Z" fill="#E6FBFF" /><rect x="-26" y="22" width="52" height="9" rx="4" fill="url(#rf-cy)" /><rect x="-5" y="31" width="10" height="24" rx="4" fill="url(#rf-cover)" />
    </g>
  ),
  ring: () => (
    <g>
      <circle cy="14" r="34" fill="none" stroke="url(#rf-cy)" strokeWidth="11" />
      <path d="M-14 -22 L0 -44 L14 -22 L0 -12 Z" fill="#E6FBFF" stroke="#22D3EE" strokeWidth="3" strokeLinejoin="round" />
    </g>
  ),
  envelope: () => (
    <g>
      <rect x="-56" y="-36" width="112" height="76" rx="8" fill="var(--paper)" />
      <path d="M-56 -30 L0 10 L56 -30" fill="none" stroke="url(#rf-cover)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  ),
  dove: () => (
    <g>
      <path d="M-56 6 C-30 -4 -18 -30 -4 -34 C-6 -46 8 -54 18 -46 C26 -52 40 -44 38 -34 L52 -30 L36 -24 C32 8 6 36 -26 30 C-40 26 -52 18 -56 6 Z" fill="var(--paper)" />
      <path d="M-18 -4 C-4 -30 14 -50 30 -62 C28 -36 14 -12 -2 6 Z" fill="url(#rf-cy)" opacity=".9" />
    </g>
  ),
  lotus: () => (
    <g>
      <path d="M0 40 C-26 22 -26 -20 0 -50 C26 -20 26 22 0 40 Z" fill="url(#rf-cy)" />
      <path d="M-4 42 C-44 36 -62 6 -58 -22 C-30 -14 -10 8 -4 42 Z M4 42 C44 36 62 6 58 -22 C30 -14 10 8 4 42 Z" fill="#E6FBFF" opacity=".92" />
    </g>
  ),
  dna: () => (
    <g fill="none" strokeLinecap="round">
      <path d="M-26 -54 C30 -34 -30 -14 26 6 C-30 26 30 46 -26 56" stroke="url(#rf-cy)" strokeWidth="7" />
      <path d="M26 -54 C-30 -34 30 -14 -26 6 C30 26 -30 46 26 56" stroke="#E6FBFF" strokeWidth="7" opacity=".9" />
      <path d="M-14 -38 H14 M-18 -4 H18 M-14 30 H14" stroke="var(--ink)" strokeWidth="4" opacity=".6" />
    </g>
  ),
  telescope: () => (
    <g>
      <g transform="rotate(-24)"><rect x="-56" y="-16" width="86" height="30" rx="6" fill="url(#rf-cover)" /><rect x="22" y="-22" width="36" height="42" rx="6" fill="url(#rf-cy)" /></g>
      <path d="M-4 20 L-26 56 M-4 20 L16 56 M-4 20 V56" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  pyramid: () => (
    <g>
      <path d="M-62 46 L0 -46 L62 46 Z" fill="url(#rf-cy)" /><path d="M0 -46 L62 46 H8 Z" fill="#0891B2" opacity=".7" />
      <path d="M-30 4 H30 M-46 28 H46" stroke="#E6FBFF" strokeWidth="3" opacity=".7" />
    </g>
  ),
  ship: () => (
    <g>
      <path d="M-58 14 H58 L40 44 H-40 Z" fill="url(#rf-cover)" /><path d="M0 -52 V12" stroke="var(--ink)" strokeWidth="5" />
      <path d="M4 -48 C34 -34 40 -10 38 8 H4 Z M-4 -40 C-24 -26 -30 -8 -30 8 H-4 Z" fill="var(--paper)" />
    </g>
  ),
  train: () => (
    <g>
      <rect x="-50" y="-34" width="100" height="62" rx="12" fill="url(#rf-cover)" /><rect x="-36" y="-22" width="30" height="24" rx="4" fill="#E6FBFF" /><rect x="6" y="-22" width="30" height="24" rx="4" fill="#E6FBFF" />
      <circle cx="-26" cy="38" r="9" fill="var(--paper)" /><circle cx="26" cy="38" r="9" fill="var(--paper)" /><path d="M-62 52 H62" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  footprints: () => (
    <g fill="var(--ink)" opacity=".9">
      <ellipse cx="-22" cy="-18" rx="12" ry="22" transform="rotate(-10 -22 -18)" /><ellipse cx="-24" cy="20" rx="8" ry="10" />
      <ellipse cx="24" cy="2" rx="12" ry="22" transform="rotate(10 24 2)" /><ellipse cx="26" cy="38" rx="8" ry="10" />
    </g>
  ),
  candle: () => (
    <g>
      <rect x="-16" y="-8" width="32" height="58" rx="5" fill="var(--paper)" />
      <path d="M0 -50 C10 -34 16 -26 0 -14 C-16 -26 -10 -34 0 -50 Z" fill="#FFF3C4" /><path d="M0 -8 V-14" stroke="var(--ink)" strokeWidth="3" />
    </g>
  ),
  mask: () => (
    <g>
      <path d="M-52 -30 C-20 -44 20 -44 52 -30 C54 8 30 40 0 44 C-30 40 -54 8 -52 -30 Z" fill="var(--paper)" />
      <path d="M-34 -10 C-26 -18 -14 -16 -8 -8 C-14 2 -28 4 -34 -10 Z M34 -10 C26 -18 14 -16 8 -8 C14 2 28 4 34 -10 Z" fill="url(#rf-cover)" />
      <path d="M-18 22 C-8 30 8 30 18 22" fill="none" stroke="url(#rf-cover)" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  lighthouse: () => (
    <g>
      <path d="M-18 50 L-10 -22 H10 L18 50 Z" fill="var(--paper)" /><path d="M-14 6 H14 M-16 28 H16" stroke="url(#rf-cover)" strokeWidth="6" />
      <rect x="-14" y="-40" width="28" height="18" rx="3" fill="#FFF3C4" /><path d="M-18 -40 L0 -56 L18 -40 Z" fill="url(#rf-cy)" />
    </g>
  ),
  question: () => <path d="M-26 -22 C-26 -56 26 -56 26 -24 C26 -6 2 -6 2 14 M2 34 V42" fill="none" stroke="url(#rf-cy)" strokeWidth="13" strokeLinecap="round" />,
  handshake: () => (
    <g>
      <path d="M-62 -10 L-30 -30 L2 -14 L34 -30 L62 -10 L48 30 L10 46 L-10 40 L-48 30 Z" fill="var(--paper)" />
      <path d="M-30 -30 L-6 6 L16 -6 M2 -14 L22 14" fill="none" stroke="url(#rf-cover)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  bridge: () => (
    <g fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round">
      <path d="M-62 14 H62 M-50 14 C-30 -34 30 -34 50 14 M-30 -6 V14 M-10 -14 V14 M10 -14 V14 M30 -6 V14" /><path d="M-62 36 H62" opacity=".5" />
    </g>
  ),
};
