/**
 * Lex, ReadFluent's mascot: a cyan bookworm in round glasses who lives in an open book.
 * A bookworm is someone who loves to read, and Lex is the app's guide: it says hello, reads
 * along, cheers when you level up and dozes off when you have been away.
 *
 * Drawn in SVG and moved with CSS (app/globals.css, `.lx-*`). Sized by its container. The
 * poses (`mood`):
 *
 *   hello    waves, open smile        reading   eyes down, a letter lifting off the page
 *   cheer    both arms up, happy eyes sleepy    eyes closed, a slow breath, floating z's
 *
 * `talking` makes the mouth move and the bob quicken (the guide saying a line). `crop="head"`
 * shows just the head and shoulders, for the small avatar beside a line.
 */

export type Mood = "hello" | "reading" | "cheer" | "sleepy";

const BODY = "url(#lx-body)";
const INK = "#0B3B4A";

const spark = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

/** The mouth for each mood. */
function Mouth({ mood, talking }: { mood: Mood; talking: boolean }) {
  if (talking) return <ellipse className="lx-talk" cx="120" cy="121" rx="9" ry="7" fill={INK} />;
  if (mood === "hello" || mood === "cheer") {
    return (
      <g>
        <path d="M104 114 Q120 140 136 114 Z" fill={INK} />
        <path d="M110 128 Q120 135 130 128 Q120 124 110 128 Z" fill="#FB7185" />
      </g>
    );
  }
  if (mood === "sleepy") return <path d="M112 122 Q120 126 128 122" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />;
  return <path d="M108 118 Q120 130 132 118" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />;
}

/** The eyes behind the glasses. */
function Eyes({ mood }: { mood: Mood }) {
  if (mood === "cheer") {
    // Happy arcs, ^ ^
    return <g fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round"><path d="M92 99 Q101 87 110 99" /><path d="M130 99 Q139 87 148 99" /></g>;
  }
  if (mood === "sleepy") {
    return <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round"><path d="M92 94 Q101 101 110 94" /><path d="M130 94 Q139 101 148 94" /></g>;
  }
  const dy = mood === "reading" ? 5 : 0;
  return (
    <g className="lx-blink">
      <circle cx="101" cy={95 + dy} r="7" fill={INK} /><circle cx="139" cy={95 + dy} r="7" fill={INK} />
      <circle cx="103.5" cy={92.5 + dy} r="2.4" fill="#fff" /><circle cx="141.5" cy={92.5 + dy} r="2.4" fill="#fff" />
    </g>
  );
}

export function Lex({ mood = "hello", talking = false, crop, className = "" }: { mood?: Mood; talking?: boolean; crop?: "head"; className?: string }) {
  const up = mood === "cheer";
  return (
    <svg viewBox={crop === "head" ? "64 12 108 118" : "0 0 240 240"} className={`lx ${crop ? "lx-cropped" : ""} ${talking ? "lx-talking" : ""} lx-${mood} ${className}`} aria-hidden>
      <defs>
        <linearGradient id="lx-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7DE9F8" />
          <stop offset=".55" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#0EA5C4" />
        </linearGradient>
        <linearGradient id="lx-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0E7490" /><stop offset="1" stopColor="#082F3E" />
        </linearGradient>
        <linearGradient id="lx-page" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#A9E1EE" /><stop offset=".3" stopColor="#E6F8FB" /><stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id="lx-page-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A9E1EE" /><stop offset=".3" stopColor="#E6F8FB" /><stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      <ellipse className="lx-shadow" cx="120" cy="230" rx="86" ry="7" fill="#082F3E" opacity=".16" />

      {/* A letter lifting off the page while Lex reads, and sleepy z's. */}
      {mood === "reading" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" textAnchor="middle" fill="#0891B2">
          <text className="lx-rise" x="52" y="168" fontSize="20">é</text>
          <text className="lx-rise" style={{ animationDelay: "1.2s" }} x="190" y="168" fontSize="20">語</text>
        </g>
      )}
      {mood === "sleepy" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" fill="#0891B2">
          <text className="lx-z" x="160" y="46" fontSize="22">z</text>
          <text className="lx-z" style={{ animationDelay: "1.1s" }} x="176" y="30" fontSize="16">z</text>
        </g>
      )}
      {up && [[48, 56, 5], [196, 48, 6], [34, 120, 4], [210, 110, 4.5]].map(([x, y, r], i) => (
        <path key={i} className="lx-spark" style={{ animationDelay: `${i * 0.3}s` }} fill="#7DE3F4" d={spark(x, y, r)} />
      ))}

      <g className="lx-bob">
        {/* The book's cover, showing past the pages. */}
        <path d="M120 172 C 96 158, 58 155, 26 163 L 26 218 C 58 212, 98 215, 120 229 C 142 215, 182 212, 214 218 L 214 163 C 182 155, 144 158, 120 172 Z" fill="url(#lx-cover)" />

        {/* The body, coming up out of the pages, and its tail curling up behind. */}
        <g className="lx-tail">
          <ellipse cx="170" cy="172" rx="14" ry="12" fill={BODY} opacity=".95" />
          <ellipse cx="190" cy="152" rx="11" ry="10" fill={BODY} opacity=".9" />
          <ellipse cx="202" cy="132" rx="8" ry="7.5" fill={BODY} opacity=".85" />
        </g>
        <ellipse cx="120" cy="174" rx="36" ry="24" fill={BODY} />
        <ellipse cx="120" cy="148" rx="34" ry="26" fill={BODY} />
        {/* Where each segment ends. */}
        <g fill="none" stroke="#0891B2" strokeOpacity=".35" strokeWidth="2.4" strokeLinecap="round">
          <path d="M92 158 Q120 168 148 158" /><path d="M88 176 Q120 188 152 176" />
        </g>

        {/* The head. */}
        <g className="lx-head">
          <g className="lx-ant">
            <path d="M103 54 Q94 40 90 28" fill="none" stroke="#0EA5C4" strokeWidth="4" strokeLinecap="round" />
            <path d="M137 54 Q146 40 150 28" fill="none" stroke="#0EA5C4" strokeWidth="4" strokeLinecap="round" />
            <circle cx="90" cy="26" r="6" fill="#67E8F9" /><circle cx="150" cy="26" r="6" fill="#67E8F9" />
          </g>
          <circle cx="120" cy="96" r="46" fill={BODY} />
          <ellipse cx="102" cy="68" rx="20" ry="10" fill="#fff" opacity=".28" transform="rotate(-24 102 68)" />
          <circle cx="82" cy="114" r="7.5" fill="#FB7185" opacity=".45" /><circle cx="158" cy="114" r="7.5" fill="#FB7185" opacity=".45" />
          {/* Round glasses. */}
          <g fill="#fff" fillOpacity=".78" stroke="#0E7490" strokeWidth="4.6">
            <circle cx="101" cy="95" r="17.5" /><circle cx="139" cy="95" r="17.5" />
          </g>
          <path d="M118.5 93 Q120 90 121.5 93" fill="none" stroke="#0E7490" strokeWidth="4" strokeLinecap="round" />
          <path d="M83.5 92 L74 88 M156.5 92 L166 88" stroke="#0E7490" strokeWidth="4" strokeLinecap="round" />
          <Eyes mood={mood} />
          <Mouth mood={mood} talking={talking} />
        </g>

        {/* The open book's pages, in front of the body. */}
        <path d="M120 176 C 98 164, 62 161, 34 168 L 34 214 C 62 208, 98 211, 120 224 Z" fill="url(#lx-page)" />
        <path d="M120 176 C 142 164, 178 161, 206 168 L 206 214 C 178 208, 142 211, 120 224 Z" fill="url(#lx-page-r)" />
        <g fill="none" stroke="#0891B2" strokeLinecap="round" strokeWidth="2.4" opacity=".32">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M46 ${180 + i * 9} C 66 ${176 + i * 9}, 90 ${178 + i * 9}, 108 ${186 + i * 9}`} />
              <path d={`M194 ${180 + i * 9} C 174 ${176 + i * 9}, 150 ${178 + i * 9}, 132 ${186 + i * 9}`} />
            </g>
          ))}
        </g>
        <path d="M120 176 L120 224" stroke="#0B3B4A" strokeOpacity=".3" strokeWidth="2" />

        {/* Hands on the book; in some poses they are up. */}
        {up ? (
          <>
            <g className="lx-cheer-l"><path d="M82 172 L58 124" stroke="#22D3EE" strokeWidth="15" strokeLinecap="round" /><circle cx="56" cy="120" r="10" fill="#7DE9F8" /></g>
            <g className="lx-cheer-r"><path d="M158 172 L182 124" stroke="#22D3EE" strokeWidth="15" strokeLinecap="round" /><circle cx="184" cy="120" r="10" fill="#7DE9F8" /></g>
          </>
        ) : (
          <>
            <circle cx="80" cy="176" r="10" fill="#22D3EE" />
            {mood === "hello" ? (
              <g className="lx-wave"><path d="M158 174 L184 128" stroke="#22D3EE" strokeWidth="15" strokeLinecap="round" /><circle cx="186" cy="124" r="10" fill="#7DE9F8" /></g>
            ) : (
              <circle cx="160" cy="176" r="10" fill="#22D3EE" />
            )}
          </>
        )}
      </g>
    </svg>
  );
}
