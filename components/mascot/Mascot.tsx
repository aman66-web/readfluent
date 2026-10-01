/**
 * The app's mascot, a cyan bookworm who lives in an open book (its name is `MASCOT_NAME` in
 * lib/brand.ts). A bookworm is someone who loves to read, and the mascot is the app's guide: it
 * says hello, reads along, cheers when you level up and dozes off when you have been away.
 *
 * Drawn in SVG and moved with CSS (app/globals.css, `.lx-*`). Sized by its container. The
 * poses (`mood`):
 *
 *   hello    waves, open smile        reading   eyes down, a letter lifting off the page
 *   cheer    both arms up, happy eyes sleepy    eyes closed, a slow breath, floating z's
 *   ready    wide, shining eyes and an open smile, hands on the book: eager to begin
 *
 * `talking` makes the mouth move and the bob quicken (the guide saying a line). `crop="head"`
 * shows just the head and shoulders.
 */

export type Mood = "hello" | "reading" | "cheer" | "sleepy" | "ready";

const BODY = "url(#lx-body)";
const BELLY = "url(#lx-belly)";
const INK = "#0B3B4A";

const spark = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

/** The mouth for each mood. */
function Mouth({ mood, talking }: { mood: Mood; talking: boolean }) {
  if (talking) {
    return (
      <g className="lx-talk">
        <path d="M107 114 Q120 117 133 114 Q132 134 120 134 Q108 134 107 114 Z" fill={INK} />
        <path d="M112 127 Q120 122 128 127 Q124 134 120 134 Q116 134 112 127 Z" fill="#FB7185" />
      </g>
    );
  }
  if (mood === "hello" || mood === "cheer" || mood === "ready") {
    return (
      <g>
        <path d="M106 115 Q120 138 134 115 Q120 119 106 115 Z" fill={INK} strokeLinejoin="round" stroke={INK} strokeWidth="2" />
        <path d="M112 126 Q120 133 128 126 Q120 122 112 126 Z" fill="#FB7185" />
      </g>
    );
  }
  if (mood === "sleepy") return <path d="M113 122 Q120 126 127 122" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />;
  return <path d="M108 117 Q120 130 132 117" fill="none" stroke={INK} strokeWidth="3.8" strokeLinecap="round" />;
}

/** The eyes: big, dark and glossy, with a catch of light in each. */
function Eyes({ mood }: { mood: Mood }) {
  if (mood === "cheer") {
    // Happy arcs, ^ ^
    return <g fill="none" stroke={INK} strokeWidth="4.6" strokeLinecap="round"><path d="M89 101 Q100 86 111 101" /><path d="M129 101 Q140 86 151 101" /></g>;
  }
  if (mood === "sleepy") {
    return <g fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round"><path d="M89 96 Q100 105 111 96" /><path d="M129 96 Q140 105 151 96" /></g>;
  }
  const big = mood === "ready";
  const rx = big ? 10.5 : 9;
  const ry = big ? 13.5 : 11.5;
  const dy = mood === "reading" ? 5 : 0;
  return (
    <g className="lx-blink">
      <ellipse cx="100" cy={97 + dy} rx={rx} ry={ry} fill={INK} /><ellipse cx="140" cy={97 + dy} rx={rx} ry={ry} fill={INK} />
      <circle cx="103.5" cy={92 + dy} r={big ? 4.4 : 3.7} fill="#fff" /><circle cx="143.5" cy={92 + dy} r={big ? 4.4 : 3.7} fill="#fff" />
      <circle cx="96.5" cy={103 + dy} r="1.9" fill="#fff" /><circle cx="136.5" cy={103 + dy} r="1.9" fill="#fff" />
      {big && <path d={spark(106, 101, 3)} fill="#fff" transform="translate(-1 0)" />}
    </g>
  );
}

export function Mascot({ mood = "hello", talking = false, crop, className = "" }: { mood?: Mood; talking?: boolean; crop?: "head"; className?: string }) {
  const up = mood === "cheer";
  return (
    <svg viewBox={crop === "head" ? "64 12 108 118" : "0 0 240 240"} className={`lx ${crop ? "lx-cropped" : ""} ${talking ? "lx-talking" : ""} lx-${mood} ${className}`} aria-hidden>
      <defs>
        <linearGradient id="lx-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8BEBFA" />
          <stop offset=".55" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#0FA9C8" />
        </linearGradient>
        <linearGradient id="lx-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3FAFE" /><stop offset="1" stopColor="#A8EFFA" />
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

      <ellipse className="lx-shadow" cx="120" cy="231" rx="86" ry="6.5" fill="#082F3E" opacity=".16" />

      {/* A letter lifting off the page while it reads, and sleepy z's. */}
      {mood === "reading" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" textAnchor="middle" fill="#0891B2">
          <text className="lx-rise" x="46" y="168" fontSize="20">é</text>
          <text className="lx-rise" style={{ animationDelay: "1.2s" }} x="64" y="150" fontSize="20">語</text>
        </g>
      )}
      {mood === "sleepy" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" fill="#0891B2">
          <text className="lx-z" x="170" y="50" fontSize="22">z</text>
          <text className="lx-z" style={{ animationDelay: "1.1s" }} x="186" y="34" fontSize="16">z</text>
        </g>
      )}
      {up && [[40, 60, 5], [204, 52, 6], [26, 128, 4], [216, 116, 4.5]].map(([x, y, r], i) => (
        <path key={i} className="lx-spark" style={{ animationDelay: `${i * 0.3}s` }} fill="#7DE3F4" d={spark(x, y, r)} />
      ))}

      <g className="lx-bob">
        {/* The book's cover, showing past the pages. */}
        <path d="M120 172 C 96 158, 58 155, 24 163 L 24 219 C 58 213, 98 216, 120 230 C 142 216, 182 213, 216 219 L 216 163 C 182 155, 144 158, 120 172 Z" fill="url(#lx-cover)" />

        {/* The tail, curling up behind: small segments getting smaller. */}
        <g className="lx-tail">
          <circle cx="166" cy="172" r="15" fill={BODY} />
          <circle cx="186" cy="154" r="11.5" fill={BODY} />
          <circle cx="198" cy="135" r="8.5" fill={BODY} />
          <circle cx="200" cy="119" r="5.5" fill="#67E8F9" />
        </g>

        {/* The body, coming up out of the pages in round segments, with a pale belly. */}
        <ellipse cx="120" cy="178" rx="40" ry="26" fill={BODY} />
        <ellipse cx="120" cy="150" rx="34" ry="26" fill={BODY} />
        <ellipse cx="120" cy="156" rx="21" ry="17" fill={BELLY} />
        <g fill="none" stroke="#0A8FB0" strokeOpacity=".4" strokeWidth="2.4" strokeLinecap="round">
          <path d="M104 150 Q120 156 136 150" /><path d="M102 164 Q120 171 138 164" />
        </g>

        {/* The arms, from the shoulders: down on the book, one waving, or both up. */}
        {up ? (
          <>
            <g className="lx-cheer-l"><path d="M90 150 Q66 140 60 112" stroke="#22D3EE" strokeWidth="14" fill="none" strokeLinecap="round" /><circle cx="59" cy="107" r="10.5" fill="#8BEBFA" /></g>
            <g className="lx-cheer-r"><path d="M150 150 Q174 140 180 112" stroke="#22D3EE" strokeWidth="14" fill="none" strokeLinecap="round" /><circle cx="181" cy="107" r="10.5" fill="#8BEBFA" /></g>
          </>
        ) : (
          <>
            <path d="M92 152 Q76 160 76 174" stroke="#22D3EE" strokeWidth="14" fill="none" strokeLinecap="round" />
            {mood === "hello" ? (
              <g className="lx-wave"><path d="M148 152 Q174 146 182 116" stroke="#22D3EE" strokeWidth="14" fill="none" strokeLinecap="round" /><circle cx="183" cy="110" r="11" fill="#8BEBFA" /></g>
            ) : (
              <path d="M148 152 Q164 160 164 174" stroke="#22D3EE" strokeWidth="14" fill="none" strokeLinecap="round" />
            )}
          </>
        )}

        {/* The head. */}
        <g className="lx-head">
          <g className="lx-ant">
            <path d="M106 52 Q97 38 95 24" fill="none" stroke="#12B5D6" strokeWidth="4.2" strokeLinecap="round" />
            <path d="M134 52 Q143 38 145 24" fill="none" stroke="#12B5D6" strokeWidth="4.2" strokeLinecap="round" />
            <circle cx="95" cy="21" r="7" fill="#67E8F9" /><circle cx="145" cy="21" r="7" fill="#67E8F9" />
            <circle cx="92.6" cy="18.6" r="2.2" fill="#fff" opacity=".8" /><circle cx="142.6" cy="18.6" r="2.2" fill="#fff" opacity=".8" />
          </g>
          <circle cx="120" cy="95" r="48" fill={BODY} />
          <ellipse cx="98" cy="64" rx="19" ry="8.5" fill="#fff" opacity=".3" transform="rotate(-24 98 64)" />
          <ellipse cx="77" cy="113" rx="8.5" ry="5.8" fill="#FB7185" opacity=".5" /><ellipse cx="163" cy="113" rx="8.5" ry="5.8" fill="#FB7185" opacity=".5" />
          <Eyes mood={mood} />
          <Mouth mood={mood} talking={talking} />
        </g>

        {/* The open book's pages, in front of the body. */}
        <path d="M120 178 C 98 166, 60 163, 32 170 L 32 216 C 60 210, 98 213, 120 226 Z" fill="url(#lx-page)" />
        <path d="M120 178 C 142 166, 180 163, 208 170 L 208 216 C 180 210, 142 213, 120 226 Z" fill="url(#lx-page-r)" />
        <g fill="none" stroke="#0891B2" strokeLinecap="round" strokeWidth="2.4" opacity=".32">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M44 ${182 + i * 9} C 64 ${178 + i * 9}, 88 ${180 + i * 9}, 106 ${188 + i * 9}`} />
              <path d={`M196 ${182 + i * 9} C 176 ${178 + i * 9}, 152 ${180 + i * 9}, 134 ${188 + i * 9}`} />
            </g>
          ))}
        </g>
        <path d="M120 178 L120 226" stroke="#0B3B4A" strokeOpacity=".3" strokeWidth="2" />

        {/* Hands resting on the book. */}
        {!up && (
          <>
            <circle cx="76" cy="178" r="10.5" fill="#8BEBFA" />
            {mood !== "hello" && <circle cx="164" cy="178" r="10.5" fill="#8BEBFA" />}
          </>
        )}
      </g>
    </svg>
  );
}
