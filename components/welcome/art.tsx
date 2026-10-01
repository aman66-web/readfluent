import type { ReactNode } from "react";

/**
 * The drawings on the first screen's wall: ReadFluent's own, in the same flat,
 * glowing, always-moving style as the wall they replace. Every piece is drawn
 * round its own middle (0 0) in a 200-wide tile, and is placed, scaled and
 * turned by the tile that uses it (FirstScreen.tsx).
 *
 * Colour comes from two variables the tile sets: `--ink` (line art and text:
 * light on a dark ground, dark on a light one) and `--paper` (a page).
 */

const SERIF = "var(--font-display), 'Iowan Old Style', Georgia, serif";
const SANS = "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif";

/** The gradients every tile fills with, defined once on the wall. */
export function ArtDefs() {
  return (
    <>
      <linearGradient id="rf-sun" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFD27A" /><stop offset=".55" stopColor="#EE5A2A" /><stop offset="1" stopColor="#D92C7A" />
      </linearGradient>
      <linearGradient id="rf-cover" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F07A4A" /><stop offset="1" stopColor="#B8401C" />
      </linearGradient>
      <linearGradient id="rf-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F4B8B0" /><stop offset="1" stopColor="#FBE6D4" />
      </linearGradient>
      <linearGradient id="rf-globe" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4C8FD6" /><stop offset="1" stopColor="#1B3F78" />
      </linearGradient>
      <linearGradient id="rf-shell" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7DD3A0" /><stop offset="1" stopColor="#2E8B62" />
      </linearGradient>
      <radialGradient id="rf-glow-warm"><stop offset="0" stopColor="#FFC98A" stopOpacity=".85" /><stop offset="1" stopColor="#FFC98A" stopOpacity="0" /></radialGradient>
      <radialGradient id="rf-glow-gold"><stop offset="0" stopColor="#FFD27A" stopOpacity=".9" /><stop offset="1" stopColor="#FFD27A" stopOpacity="0" /></radialGradient>
      <radialGradient id="rf-glow-pink"><stop offset="0" stopColor="#FF7AA8" stopOpacity=".8" /><stop offset="1" stopColor="#FF7AA8" stopOpacity="0" /></radialGradient>
    </>
  );
}

function glow(id: "warm" | "gold" | "pink") {
  return function Glow() {
    return <circle r="72" fill={`url(#rf-glow-${id})`} />;
  };
}

/** A drawn landscape, the same stand-in the reader uses for a page's photograph. */
const landscape = (w: number, h: number) => (
  <g>
    <clipPath id={`rf-clip-${w}`}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx="7" /></clipPath>
    <g clipPath={`url(#rf-clip-${w})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="url(#rf-sky)" />
      <circle cx={w * 0.18} cy={-h * 0.16} r={h * 0.15} fill="#FFF3DC" />
      <path d={`M${-w / 2},${h * 0.1} L${-w * 0.16},${-h * 0.12} L${w * 0.08},${h * 0.1} L${w * 0.28},${-h * 0.04} L${w / 2},${h * 0.14} L${w / 2},${h / 2} L${-w / 2},${h / 2} Z`} fill="#C99A78" />
      <path d={`M${-w / 2},${h * 0.26} L${-w * 0.2},${h * 0.08} L${w * 0.14},${h * 0.28} L${w / 2},${h * 0.12} L${w / 2},${h / 2} L${-w / 2},${h / 2} Z`} fill="#8B4A45" />
    </g>
  </g>
);

/** The ink for anything printed on a page: always dark, whatever the tile's ground, because a page is always light. */
const PAGE_INK = "#232323";

/** A few short lines standing for text. They sit on paper, so they use the page's ink, not the tile's. */
const lines = (x: number, y: number, widths: number[], gap = 9, opacity = 0.35) => (
  <g stroke={PAGE_INK} strokeWidth="4" strokeLinecap="round" opacity={opacity}>
    {widths.map((w, i) => <path key={i} d={`M${x} ${y + i * gap} h${w}`} />)}
  </g>
);

export const ART: Record<string, () => ReactNode> = {
  glowWarm: glow("warm"),
  glowGold: glow("gold"),
  glowPink: glow("pink"),

  /** Concentric rings, pulsing out from a middle. */
  ripple: () => (
    <g fill="none" stroke="#fff" opacity=".22">
      <circle r="30" strokeWidth="2" /><circle r="48" strokeWidth="2" /><circle r="66" strokeWidth="2" />
    </g>
  ),

  /** Light fanning out from behind something. */
  rays: () => (
    <g fill="#fff" opacity=".07">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0 L-9 -96 L9 -96 Z" transform={`rotate(${i * 30})`} />
      ))}
    </g>
  ),

  sparkles: () => (
    <g fill="#FFE9B8">
      {[[-52, -44, 7], [58, -30, 5], [40, 52, 6], [-60, 40, 4]].map(([x, y, s], i) => (
        <path key={i} d="M0 -1 C.3 -.3 .3 -.3 1 0 C.3 .3 .3 .3 0 1 C-.3 .3 -.3 .3 -1 0 C-.3 -.3 -.3 -.3 0 -1 Z" transform={`translate(${x} ${y}) scale(${s * 2})`} />
      ))}
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
      <path d="M30 -47 L30 -6 L38 -14 L46 -6 L46 -49 Z" fill="#E8593A" />
    </g>
  ),

  /** A quoted line and who said it. */
  quote: () => (
    <g>
      <text x="-62" y="-14" fontSize="78" fontWeight="700" fill="#E8593A" fontFamily={SERIF}>“</text>
      <g fontFamily={SERIF} fontStyle="italic" fontSize="17" fill="var(--ink)">
        <text x="-54" y="8">It is a truth</text>
        <text x="-54" y="28">universally</text>
        <text x="-54" y="48">acknowledged</text>
      </g>
      <path d="M-54 62 h14" stroke="var(--ink)" strokeWidth="1.5" opacity=".5" />
      <text x="-34" y="66" fontSize="8" letterSpacing="1.2" fill="var(--ink)" opacity=".55" fontFamily={SANS}>JANE AUSTEN, 1813</text>
    </g>
  ),

  /** Three steps, one for each band of level. */
  levels: () => (
    <g fontFamily={SANS} fontWeight="800" fontSize="20" textAnchor="middle">
      <rect x="-68" y="12" width="40" height="38" rx="10" fill="#7C6FD8" />
      <rect x="-20" y="-14" width="40" height="64" rx="10" fill="#B16FD0" />
      <rect x="28" y="-42" width="40" height="92" rx="10" fill="url(#rf-sun)" />
      <text x="-48" y="38" fill="#fff">A</text>
      <text x="0" y="38" fill="#fff">B</text>
      <text x="48" y="38" fill="#fff">C</text>
      <path d="M48 -62 l3 6 6.5 1 -4.7 4.5 1.1 6.5 -5.9 -3.1 -5.9 3.1 1.1 -6.5 -4.7 -4.5 6.5 -1 Z" fill="#FFE9B8" />
    </g>
  ),

  /** A sentence with one word picked out. */
  sentence: () => (
    <g>
      <g stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" opacity=".4">
        <path d="M-66 -26 h56" /><path d="M2 -26 h30" /><path d="M-66 -10 h30" /><path d="M10 -10 h56" />
      </g>
      <rect x="-32" y="-16" width="40" height="12" rx="6" fill="url(#rf-sun)" />
    </g>
  ),

  /** The dictionary card that opens when a word is tapped. */
  wordcard: () => (
    <g>
      <rect x="-52" y="-30" width="104" height="66" rx="13" fill="var(--paper)" />
      <text x="-38" y="-6" fontSize="22" fontWeight="700" fontFamily={SERIF} fill="#C2452A">fortune</text>
      <text x="-38" y="9" fontSize="9" letterSpacing="1" fill={PAGE_INK} opacity=".55" fontFamily={SANS}>NOUN · /ˈfɔː.tʃuːn/</text>
      {lines(-38, 20, [64, 40], 9, 0.3)}
    </g>
  ),

  /** A page of a book: a photograph over a few lines. */
  pagecard: () => (
    <g>
      <rect x="-50" y="-62" width="100" height="124" rx="13" fill="var(--paper)" opacity=".5" transform="rotate(8)" />
      <rect x="-50" y="-62" width="100" height="124" rx="13" fill="var(--paper)" />
      <g transform="translate(0 -28)">{landscape(88, 56)}</g>
      {lines(-38, 16, [74, 66, 50], 12, 0.32)}
    </g>
  ),

  /** A globe, with an orbit round it. */
  globe: () => (
    <g>
      <circle r="44" fill="url(#rf-globe)" />
      <g fill="none" stroke="#fff" strokeWidth="1.6" opacity=".32">
        <ellipse rx="44" ry="15" /><ellipse rx="15" ry="44" /><ellipse rx="30" ry="44" /><path d="M-44 0 h88" />
      </g>
      <path d="M-30 -20 C-16 -34 -2 -24 -8 -10 C-14 2 -28 -2 -30 -20 Z" fill="#6FD0A0" opacity=".85" />
      <path d="M10 6 C24 -2 36 8 30 22 C24 34 8 28 10 6 Z" fill="#6FD0A0" opacity=".85" />
    </g>
  ),
  orbit: () => (
    <g fill="none" stroke="#fff" opacity=".5">
      <ellipse rx="66" ry="20" strokeWidth="1.6" strokeDasharray="3 6" transform="rotate(-22)" />
      <circle cx="-62" cy="14" r="5" fill="#FFD27A" stroke="none" transform="rotate(-22)" />
    </g>
  ),

  /** Headphones, and the sound they carry. */
  headphones: () => (
    <g>
      <path d="M-44 14 A44 44 0 0 1 44 14" fill="none" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" />
      <rect x="-56" y="6" width="20" height="40" rx="9" fill="#E8593A" />
      <rect x="36" y="6" width="20" height="40" rx="9" fill="#E8593A" />
    </g>
  ),
  soundbars: () => (
    <g fill="var(--ink)" opacity=".85">
      {[10, 22, 34, 22, 14, 28, 16].map((h, i) => <rect key={i} x={-27 + i * 9} y={-h / 2} width="5" height={h} rx="2.5" />)}
    </g>
  ),

  /** Two flashcards, one face up. */
  flashcards: () => (
    <g>
      <rect x="-46" y="-34" width="92" height="64" rx="12" fill="#4A4A52" transform="rotate(-12)" />
      <g transform="rotate(5)">
        <rect x="-46" y="-34" width="92" height="64" rx="12" fill="var(--paper)" />
        <text x="0" y="-2" fontSize="20" fontWeight="700" textAnchor="middle" fontFamily={SERIF} fill="#C2452A">pride</text>
        <path d="M-22 12 h44" stroke={PAGE_INK} strokeWidth="3" strokeLinecap="round" opacity=".3" />
      </g>
    </g>
  ),

  /** A shelf of books. */
  shelf: () => (
    <g>
      {([[-66, 15, 54, "#E8593A"], [-49, 12, 42, "#FFD27A"], [-35, 17, 60, "#7C6FD8"], [-16, 13, 46, "#4FB4A0"], [-1, 15, 56, "#F4F1EA"], [16, 12, 40, "#D92C7A"], [30, 17, 52, "#FFB36B"], [49, 14, 44, "#6FA8E0"]] as const).map(([x, w, h, c], i) => (
        <g key={i}>
          <rect x={x} y={46 - h} width={w} height={h} rx="3" fill={c} />
          <rect x={x + 3} y={46 - h + 8} width={w - 6} height="3" rx="1.5" fill="#000" opacity=".18" />
        </g>
      ))}
      <rect x="-76" y="46" width="152" height="7" rx="3" fill="#8A5A34" />
    </g>
  ),

  /** How far through. */
  progress: () => (
    <g>
      <text x="-60" y="-26" fontSize="10" letterSpacing="1.6" fontWeight="700" fill="var(--ink)" opacity=".6" fontFamily={SANS}>PAGE 31 OF 50</text>
      <rect x="-60" y="-14" width="120" height="14" rx="7" fill="var(--ink)" opacity=".14" />
      <rect x="-60" y="-14" width="75" height="14" rx="7" fill="url(#rf-sun)" />
      <text x="-60" y="34" fontSize="34" fontWeight="800" fill="var(--ink)" fontFamily={SANS}>62%</text>
    </g>
  ),
  tick: () => (
    <g>
      <circle r="17" fill="#2FAF74" />
      <path d="M-7 0 l5 6 l10 -12" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),

  /** A reading lamp. */
  lamp: () => (
    <g>
      <path d="M-26 -36 L26 -36 L44 14 L-44 14 Z" fill="#FFD27A" opacity=".16" />
      <path d="M-14 -50 L14 -50 L26 -36 L-26 -36 Z" fill="url(#rf-sun)" />
      <path d="M0 -36 L0 -4 L-20 24 L-8 44" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="-4" cy="48" rx="26" ry="7" fill="var(--ink)" opacity=".9" />
    </g>
  ),

  /** A tortoise, for "say it again, slowly". */
  turtle: () => (
    <g>
      <path d="M-34 8 A34 31 0 0 1 34 8 Z" fill="url(#rf-shell)" />
      <path d="M-18 8 L-10 -14 M0 8 L0 -20 M18 8 L10 -14 M-26 -2 h52" stroke="#1F6E4B" strokeWidth="2" fill="none" opacity=".7" />
      <circle cx="46" cy="0" r="10" fill="#7DD3A0" /><circle cx="49" cy="-3" r="2.2" fill="#13302A" />
      <rect x="-26" y="8" width="14" height="12" rx="6" fill="#5DBB8A" /><rect x="12" y="8" width="14" height="12" rx="6" fill="#5DBB8A" />
      <path d="M-34 6 L-46 12 L-34 12 Z" fill="#5DBB8A" />
    </g>
  ),
  bubble: () => (
    <g>
      <rect x="-36" y="-14" width="72" height="28" rx="14" fill="var(--paper)" />
      <path d="M-6 14 L-12 24 L4 14 Z" fill="var(--paper)" />
      <text x="0" y="5" fontSize="16" fontStyle="italic" textAnchor="middle" fontFamily={SERIF} fill="#232323">slowly</text>
    </g>
  ),

  /** A stack of books. */
  stack: () => (
    <g>
      <rect x="-54" y="26" width="108" height="20" rx="4" fill="#D92C7A" />
      <rect x="-48" y="6" width="96" height="20" rx="4" fill="#FFB36B" transform="rotate(-2)" />
      <rect x="-44" y="-14" width="88" height="20" rx="4" fill="#4FB4A0" transform="rotate(2)" />
      <g fill="#fff" opacity=".5"><rect x="-40" y="32" width="50" height="3" rx="1.5" /><rect x="-34" y="12" width="44" height="3" rx="1.5" /><rect x="-30" y="-8" width="40" height="3" rx="1.5" /></g>
    </g>
  ),
  /** A cup of tea on top, steaming. */
  cup: () => (
    <g>
      <path d="M-16 -20 h32 v14 a16 16 0 0 1 -32 0 Z" fill="var(--paper)" />
      <path d="M16 -16 h6 a6 6 0 0 1 0 12 h-6" fill="none" stroke="var(--paper)" strokeWidth="4" />
    </g>
  ),
  steam: () => (
    <g fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" opacity=".45">
      <path d="M-8 -28 c-6 -8 6 -12 0 -22" /><path d="M6 -28 c-6 -8 6 -12 0 -22" />
    </g>
  ),

  /** A big "Aa" and a lens over it. */
  aa: () => (
    <text x="-6" y="22" fontSize="84" fontWeight="700" textAnchor="middle" fontFamily={SERIF} fill="#fff">Aa</text>
  ),
  lens: () => (
    <g fill="none" stroke="#1A1A1D" strokeWidth="7" strokeLinecap="round">
      <circle cx="-4" cy="-4" r="22" fill="#fff" fillOpacity=".18" /><path d="M12 12 L32 32" />
    </g>
  ),

  /** A framed photograph. */
  frame: () => (
    <g>
      <rect x="-60" y="-46" width="120" height="92" rx="12" fill="var(--paper)" />
      <g transform="translate(0 -2)">{landscape(104, 74)}</g>
    </g>
  ),

  /** Words met, ticked off. */
  wordlist: () => (
    <g fontFamily={SERIF} fontSize="16" fontWeight="700">
      {(["fortune", "manners", "tolerable"] as const).map((w, i) => (
        <g key={w} transform={`translate(0 ${-36 + i * 36})`}>
          <rect x="-64" y="-14" width="128" height="28" rx="14" fill="var(--paper)" />
          <text x="-48" y="6" fill="#232323">{w}</text>
          <circle cx="46" cy="0" r="9" fill={i === 2 ? "#D0CCC2" : "#2FAF74"} />
          {i < 2 && <path d="M41 0 l3.5 4 l7 -8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      ))}
    </g>
  ),
};
