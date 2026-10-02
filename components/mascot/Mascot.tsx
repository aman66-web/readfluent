/**
 * The app's mascot, an owl who sits on an open book (its name is `MASCOT_NAME` in lib/brand.ts).
 * An owl is the old picture of someone who reads: calm, watchful and wise. Dewey is the app's
 * guide: it says hello, reads along, cheers when you level up and dozes off when you have been away.
 * Drawn flat and quiet on purpose, in the app's own cyan and ink, so it sits beside a grown-up's
 * book rather than a child's toy.
 *
 * Drawn in SVG and moved with CSS (app/globals.css, `.lx-*`). Sized by its container. The
 * poses (`mood`):
 *
 *   hello    one wing raised in a wave   reading   eyes down on the page, a letter lifting off it
 *   cheer    both wings up, eyes closed in a smile   sleepy    eyes closed, a slow breath, floating z's
 *   ready    eyes wide with a catch of light: eager to begin
 *
 * `talking` makes the beak move and the bob quicken (the guide saying a line). `crop="head"`
 * shows just the head and shoulders.
 */

export type Mood = "hello" | "reading" | "cheer" | "sleepy" | "ready";

const BODY = "url(#lx-body)";
const WING = "#0A5C73";
const FACE = "#E8F9FC";
const RING = "#A5F3FC";
const BEAK = "#22D3EE";
const INK = "#0B3B4A";

const spark = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

/** The beak, and its lower half moving while the guide talks. */
function Beak({ talking }: { talking: boolean }) {
  return (
    <g>
      {talking && <path className="lx-talk" d="M115 127 L125 127 L120 139 Z" fill={WING} />}
      <path d="M113.5 119.5 L126.5 119.5 L120 132 Z" fill={BEAK} stroke={BEAK} strokeWidth="2.4" strokeLinejoin="round" />
    </g>
  );
}

/** Two round eyes in pale discs: a small dark pupil with one catch of light, or closed lids. */
function Eyes({ mood }: { mood: Mood }) {
  const discs = (
    <g fill={FACE} stroke={RING} strokeWidth="3">
      <circle cx="100" cy="108" r="23" /><circle cx="140" cy="108" r="23" />
    </g>
  );
  if (mood === "cheer") {
    // Closed in a smile, ^ ^
    return <g>{discs}<g fill="none" stroke={INK} strokeWidth="4.4" strokeLinecap="round"><path d="M88 113 Q100 98 112 113" /><path d="M128 113 Q140 98 152 113" /></g></g>;
  }
  if (mood === "sleepy") {
    return <g>{discs}<g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round"><path d="M88 106 Q100 117 112 106" /><path d="M128 106 Q140 117 152 106" /></g></g>;
  }
  const big = mood === "ready";
  const r = big ? 11 : 9;
  const dy = mood === "reading" ? 6 : 0;
  return (
    <g>
      {discs}
      <g className="lx-blink">
        <circle cx="100" cy={108 + dy} r={r} fill={INK} /><circle cx="140" cy={108 + dy} r={r} fill={INK} />
        <circle cx={103.5} cy={104.5 + dy} r={big ? 3.6 : 2.8} fill="#fff" /><circle cx={143.5} cy={104.5 + dy} r={big ? 3.6 : 2.8} fill="#fff" />
      </g>
      {big && <path d={spark(158, 82, 4)} fill="#fff" opacity=".9" />}
    </g>
  );
}

export function Mascot({ mood = "hello", talking = false, crop, className = "" }: { mood?: Mood; talking?: boolean; crop?: "head"; className?: string }) {
  const up = mood === "cheer";
  return (
    <svg viewBox={crop === "head" ? "52 46 136 112" : "0 0 240 240"} className={`lx ${crop ? "lx-cropped" : ""} ${talking ? "lx-talking" : ""} lx-${mood} ${className}`} aria-hidden>
      <defs>
        <linearGradient id="lx-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1089A6" /><stop offset="1" stopColor="#0B6580" />
        </linearGradient>
        <linearGradient id="lx-page" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#B5E5F0" /><stop offset=".25" stopColor="#E9F9FC" /><stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id="lx-page-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B5E5F0" /><stop offset=".25" stopColor="#E9F9FC" /><stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      <ellipse className="lx-shadow" cx="120" cy="236" rx="92" ry="3.5" fill="#082F3E" opacity=".16" />

      {/* A letter lifting off the page while it reads, and sleepy z's. */}
      {mood === "reading" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" textAnchor="middle" fill="#0891B2">
          <text className="lx-rise" x="46" y="196" fontSize="20">é</text>
          <text className="lx-rise" style={{ animationDelay: "1.2s" }} x="66" y="178" fontSize="20">語</text>
        </g>
      )}
      {mood === "sleepy" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" fill="#0891B2">
          <text className="lx-z" x="178" y="56" fontSize="22">z</text>
          <text className="lx-z" style={{ animationDelay: "1.1s" }} x="194" y="40" fontSize="16">z</text>
        </g>
      )}
      {up && [[34, 62, 5], [206, 58, 6], [22, 128, 4], [218, 122, 4.5]].map(([x, y, r], i) => (
        <path key={i} className="lx-spark" style={{ animationDelay: `${i * 0.3}s` }} fill="#7DE3F4" d={spark(x, y, r)} />
      ))}

      <g className="lx-bob">
        <g className="lx-head">
          {/* Ear tufts, and the body that is also the head. */}
          <g className="lx-ant">
            <path d="M80 86 L71 55 L103 75 Z" fill={BODY} stroke={BODY} strokeWidth="3" strokeLinejoin="round" />
            <path d="M160 86 L169 55 L137 75 Z" fill={BODY} stroke={BODY} strokeWidth="3" strokeLinejoin="round" />
          </g>
          <path d="M120 68 C 84 68, 63 98, 63 140 C 63 188, 87 216, 120 216 C 153 216, 177 188, 177 140 C 177 98, 156 68, 120 68 Z" fill={BODY} />

          {/* The chest, in soft rows of feathers. */}
          <path d="M120 150 C 98 150, 86 170, 91 192 C 95 207, 107 214, 120 214 C 133 214, 145 207, 149 192 C 154 170, 142 150, 120 150 Z" fill="#D7F1F7" />
          <g fill="none" stroke="#6FBFD3" strokeWidth="2.4" strokeLinecap="round">
            <path d="M104 166 q5 5 10 0 M126 166 q5 5 10 0" />
            <path d="M99 180 q5 5 10 0 M115 180 q5 5 10 0 M131 180 q5 5 10 0" />
            <path d="M106 194 q5 5 10 0 M124 194 q5 5 10 0" />
          </g>

          {/* Brows of feathers, the face, the eyes and the beak. */}
          <g fill="none" stroke={RING} strokeWidth="3.6" strokeLinecap="round" opacity=".9">
            <path d="M80 79 Q94 71 110 78" /><path d="M130 78 Q146 71 160 79" />
          </g>
          <Eyes mood={mood} />
          <Beak talking={talking} />
        </g>

        {/* The wings: folded, one waving, or both up. */}
        <path d="M68 124 C 50 148, 52 190, 76 212 C 84 190, 87 152, 87 126 Z" fill={WING} />
        {up ? (
          <>
            <g className="lx-cheer-l"><path d="M82 128 C 56 124, 36 106, 36 80 C 50 92, 66 100, 86 106 Z" fill={WING} /></g>
            <g className="lx-cheer-r"><path d="M158 128 C 184 124, 204 106, 204 80 C 190 92, 174 100, 154 106 Z" fill={WING} /></g>
          </>
        ) : mood === "hello" ? (
          <g className="lx-wave"><path d="M158 128 C 184 124, 204 106, 204 80 C 190 92, 174 100, 154 106 Z" fill={WING} /></g>
        ) : (
          <path d="M172 124 C 190 148, 188 190, 164 212 C 156 190, 153 152, 153 126 Z" fill={WING} />
        )}
        {up && <path d="M68 124 C 50 148, 52 190, 76 212 C 84 190, 87 152, 87 126 Z" fill={WING} />}
        {up && <path d="M172 124 C 190 148, 188 190, 164 212 C 156 190, 153 152, 153 126 Z" fill={WING} />}
        {mood === "hello" && <path d="M172 124 C 176 150, 172 190, 164 212 C 156 190, 153 152, 153 126 Z" fill={WING} opacity="0" />}

        {/* The open book it sits on, in front of its feet. */}
        <path d="M30 222 C 58 216, 98 218, 120 228 C 142 218, 182 216, 210 222 L 210 229 C 182 223, 142 225, 120 235 C 98 225, 58 223, 30 229 Z" fill={INK} />
        <path d="M120 207 C 98 198, 58 196, 30 202 L 30 222 C 58 216, 98 218, 120 228 Z" fill="url(#lx-page)" />
        <path d="M120 207 C 142 198, 182 196, 210 202 L 210 222 C 182 216, 142 218, 120 228 Z" fill="url(#lx-page-r)" />
        <g fill="none" stroke="#0891B2" strokeLinecap="round" strokeWidth="2" opacity=".3">
          <path d="M44 208 C 64 205, 88 207, 106 213" /><path d="M44 215 C 64 212, 88 214, 106 220" />
          <path d="M196 208 C 176 205, 152 207, 134 213" /><path d="M196 215 C 176 212, 152 214, 134 220" />
        </g>
        <path d="M120 207 L120 228" stroke={INK} strokeOpacity=".3" strokeWidth="2" />
      </g>
    </svg>
  );
}
