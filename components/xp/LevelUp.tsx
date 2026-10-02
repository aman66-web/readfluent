"use client";

import { useEffect, type CSSProperties } from "react";
import { DotNumber } from "@/components/DotMatrix";
import { Modal } from "@/components/Modal";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import type { LevelUp as LevelUpInfo } from "@/lib/xp/levels";

const COLOURS = ["#22D3EE", "#67E8F9", "#A5F3FC", "#FFFFFF", "#8B7CF6", "#C4B5FD", "#FDE68A", "#F0ABFC"];

/** Confetti that falls for as long as the screen is up: where it starts, how it drifts and turns, how big, in what colour. */
const FALL = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: 0.5 + ((i * 53) % 30) / 10,
  duration: 3.4 + (i % 5) * 0.55,
  dx: ((i % 9) - 4) * 16,
  rot: 360 * (1 + (i % 3)) * (i % 2 ? 1 : -1),
  w: 6 + (i % 4) * 2,
  h: 9 + (i % 3) * 4,
  colour: COLOURS[i % COLOURS.length],
  round: i % 4 === 0,
}));

/** A burst from the middle as the screen opens: each piece flies to its own spot. */
const BURST = Array.from({ length: 34 }, (_, i) => {
  const angle = (i / 34) * Math.PI * 2 + (i % 3) * 0.12;
  const dist = 120 + ((i * 29) % 5) * 52;
  return { bx: Math.round(Math.cos(angle) * dist), by: Math.round(Math.sin(angle) * dist * 0.9), rot: (i % 2 ? 1 : -1) * (180 + (i % 4) * 120), colour: COLOURS[(i * 3) % COLOURS.length], size: 6 + (i % 4) * 2.5, round: i % 3 === 0 };
});

const SPARKS: [number, number, number, number][] = [[12, 18, 14, 0], [86, 14, 18, 0.4], [8, 46, 10, 0.8], [92, 44, 12, 0.2], [20, 70, 12, 1.1], [80, 74, 14, 0.6]];

/**
 * The celebration when a reader reaches a new stage of their level (B1.1 → B1.2) or a whole new level
 * (B1.3 → B2.1): the screen floods with light, rings of it spread from Dewey, confetti bursts and keeps
 * falling, the new level lights up in lamps, and what a reader at that level can do is said plainly.
 * Everything is moved by CSS (app/globals.css, `.lu-*`); with reduced motion it is the final picture, still.
 */
export function LevelUp({ up, onClose }: { up: LevelUpInfo; onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    try { navigator.vibrate?.([30, 50, 30, 50, 110]); } catch { /* not a phone that buzzes */ }
  }, []);
  const title = t("levelup.title");
  return (
    <Modal label={title} onClose={onClose} className="lu fixed inset-0 z-[70] overflow-hidden text-white">
      <div className="lu-rays" aria-hidden />
      <div className="lu-ring" aria-hidden /><div className="lu-ring" style={{ animationDelay: "0.8s" }} aria-hidden /><div className="lu-ring" style={{ animationDelay: "1.6s" }} aria-hidden />

      <div className="lu-confetti pointer-events-none absolute inset-0" aria-hidden>
        {BURST.map((p, i) => (
          <span key={`b${i}`} className="lu-burst" style={{ ["--bx" as string]: `${p.bx}px`, ["--by" as string]: `${p.by}px`, ["--rot" as string]: `${p.rot}deg`, width: p.size, height: p.size * (p.round ? 1 : 1.5), background: p.colour, borderRadius: p.round ? "50%" : 2 } as CSSProperties} />
        ))}
        {FALL.map((p, i) => (
          <span key={`f${i}`} className="lu-fall" style={{ left: `${p.left}%`, width: p.w, height: p.h, background: p.colour, borderRadius: p.round ? "50%" : 2, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, ["--dx" as string]: `${p.dx}px`, ["--rot" as string]: `${p.rot}deg` } as CSSProperties} />
        ))}
        {SPARKS.map(([x, y, s, d], i) => (
          <svg key={`s${i}`} className="lu-twinkle absolute" style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${d}s` }} viewBox="-10 -10 20 20">
            <path d="M0 -9 Q0 0 9 0 Q0 0 0 9 Q0 0 -9 0 Q0 0 0 -9 Z" fill="#E6FBFF" />
          </svg>
        ))}
      </div>

      <div className="relative flex h-full flex-col items-center justify-center px-7 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] text-center">
        <div className="lu-pop w-[min(46vw,190px)]" style={{ animationDelay: "0.15s" }}>
          <div className="lu-hover"><Mascot mood="cheer" className="w-full" /></div>
        </div>

        <div className="lu-pop lu-badge mt-3 rounded-[26px] border border-white/25 bg-white/10 px-6 py-4 backdrop-blur-sm" style={{ animationDelay: "0.55s" }}>
          <div dir="ltr" aria-hidden><DotNumber value={up.code} cell={up.code.length > 2 ? 7 : 11} color="#A5F3FC" glow field fieldColor="rgba(255,255,255,.08)" label={up.code} /></div>
        </div>

        <h2 className="lu-rise lu-shine ed-serif mt-6 text-[36px] font-bold leading-[1.05] tracking-[-0.01em]" style={{ animationDelay: "0.95s", fontFamily: "var(--font-display), Georgia, serif" }}>{title}</h2>
        <p className="lu-rise mt-2 text-[18px] font-semibold text-white/95" style={{ animationDelay: "1.15s" }}>
          <bdi>{t(up.newLevel ? "levelup.newLevel" : "levelup.newStage", { code: up.code })}</bdi>
        </p>
        <p className="lu-rise mt-1 text-[13px] font-bold uppercase tracking-[0.14em] text-[#A5F3FC]" style={{ animationDelay: "1.3s" }}>{t(`levelname.${up.level}`)}</p>

        <p className="lu-rise mt-5 max-w-[34ch] text-[15px] leading-snug text-white/85" style={{ animationDelay: "1.5s" }}>{t(`cando.${up.code}` as MessageId)}</p>

        <button type="button" onClick={onClose} className="lu-rise mt-7 h-14 w-full max-w-[320px] rounded-full bg-white text-[17px] font-bold text-[#0A3B52] shadow-[0_14px_36px_-10px_rgba(0,0,0,.5)] active:scale-[0.98]" style={{ animationDelay: "1.8s" }}>
          {t("levelup.keep")}
        </button>
      </div>
    </Modal>
  );
}
