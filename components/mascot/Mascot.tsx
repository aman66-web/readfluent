import cheerArmL from "./pluto/cheer-arm-l.webp";
import cheerArmR from "./pluto/cheer-arm-r.webp";
import cheerBase from "./pluto/cheer-base.webp";
import helloArm from "./pluto/hello-arm.webp";
import helloBase from "./pluto/hello-base.webp";
import helloBlink from "./pluto/hello-blink.webp";
import helloTalk from "./pluto/hello-talk.webp";
import readingBlink from "./pluto/reading-blink.webp";
import reading from "./pluto/reading.webp";
import readyBlink from "./pluto/ready-blink.webp";
import readyTalk from "./pluto/ready-talk.webp";
import ready from "./pluto/ready.webp";
import sleepy from "./pluto/sleepy.webp";

/**
 * The app's mascot, Pluto (owner, 4 Oct 2026; its name is `MASCOT_NAME` in lib/brand.ts): a little space reader in a
 * cyan suit, with a big helmet whose glossy visor shows a glowing face, an antenna tipped with a star, and an open book
 * on its badge. Not an animal. Two tones of cyan on the suit: the language you speak and the one you are learning.
 *
 * Pluto is real 3D: modelled in three.js and rendered to transparent images, one per pose plus the parts that move
 * (scripts/mascot: the model, the renderer and how to make new poses). Here the images are layered in an SVG and moved with
 * CSS (app/globals.css, `.lx-*`): the waving arm and the cheering arms swing on their shoulders, the eyes blink, the mouth
 * talks, the whole figure bobs. Sized by its container. The poses (`mood`):
 *
 *   hello    waves one arm, smiling           reading   holds an open book, eyes on the page, a letter lifting off it
 *   cheer    both arms up, eyes ^ ^, a hop     sleepy    eyes closed, a slow breath, floating z's
 *   ready    bright eyes and a thumbs-up
 *
 * `talking` opens and closes the mouth (hello and ready) and quickens the bob. `crop="head"` shows the helmet and
 * shoulders, for the small round avatar.
 */
export type Mood = "hello" | "reading" | "cheer" | "sleepy" | "ready";

type Img = string | { src: string };
const url = (m: Img): string => (typeof m === "string" ? m : m.src);

/** The images were rendered with the figure a little small in its box: drawn this much larger, from its feet. */
const K = 1.12;
const FOOT: [number, number] = [120, 226];
const at = ([u, v]: [number, number]): [number, number] => [FOOT[0] + (u - FOOT[0]) * K, FOOT[1] + (v - FOOT[1]) * K];
/** The shoulders the arm layers turn on (scripts/mascot/pivots.json, in the 240 box), moved with the figure. */
const PIVOT = { wave: at([142.9, 148]), cheerL: at([94.2, 146.8]), cheerR: at([145.7, 147.3]) };

const POSE: Record<Mood, { base: Img; blink?: Img; talk?: Img }> = {
  hello: { base: helloBase, blink: helloBlink, talk: helloTalk },
  reading: { base: reading, blink: readingBlink },
  cheer: { base: cheerBase },
  sleepy: { base: sleepy },
  ready: { base: ready, blink: readyBlink, talk: readyTalk },
};

const spark = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

/** One rendered layer, the full 240 box, scaled from the feet. */
function Layer({ src, className }: { src: Img; className?: string }) {
  const size = 240 * K;
  return <image href={url(src)} x={FOOT[0] - FOOT[0] * K} y={FOOT[1] - FOOT[1] * K} width={size} height={size} className={className} />;
}

export function Mascot({ mood = "hello", talking = false, crop, className = "" }: { mood?: Mood; talking?: boolean; crop?: "head"; className?: string }) {
  const pose = POSE[mood];
  return (
    <svg viewBox={crop === "head" ? "40 18 160 139" : "0 0 240 240"} className={`lx ${crop ? "lx-cropped" : ""} ${talking ? "lx-talking" : ""} lx-${mood} ${className}`} aria-hidden>
      <ellipse className="lx-shadow" cx="120" cy="229" rx="54" ry="4.5" fill="#082F3E" opacity=".14" />

      {/* A letter lifting off the page while it reads, and sleepy z's. */}
      {mood === "reading" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" textAnchor="middle" fill="#0891B2">
          <text className="lx-rise" x="50" y="176" fontSize="20">é</text>
          <text className="lx-rise" style={{ animationDelay: "1.2s" }} x="70" y="160" fontSize="20">語</text>
        </g>
      )}
      {mood === "sleepy" && (
        <g fontFamily="var(--font-display), Georgia, serif" fontWeight="700" fill="#0891B2">
          <text className="lx-z" x="184" y="44" fontSize="22">z</text>
          <text className="lx-z" style={{ animationDelay: "1.1s" }} x="200" y="28" fontSize="16">z</text>
        </g>
      )}
      {mood === "cheer" && [[30, 64, 5], [210, 58, 6], [22, 134, 4], [218, 128, 4.5]].map(([x, y, r], i) => (
        <path key={i} className="lx-spark" style={{ animationDelay: `${i * 0.3}s` }} fill="#7DE3F4" d={spark(x, y, r)} />
      ))}

      {/* The figure: a viewport of its own, so the arms turn on their shoulders whatever part of the box is shown. */}
      <svg x="0" y="0" width="240" height="240" viewBox="0 0 240 240" overflow="visible">
        <g className="lx-bob">
          <g className="lx-head">
            <Layer src={pose.base} />
            {pose.blink && <Layer src={pose.blink} className="lx-blink" />}
            {talking && pose.talk && <Layer src={pose.talk} className="lx-talk" />}
            {mood === "hello" && (
              <g className="lx-wave" style={{ transformOrigin: `${PIVOT.wave[0]}px ${PIVOT.wave[1]}px` }}><Layer src={helloArm} /></g>
            )}
            {mood === "cheer" && (
              <>
                <g className="lx-cheer-l" style={{ transformOrigin: `${PIVOT.cheerL[0]}px ${PIVOT.cheerL[1]}px` }}><Layer src={cheerArmL} /></g>
                <g className="lx-cheer-r" style={{ transformOrigin: `${PIVOT.cheerR[0]}px ${PIVOT.cheerR[1]}px` }}><Layer src={cheerArmR} /></g>
              </>
            )}
          </g>
        </g>
      </svg>
    </svg>
  );
}
