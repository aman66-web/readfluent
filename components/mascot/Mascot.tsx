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
const WING = "url(#lx-wing)";
const MASK = "#EAFAFD";
const BEAK = "#22D3EE";
const INK = "#0B3B4A";

const spark = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

/** The wing raised to the right, feathered at the tip; mirrored for the left. */
const RAISED = "M156 126 C 182 124, 203 106, 207 72 L 199 80 L 200 69 L 191 79 L 190 70 L 181 84 C 174 98, 165 106, 154 110 Z";
const RAISED_LEFT = "M84 126 C 58 124, 37 106, 33 72 L 41 80 L 40 69 L 49 79 L 50 70 L 59 84 C 66 98, 75 106, 86 110 Z";
/** A folded wing down the side, its tip cut into feathers. */
const FOLDED_LEFT = "M71 118 C 52 142, 50 186, 70 212 L 75 205 L 79 213 L 84 204 L 88 210 C 91 184, 89 150, 87 124 Z";
const FOLDED_RIGHT = "M169 118 C 188 142, 190 186, 170 212 L 165 205 L 161 213 L 156 204 L 152 210 C 149 184, 151 150, 153 124 Z";

/** The beak, and its lower half moving while the guide talks. */
function Beak({ talking }: { talking: boolean }) {
  return (
    <g>
      {talking && <path className="lx-talk" d="M115.5 126 L124.5 126 L120 138 Z" fill="#0A5C73" />}
      <path d="M113 113 Q120 109 127 113 L120 130 Z" fill={BEAK} stroke="#0FA9C8" strokeWidth="1.4" strokeLinejoin="round" />
    </g>
  );
}

/** Two eyes in a pale heart-shaped face: a ring of colour round a dark pupil with a catch of light, or closed lids. */
function Eyes({ mood }: { mood: Mood }) {
  const face = (
    <g>
      <path d="M120 84 C 110 70, 77 74, 76 106 C 75 130, 99 140, 120 128 C 141 140, 165 130, 164 106 C 163 74, 130 70, 120 84 Z" fill={MASK} />
      <path d="M84 88 Q99 79 115 87 M125 87 Q141 79 156 88" fill="none" stroke="#0E7490" strokeWidth="3.2" strokeLinecap="round" opacity={mood === "ready" ? 0.95 : 0.7} transform={mood === "ready" ? "translate(0 -2)" : undefined} />
    </g>
  );
  if (mood === "cheer") {
    return <g>{face}<g fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round"><path d="M88 110 Q100 96 112 110" /><path d="M128 110 Q140 96 152 110" /></g></g>;
  }
  if (mood === "sleepy") {
    return <g>{face}<g fill="none" stroke={INK} strokeWidth="3.8" strokeLinecap="round"><path d="M88 104 Q100 114 112 104" /><path d="M128 104 Q140 114 152 104" /></g></g>;
  }
  const big = mood === "ready";
  const dy = mood === "reading" ? 5 : 0;
  const iris = big ? 13 : 11.5;
  return (
    <g>
      {face}
      <g className="lx-blink">
        {[100, 140].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={105} r="16.5" fill="#fff" stroke="#BFE9F2" strokeWidth="1.5" />
            <circle cx={cx} cy={105 + dy} r={iris} fill="#0E8FB0" />
            <circle cx={cx} cy={105 + dy} r={big ? 7.2 : 6.2} fill={INK} />
            <circle cx={cx + 4} cy={100.5 + dy} r={big ? 3.8 : 3.1} fill="#fff" />
            <circle cx={cx - 3} cy={109 + dy} r="1.3" fill="#fff" opacity=".8" />
          </g>
        ))}
      </g>
      {big && <path d={spark(160, 80, 4)} fill="#fff" opacity=".9" />}
    </g>
  );
}

export function Mascot({ mood = "hello", talking = false, crop, className = "" }: { mood?: Mood; talking?: boolean; crop?: "head"; className?: string }) {
  const up = mood === "cheer";
  return (
    <svg viewBox={crop === "head" ? "52 40 136 118" : "0 0 240 240"} className={`lx ${crop ? "lx-cropped" : ""} ${talking ? "lx-talking" : ""} lx-${mood} ${className}`} aria-hidden>
      <defs>
        <linearGradient id="lx-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#17A3C2" /><stop offset=".55" stopColor="#0E7490" /><stop offset="1" stopColor="#0A566E" />
        </linearGradient>
        <linearGradient id="lx-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0C6A84" /><stop offset="1" stopColor="#084A5F" />
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
        {/* Its feet, on the page. */}
        <g fill="#0A566E"><rect x="96" y="204" width="11" height="9" rx="4.5" /><rect x="133" y="204" width="11" height="9" rx="4.5" /></g>

        <g className="lx-head">
          {/* Ear tufts, curved, and the body that is also the head. */}
          <g className="lx-ant">
            <path d="M78 94 C 69 80, 66 62, 71 46 C 82 54, 92 64, 100 76 Z" fill={BODY} />
            <path d="M162 94 C 171 80, 174 62, 169 46 C 158 54, 148 64, 140 76 Z" fill={BODY} />
          </g>
          <path d="M120 66 C 84 66, 62 98, 62 142 C 62 190, 86 216, 120 216 C 154 216, 178 190, 178 142 C 178 98, 156 66, 120 66 Z" fill={BODY} />
          {/* A little light along the left of the head. */}
          <path d="M72 112 C 74 92, 88 76, 104 71" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".22" />

          {/* The chest, in soft rows of feathers. */}
          <path d="M120 140 C 98 140, 86 162, 91 188 C 95 205, 107 213, 120 213 C 133 213, 145 205, 149 188 C 154 162, 142 140, 120 140 Z" fill="#DDF3F8" />
          <g fill="none" stroke="#6FBFD3" strokeWidth="2.2" strokeLinecap="round">
            <path d="M104 158 q5 5 10 0 M126 158 q5 5 10 0" />
            <path d="M98 172 q5 5 10 0 M115 172 q5 5 10 0 M132 172 q5 5 10 0" />
            <path d="M101 186 q5 5 10 0 M118 186 q5 5 10 0 M135 186 q5 5 10 0" opacity=".85" />
            <path d="M108 200 q5 5 10 0 M126 200 q5 5 10 0" opacity=".7" />
          </g>

          <Eyes mood={mood} />
          <Beak talking={talking} />
        </g>

        {/* The wings: folded, one waving, or both up. */}
        {up ? (
          <>
            <g className="lx-cheer-l"><path d={RAISED_LEFT} fill={WING} /></g>
            <g className="lx-cheer-r"><path d={RAISED} fill={WING} /></g>
            <path d={FOLDED_LEFT} fill={WING} opacity="0" /><path d={FOLDED_RIGHT} fill={WING} opacity="0" />
          </>
        ) : (
          <>
            <path d={FOLDED_LEFT} fill={WING} />
            {mood === "hello" ? <g className="lx-wave"><path d={RAISED} fill={WING} /></g> : <path d={FOLDED_RIGHT} fill={WING} />}
          </>
        )}
        {/* Feather lines on the folded wings. */}
        <g fill="none" stroke="#2F9DB8" strokeWidth="1.8" strokeLinecap="round" opacity=".55">
          <path d="M66 152 q6 24 8 46" />{(!up) && <path d="M174 152 q-6 24 -8 46" />}
        </g>

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
