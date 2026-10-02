import type { ReactNode } from "react";
import { composeScene, skyColours, type Figure, type Scene } from "@/lib/art/scene";
import { MOTIFS, type Ink } from "./motifs";

/**
 * Draws a Scene (lib/art/scene.ts) as flat shapes in a 400×300 box: sky, a backdrop for the setting, the ground,
 * the things the page names and the people in it. Every number comes from the scene's seed by integer arithmetic,
 * never Math.random or Math.sin, so the server and the browser draw the same picture.
 */

const W = 400;
const GY = 214; // where the ground begins

/** A small seeded stream of numbers in 0…1 (mulberry32); the same seed always gives the same run. */
function stream(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n1 = (v: number) => Math.round(v * 10) / 10;

function inkFor(s: Scene): Ink {
  const night = s.sky === "night" || s.setting === "space" || s.setting === "cave";
  const dim = s.sky === "storm" ? 8 : 0;
  const h = s.hue;
  return night
    ? { dark: `hsl(${h} 30% 12%)`, body: `hsl(${h} 26% 30%)`, light: `hsl(${h} 30% 52%)`, accent: `hsl(${(h + 150) % 360} 70% 62%)`, warm: "hsl(45 95% 68%)", pale: "hsl(48 40% 90%)", night: true }
    : { dark: `hsl(${h} 34% ${22 - dim / 2}%)`, body: `hsl(${h} 42% ${48 - dim}%)`, light: `hsl(${h} 50% ${72 - dim}%)`, accent: `hsl(${(h + 160) % 360} 76% ${52 - dim / 2}%)`, warm: "hsl(42 94% 60%)", pale: "hsl(40 50% 96%)", night: false };
}

/** A colour of the land at a fixed natural hue (grass green, sea blue, sand), darkened by the light. */
function land(s: Scene, l: number, hue: number, sat = 36) {
  const night = s.sky === "night" || s.setting === "space" || s.setting === "cave";
  const dim = night ? 24 : s.sky === "storm" ? 10 : s.sky === "dusk" ? 6 : 0;
  return `hsl(${hue % 360} ${night ? sat - 10 : sat}% ${Math.max(6, l - dim)}%)`;
}

function Hills({ s, rnd, base, amp, l, hOff, sat = 36 }: { s: Scene; rnd: () => number; base: number; amp: number; l: number; hOff: number; sat?: number }) {
  const pts = Array.from({ length: 5 }, (_, i) => `${i * 100},${n1(base - rnd() * amp)}`);
  return <path d={`M0,${GY + 2} L${pts.join(" L")} L${W},${GY + 2} Z`} fill={land(s, l, hOff, sat)} />;
}

function Backdrop({ s, rnd, ink, id }: { s: Scene; rnd: () => number; ink: Ink; id: string }): ReactNode {
  const gold = "hsl(45 95% 70%)";
  switch (s.setting) {
    case "sea":
    case "water": {
      const sea = s.setting === "sea";
      return (
        <g>
          <Hills s={s} rnd={rnd} base={sea ? 168 : 150} amp={sea ? 20 : 46} l={46} hOff={150} />
          <rect y={sea ? 168 : GY - 36} width={W} height={300} fill={land(s, 52, 200, 58)} />
          {Array.from({ length: 9 }, (_, i) => {
            const y = 190 + i * 13;
            const x = n1(rnd() * 330);
            return <path key={i} d={`M${x} ${y}q10-7 20 0t20 0t20 0`} fill="none" stroke={ink.pale} strokeWidth="2" opacity=".45" />;
          })}
        </g>
      );
    }
    case "street":
      return (
        <g>
          {Array.from({ length: 6 }, (_, i) => {
            const bw = 56 + Math.floor(rnd() * 24);
            const bh = 70 + Math.floor(rnd() * 70);
            const x = i * 68 - 6;
            return (
              <g key={i}>
                <rect x={x} y={GY - bh} width={bw} height={bh} fill={land(s, 34 + (i % 3) * 7, s.hue + i * 25, 30)} />
                {Array.from({ length: Math.floor(bh / 26) }, (_, j) => (
                  <rect key={j} x={x + 10} y={GY - bh + 10 + j * 24} width="10" height="13" fill={ink.night || rnd() > 0.5 ? ink.warm : ink.light} opacity={ink.night ? 0.9 : 0.8} />
                ))}
              </g>
            );
          })}
        </g>
      );
    case "room":
    case "lab":
      return (
        <g>
          <rect y="0" width={W} height={GY + 10} fill={land(s, s.setting === "lab" ? 70 : 62, s.setting === "lab" ? 170 : s.hue + 20, 34)} />
          <rect x={28 + Math.floor(rnd() * 20)} y="36" width="88" height="96" rx="4" fill={ink.dark} />
          <rect x={34 + Math.floor(rnd() * 20)} y="42" width="76" height="84" fill={`url(#${id}sky)`} />
          <path d="M72 42v84M34 84h76" stroke={ink.dark} strokeWidth="4" transform="translate(6 0)" opacity=".7" />
          <rect y={GY + 6} width={W} height="6" fill={ink.dark} opacity=".4" />
          <rect x="262" y="48" width="64" height="48" fill={ink.light} stroke={ink.dark} strokeWidth="4" />
          <path d="M270 88l18-26 14 14 12-18 12 30z" fill={ink.body} />
        </g>
      );
    case "forest":
      return (
        <g>
          {[0, 1].map((row) =>
            Array.from({ length: 9 }, (_, i) => {
              const x = n1(i * 52 - 10 + rnd() * 24);
              const h = 90 + Math.floor(rnd() * 60) - row * 20;
              const y = GY - (row ? 0 : 10);
              return <path key={`${row}-${i}`} d={`M${x} ${y} l22 ${-h} l22 ${h}z`} fill={land(s, row ? 40 : 28, 135 + row * 15, 40)} />;
            }),
          )}
        </g>
      );
    case "mountain":
      return (
        <g>
          <path d={`M-10 ${GY} L70 ${GY - 120} L110 ${GY - 80} L170 ${GY - 150} L250 ${GY - 70} L310 ${GY - 130} L410 ${GY}Z`} fill={land(s, 58, 220, 22)} />
          <path d={`M170 ${GY - 150} l-18 30 l12 -6 l8 14 l8 -12 l12 8z M70 ${GY - 120} l-14 24 l10 -4 l6 10 l8 -10 l8 6z M310 ${GY - 130} l-14 26 l10 -5 l8 10 l6 -9 l10 6z`} fill={ink.pale} />
          <Hills s={s} rnd={rnd} base={GY - 30} amp={36} l={36} hOff={120} />
        </g>
      );
    case "desert":
      return (
        <g>
          <circle cx={n1(260 + rnd() * 80)} cy="86" r="26" fill={gold} opacity=".9" />
          <path d={`M-10 ${GY - 30} Q90 ${GY - 80} 200 ${GY - 34} T410 ${GY - 40} V${GY + 4} H-10z`} fill={land(s, 62, 38, 58)} />
          <path d={`M-10 ${GY - 6} Q120 ${GY - 52} 260 ${GY - 10} T410 ${GY - 14} V${GY + 4} H-10z`} fill={land(s, 54, 34, 56)} />
        </g>
      );
    case "castle":
      return (
        <g>
          <Hills s={s} rnd={rnd} base={GY - 40} amp={26} l={46} hOff={115} />
          <g fill={land(s, 38, 230, 14)}>
            <rect x="120" y={GY - 110} width="160" height="110" />
            <rect x="96" y={GY - 140} width="40" height="140" />
            <rect x="264" y={GY - 140} width="40" height="140" />
            <path d={`M96 ${GY - 140}l20-30 20 30zM264 ${GY - 140}l20-30 20 30z`} fill={land(s, 26, 350, 40)} />
            {Array.from({ length: 6 }, (_, i) => <rect key={i} x={140 + i * 24} y={GY - 124} width="14" height="14" />)}
          </g>
          <path d={`M178 ${GY}V${GY - 40}a22 22 0 0 1 44 0V${GY}z`} fill={ink.dark} />
          <rect x="112" y={GY - 100} width="8" height="14" fill={ink.warm} />
          <rect x="280" y={GY - 100} width="8" height="14" fill={ink.warm} />
        </g>
      );
    case "cave":
      return (
        <g>
          <rect width={W} height={GY + 10} fill={land(s, 16, 250, 20)} />
          {Array.from({ length: 8 }, (_, i) => {
            const x = n1(i * 52 + rnd() * 20);
            const h = 24 + Math.floor(rnd() * 56);
            return <path key={i} d={`M${x} 0h30l-15 ${h}z`} fill={land(s, 24, 250, 20)} />;
          })}
          <ellipse cx="300" cy={GY - 30} rx="60" ry="46" fill={ink.warm} opacity=".14" />
        </g>
      );
    case "space":
      return (
        <g>
          <circle cx={n1(80 + rnd() * 220)} cy={n1(70 + rnd() * 30)} r={n1(34 + rnd() * 24)} fill={`hsl(${(s.hue + 20) % 360} 50% 54%)`} />
          <circle cx="330" cy="60" r="12" fill={ink.pale} opacity=".9" />
        </g>
      );
    case "garden":
      return (
        <g>
          <Hills s={s} rnd={rnd} base={GY - 36} amp={30} l={52} hOff={100} sat={42} />
          <rect y={GY - 28} width={W} height="34" fill={land(s, 36, 120, 42)} />
          {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={n1(i * 30 + rnd() * 14)} cy={GY - 30 + Math.floor(rnd() * 10)} r="8" fill={land(s, 30, 110, 44)} />)}
        </g>
      );
    case "road":
      return (
        <g>
          <Hills s={s} rnd={rnd} base={GY - 56} amp={40} l={52} hOff={115} />
          <Hills s={s} rnd={rnd} base={GY - 24} amp={24} l={42} hOff={105} />
        </g>
      );
    default: // field
      return (
        <g>
          <Hills s={s} rnd={rnd} base={GY - 62} amp={40} l={58} hOff={110} />
          <Hills s={s} rnd={rnd} base={GY - 26} amp={26} l={46} hOff={100} />
          <path d={`M0 ${GY - 8}H${W}`} stroke={ink.dark} strokeWidth="2" opacity=".35" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 36 + 6} ${GY - 8}v-14`} stroke={ink.dark} strokeWidth="3" opacity=".35" />)}
        </g>
      );
  }
}

function Ground({ s, ink }: { s: Scene; ink: Ink }): ReactNode {
  const base = s.setting === "sea" || s.setting === "water" ? null : s.setting;
  if (!base) return <rect y={GY + 40} width={W} height="60" fill={land(s, 44, 200, 56)} opacity=".6" />;
  const col =
    base === "street" || base === "castle" ? land(s, 30, 230, 10)
    : base === "room" || base === "lab" ? land(s, 36, 28, 34)
    : base === "desert" ? land(s, 66, 38, 58)
    : base === "space" ? land(s, 34, 260, 10)
    : base === "cave" ? land(s, 22, 250, 14)
    : base === "mountain" ? land(s, 52, 100, 24)
    : land(s, 40, 105, 42);
  return (
    <g>
      <rect y={GY} width={W} height={300 - GY} fill={col} />
      {base === "road" && <path d={`M150 ${GY}L250 ${GY}L360 300H40z`} fill={land(s, 56, 35, 14)} />}
      {base === "road" && <path d={`M200 ${GY + 4}V${GY + 14}M200 ${GY + 26}V${GY + 42}M200 ${GY + 56}V${GY + 78}`} stroke={ink.pale} strokeWidth="4" opacity=".8" />}
    </g>
  );
}

function Person({ f, ink, dark }: { f: Figure; ink: Ink; dark: string }) {
  const one = (x: number, k: number, child: boolean) => {
    const sc = child ? 0.62 : 1;
    return (
      <g key={k} transform={`translate(${x} ${GY + 30}) scale(${sc})`}>
        <ellipse cx="0" cy="2" rx="20" ry="5" fill={dark} opacity=".25" />
        <path d="M-15 0v-32a15 15 0 0 1 30 0V0z" fill={k % 2 ? ink.accent : ink.body} />
        <circle cx="0" cy="-58" r="11" fill={ink.pale} />
        <path d="M-11-60a11 11 0 0 1 22 0c-6-6-16-6-22 0z" fill={ink.dark} />
      </g>
    );
  };
  if (f.kind === "group") return <g>{[-30, 0, 30].map((dx, i) => one(f.x + dx, i, i === 2))}</g>;
  return one(f.x, 0, f.kind === "child");
}

export interface SceneArtProps { caption: string; seed: string; id: string }

/** The picture for one page: `caption` is read for what to draw; `seed` (book and page) keeps different pages from looking alike. */
export function SceneArt({ caption, seed, id }: SceneArtProps) {
  const s = composeScene(caption, seed);
  const rnd = stream(s.seed);
  const ink = inkFor(s);
  const [top, bottom] = skyColours(s.sky, s.hue);
  const lit = s.sky === "day" || s.sky === "dawn";
  const moon = s.sky === "night" && s.setting !== "cave" && s.setting !== "room" && s.setting !== "lab";
  const sunX = n1(60 + rnd() * 280);
  const stars = Array.from({ length: s.stars ? 26 : 0 }, () => ({ x: n1(rnd() * W), y: n1(rnd() * 140), r: n1(0.8 + rnd() * 1.4) }));
  const clouds = s.sky === "snow" || s.sky === "storm" || s.sky === "day" || s.sky === "dawn" || s.sky === "dusk";
  const cloudFill = s.sky === "storm" ? "hsl(215 10% 56%)" : "white";
  const drops = Array.from({ length: s.rain || s.snow ? 34 : 0 }, () => ({ x: n1(rnd() * W), y: n1(rnd() * 270) }));
  const cloudSpots = [0, 1, 2].map(() => ({ x: n1(20 + rnd() * 300), y: n1(24 + rnd() * 60), k: n1(0.7 + rnd() * 0.7) }));
  const tint = s.sky === "dusk" ? "hsl(24 90% 60%)" : "transparent";
  return (
    <svg viewBox={`0 0 ${W} 300`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <g>
        <rect width={W} height="300" fill={`url(#${id}sky)`} />
        {stars.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="white" opacity=".85" />)}
        {lit && s.setting !== "desert" && s.setting !== "space" && <circle cx={sunX} cy="64" r="22" fill="hsl(46 100% 80%)" opacity=".9" />}
        {moon && <path d={`M${sunX} 44a24 24 0 1 0 22 34a20 20 0 1 1-22-34z`} fill="hsl(48 60% 92%)" />}
        {clouds && cloudSpots.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.k})`} fill={cloudFill} opacity={s.sky === "storm" ? 0.7 : 0.8}>
            <ellipse cx="0" cy="0" rx="26" ry="9" /><ellipse cx="14" cy="-7" rx="16" ry="10" /><ellipse cx="-12" cy="-5" rx="13" ry="8" />
          </g>
        ))}
        <Backdrop s={s} rnd={rnd} ink={ink} id={id} />
        <Ground s={s} ink={ink} />
        {s.things.map((t, i) => (
          <g key={i} transform={`translate(${t.x} ${GY + (s.setting === "sea" && t.motif === "ship" ? -6 : 24)}) scale(${t.scale})`}>{MOTIFS[t.motif](ink)}</g>
        ))}
        {s.people.map((f, i) => <Person key={i} f={f} ink={ink} dark={ink.dark} />)}
        {s.rain && drops.map((d, i) => <path key={i} d={`M${d.x} ${d.y}l-5 14`} stroke="white" strokeWidth="1.4" opacity=".55" />)}
        {s.snow && drops.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="2.2" fill="white" opacity=".9" />)}
        <rect width={W} height="300" fill={tint} opacity=".12" />
      </g>
    </svg>
  );
}
