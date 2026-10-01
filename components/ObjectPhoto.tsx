"use client";

import { useId } from "react";
import { useT } from "@/lib/i18n/react";

/**
 * A flat still-life standing in for a page's photograph: one object on a coloured ground,
 * six wide by five tall, like the photos that will replace it. TEMPORARY, like ScenePhoto:
 * the real photos are generated, one pool per book (SPEC.md §7), and arrive with the content
 * pipeline (M2).
 */
export const ART_IDS = ["candle", "fan", "letter", "umbrella", "boot"] as const;
export type ArtId = (typeof ART_IDS)[number];

const S = 'stroke="#231812" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"';

const ART: Record<ArtId, () => string> = {
  candle: () =>
    `<rect x="168" y="372" width="64" height="14" rx="5" fill="#dca43f" ${S}/>` +
    `<rect x="193" y="236" width="14" height="138" fill="#e8b650" ${S}/>` +
    '<path d="M200 312 C150 312 120 300 120 252 M200 312 C250 312 280 300 280 252" fill="none" stroke="#231812" stroke-width="14" stroke-linecap="round"/>' +
    '<path d="M200 312 C150 312 120 300 120 252 M200 312 C250 312 280 300 280 252" fill="none" stroke="#e8b650" stroke-width="7" stroke-linecap="round"/>' +
    `<rect x="112" y="240" width="16" height="10" fill="#dca43f" ${S}/><rect x="272" y="240" width="16" height="10" fill="#dca43f" ${S}/><rect x="192" y="226" width="16" height="10" fill="#dca43f" ${S}/>` +
    `<rect x="114" y="200" width="12" height="40" fill="#f6ecd6" ${S}/><rect x="274" y="200" width="12" height="40" fill="#f6ecd6" ${S}/><rect x="194" y="186" width="12" height="40" fill="#f6ecd6" ${S}/>` +
    '<ellipse cx="120" cy="188" rx="8" ry="13" fill="#ffb347"/><ellipse cx="280" cy="188" rx="8" ry="13" fill="#ffb347"/><ellipse cx="200" cy="174" rx="8" ry="13" fill="#ffb347"/>',
  fan: () => {
    const cx = 200, cy = 392, r = 250, a0 = -155, span = 130, n = 8;
    let out = "";
    for (let i = 0; i < n; i++) {
      const s = ((a0 + (i * span) / n) * Math.PI) / 180, e = ((a0 + ((i + 1) * span) / n) * Math.PI) / 180;
      const x0 = cx + r * Math.cos(s), y0 = cy + r * Math.sin(s), x1 = cx + r * Math.cos(e), y1 = cy + r * Math.sin(e);
      out += `<path d="M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${i % 2 ? "#e8663d" : "#f6ecd9"}" ${S}/>`;
    }
    return out + `<rect x="190" y="380" width="20" height="22" rx="6" fill="#3a2a22" ${S}/><circle cx="200" cy="388" r="7" fill="#dca43f" ${S}/>`;
  },
  letter: () =>
    `<g transform="rotate(-6 200 330)"><rect x="82" y="248" width="236" height="150" rx="9" fill="#fbf5e6" ${S}/>` +
    `<path d="M82 252 L200 340 L318 252" fill="#efe3c8" ${S}/>` +
    '<path d="M82 394 L168 322 M318 394 L232 322" fill="none" stroke="#231812" stroke-width="3" opacity=".55"/>' +
    `<circle cx="200" cy="338" r="24" fill="#c0392b" ${S}/><circle cx="200" cy="338" r="12" fill="none" stroke="#7a1f16" stroke-width="3"/></g>`,
  umbrella: () => {
    let rain = "";
    for (let i = 0; i < 34; i++) {
      const x = -70 + ((i * 53) % 600), y = 30 + ((i * 97) % 300);
      rain += `<path d="M${x} ${y} l-9 26" stroke="#dbe6ff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    }
    return rain + '<rect x="196" y="236" width="8" height="140" fill="#231812"/><path d="M200 376 q0 26 -24 26" fill="none" stroke="#231812" stroke-width="9" stroke-linecap="round"/>' +
      `<path d="M80 252 A120 120 0 0 1 320 252 Q285 232 260 252 Q230 230 200 252 Q170 230 140 252 Q115 232 80 252 Z" fill="#d8433a" ${S}/>` +
      '<path d="M200 252 Q170 160 130 140 M200 252 Q230 160 270 140" fill="none" stroke="#231812" stroke-width="3" opacity=".4"/><circle cx="200" cy="130" r="6" fill="#231812"/>';
  },
  boot: () =>
    `<path d="M142 212 H224 V330 H300 Q346 336 350 372 V394 H142 Z" fill="#8a5330" ${S}/>` +
    `<rect x="142" y="196" width="82" height="22" rx="6" fill="#5e3820" ${S}/><rect x="136" y="388" width="218" height="14" rx="6" fill="#231812"/>` +
    '<circle cx="190" cy="360" r="12" fill="#4b2e1a"/><circle cx="238" cy="372" r="9" fill="#4b2e1a"/><circle cx="296" cy="364" r="13" fill="#4b2e1a"/><circle cx="168" cy="330" r="7" fill="#4b2e1a"/><circle cx="324" cy="394" r="9" fill="#4b2e1a"/>' +
    '<path d="M150 396 q-12 14 4 18 M330 400 q18 8 8 20" fill="none" stroke="#4b2e1a" stroke-width="6" stroke-linecap="round"/>',
};

/** `bg` is the ground colour. The picture is fixed markup of our own, never anything a reader typed. */
export function ObjectPhoto({ art, bg, caption, className = "" }: { art: ArtId; bg: string; caption: string; className?: string }) {
  const id = useId();
  const t = useT();
  const svg =
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>` +
    `<rect width="600" height="500" fill="${bg}"/><rect y="372" width="600" height="128" fill="#000" opacity=".09"/>` +
    `<g transform="translate(100 0)"><ellipse cx="200" cy="396" rx="120" ry="15" fill="#000" opacity=".26"/>${ART[art]()}</g>` +
    `<rect width="600" height="500" fill="url(#${id})"/>`;
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={`${t("photo.placeholder")}: ${caption}`}>
      <svg viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
