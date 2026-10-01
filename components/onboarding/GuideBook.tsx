/**
 * The guide: an open book that is alive. Its pages turn, one word on a page is lit the
 * way a tapped word is in the reader, and letters from other alphabets lift off it and
 * rise like thoughts. It is the app's own picture of what the app does: words on a page
 * becoming a language that is yours. Quiet, it turns a page now and then and breathes;
 * `talking`, the pages turn faster and the letters rise quicker, so it seems to be
 * telling you something.
 *
 * Drawn in SVG, moved with CSS (app/welcome/welcome.css, `.gb-*`), and still when the
 * reader has asked for less motion. Sized by its container.
 */

/* The letters that rise: one from each of several writing systems. `x` is how far each
   drifts sideways, `y` where it ends up (and where it rests when nothing moves). */
const GLYPHS: readonly { ch: string; x: number; y: number; d: number; c: string; s: number }[] = [
  { ch: "A", x: -62, y: -78, d: 0, c: "#0E7490", s: 17 },
  { ch: "語", x: 4, y: -96, d: 0.7, c: "#0891B2", s: 17 },
  { ch: "ñ", x: 58, y: -72, d: 1.4, c: "#164E63", s: 18 },
  { ch: "ع", x: -30, y: -108, d: 2.1, c: "#06B6D4", s: 18 },
  { ch: "ж", x: 34, y: -112, d: 2.8, c: "#0E7490", s: 16 },
  { ch: "ह", x: -78, y: -50, d: 3.5, c: "#0891B2", s: 17 },
  { ch: "한", x: 76, y: -48, d: 4.2, c: "#06B6D4", s: 16 },
  { ch: "é", x: -8, y: -64, d: 4.9, c: "#164E63", s: 18 },
];

const SPARKS: readonly [number, number, number, number][] = [[34, 84, 5, 0], [208, 70, 4, 1.1], [176, 40, 4.5, 2.2]];

const spark = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

/** The text lines of a page, curved like the page. `side` flips them to the right-hand page. */
function Lines({ side }: { side: 1 | -1 }) {
  const x = (n: number) => (side === 1 ? n : 240 - n);
  const ends = [108, 100, 110, 96, 104];
  return (
    <g fill="none" stroke="#0891B2" strokeLinecap="round" strokeWidth="2.6" opacity=".34">
      {ends.map((end, i) => (
        <path key={i} d={`M${x(46)} ${137 + i * 10} C ${x(66)} ${132 + i * 10}, ${x(92)} ${133 + i * 10}, ${x(end)} ${142 + i * 10}`} />
      ))}
    </g>
  );
}

export function GuideBook({ talking, className = "" }: { talking: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={`gb ${talking ? "gb-talk" : ""} ${className}`} aria-hidden>
      <defs>
        <radialGradient id="gb-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#22D3EE" stopOpacity=".45" />
          <stop offset=".55" stopColor="#06B6D4" stopOpacity=".14" />
          <stop offset="1" stopColor="#0891B2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gb-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0E7490" />
          <stop offset="1" stopColor="#082F3E" />
        </linearGradient>
        {/* Each page is paper-white at the outer edge and shaded toward the spine. */}
        <linearGradient id="gb-page-l" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#A9E1EE" />
          <stop offset=".3" stopColor="#E6F8FB" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id="gb-page-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A9E1EE" />
          <stop offset=".3" stopColor="#E6F8FB" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      <circle className="gb-glow" cx="120" cy="140" r="112" fill="url(#gb-glow)" />

      {/* Letters rising off the pages. */}
      <g fontFamily="var(--font-display), 'Iowan Old Style', Georgia, 'Noto Sans', system-ui, sans-serif" fontWeight="700" textAnchor="middle">
        {GLYPHS.map((g) => (
          <text key={g.ch} className="gb-g" x="120" y="146" fill={g.c} fontSize={g.s + 2}
                style={{ ["--x" as string]: `${g.x}px`, ["--y" as string]: `${g.y}px`, animationDelay: `${g.d}s` }}>{g.ch}</text>
        ))}
      </g>

      {SPARKS.map(([x, y, r, d], i) => (
        <path key={i} className="gb-spark" d={spark(x, y, r)} fill="#7DE3F4" style={{ animationDelay: `${d}s` }} />
      ))}

      <ellipse className="gb-shadow" cx="120" cy="216" rx="84" ry="7" fill="#082F3E" opacity=".16" />

      <g className="gb-book">
        {/* The cover, showing a little past the pages on every side. */}
        <path d="M120 132 C 96 114, 58 111, 28 121 L 28 195 C 60 188, 98 192, 120 209 C 142 192, 180 188, 212 195 L 212 121 C 182 111, 144 114, 120 132 Z" fill="url(#gb-cover)" />
        <path d="M120 134 L 120 208" stroke="#04222B" strokeOpacity=".45" strokeWidth="2" />
        {/* The thickness of the pages, as fine lines under each. */}
        <g fill="none" stroke="#CFEFF6" strokeWidth="1.3" strokeLinecap="round" opacity=".9">
          <path d="M36 190 C 62 183, 98 187, 120 203" />
          <path d="M38 192.5 C 64 186, 98 190, 120 205.5" opacity=".6" />
          <path d="M204 190 C 178 183, 142 187, 120 203" />
          <path d="M202 192.5 C 176 186, 142 190, 120 205.5" opacity=".6" />
        </g>

        <path d="M120 134 C 98 119, 62 115, 34 123 L 34 188 C 62 181, 98 185, 120 201 Z" fill="url(#gb-page-l)" />
        <Lines side={1} />
        <path d="M120 134 C 142 119, 178 115, 206 123 L 206 188 C 178 181, 142 185, 120 201 Z" fill="url(#gb-page-r)" />
        <Lines side={-1} />
        {/* The word that is lit, as a tapped word is in the reader. */}
        <rect className="gb-word" x="156" y="145" width="26" height="8" rx="4" fill="#22D3EE" transform="rotate(-6 169 149)" />

        {/* A page turning over, from the right-hand side to the left. */}
        <g className="gb-flip">
          <path d="M120 134 C 142 119, 178 115, 206 123 L 206 188 C 178 181, 142 185, 120 201 Z" fill="url(#gb-page-r)" stroke="#BDEAF3" strokeWidth="1" />
          <Lines side={-1} />
        </g>
      </g>
    </svg>
  );
}
