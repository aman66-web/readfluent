import type { CSSProperties } from "react";
import { ART, ArtDefs } from "@/components/welcome/art";

/**
 * Book covers, drawn: a title and an author across the top and one small picture below. The first
 * screen's wall of covers and the library's covers are the same covers, so the book you saw drifting
 * past on the way in is the one you open. A cover scales to whatever width it is given.
 */

export interface Piece {
  id: string;
  x: number;
  y: number;
  s?: number;
  r?: number;
}

export interface Cover {
  /** The cover's ground. */
  bg: string;
  /** A light ground: dark title and ink. */
  light?: boolean;
  /** The title, one string per line, broken by hand so no word is split. */
  title: readonly string[];
  /** Title size in px; long words take less. */
  size?: number;
  author: string;
  /** The icon, drawn in a 200 × 150 area. */
  pieces: readonly Piece[];
}

/* Fifteen public-domain classics, three rows of five, with dark and light
   grounds alternating along each row and down the columns so the wall reads as
   a wall of books rather than a stripe. The palette is cyan, teal, navy, violet
   and cream — no orange. The icon is the book in one picture. */
export const C = {
  pride: { bg: "#0B3B4A", title: ["Pride and", "Prejudice"], size: 16, author: "JANE AUSTEN", pieces: [{ id: "glowCyan", x: 100, y: 78, s: 0.9 }, { id: "book", x: 100, y: 82, s: 0.92 }, { id: "sparkles", x: 100, y: 78, s: 0.9 }] },
  frank: { bg: "#1B2250", title: ["Franken-", "stein"], size: 16, author: "MARY SHELLEY", pieces: [{ id: "glowCyan", x: 100, y: 78, s: 0.95 }, { id: "bolt", x: 100, y: 78, s: 1 }] },
  hound: { bg: "#E3F8FC", light: true, title: ["The Hound", "of the", "Baskervilles"], size: 13, author: "ARTHUR CONAN DOYLE", pieces: [{ id: "lens", x: 98, y: 82, s: 0.95 }] },
  alice: { bg: "#F3EDE3", light: true, title: ["Alice in", "Wonderland"], size: 14, author: "LEWIS CARROLL", pieces: [{ id: "steam", x: 100, y: 72, s: 0.8 }, { id: "cup", x: 100, y: 88, s: 0.82 }] },
  verne: { bg: "#0E7490", title: ["Around the", "World in", "Eighty Days"], size: 14, author: "JULES VERNE", pieces: [{ id: "orbit", x: 100, y: 80, s: 1 }, { id: "globe", x: 100, y: 80, s: 0.9 }] },

  darwin: { bg: "#123D2F", title: ["On the Origin", "of Species"], size: 13.5, author: "CHARLES DARWIN", pieces: [{ id: "glowPale", x: 100, y: 84, s: 0.8 }, { id: "turtle", x: 98, y: 86, s: 1 }] },
  medit: { bg: "#1C1C1F", title: ["Meditations"], size: 14, author: "MARCUS AURELIUS", pieces: [{ id: "glowLamp", x: 100, y: 84, s: 0.85 }, { id: "lamp", x: 100, y: 80, s: 0.92 }] },
  machine: { bg: "#2A1B5A", title: ["The Time", "Machine"], size: 16, author: "H. G. WELLS", pieces: [{ id: "stars", x: 100, y: 78, s: 1 }, { id: "hourglass", x: 100, y: 80, s: 0.9 }] },
  dracula: { bg: "#0A1428", title: ["Dracula"], size: 19, author: "BRAM STOKER", pieces: [{ id: "stars", x: 100, y: 78, s: 1.05 }, { id: "glowPale", x: 98, y: 78, s: 0.8 }, { id: "moon", x: 100, y: 80, s: 0.9 }] },
  treasure: { bg: "#22D3EE", light: true, title: ["Treasure", "Island"], size: 16, author: "R. L. STEVENSON", pieces: [{ id: "compass", x: 100, y: 80, s: 0.95 }, { id: "needle", x: 100, y: 80, s: 0.95 }] },

  moby: { bg: "#164E63", title: ["Moby-Dick"], size: 14.5, author: "HERMAN MELVILLE", pieces: [{ id: "waves", x: 100, y: 96, s: 1 }, { id: "whale", x: 96, y: 84, s: 0.74 }, { id: "spout", x: 96, y: 84, s: 0.74 }] },
  great: { bg: "#D4F4FA", light: true, title: ["Great", "Expectations"], size: 13, author: "CHARLES DICKENS", pieces: [{ id: "frame", x: 100, y: 82, s: 0.88, r: -4 }] },
  women: { bg: "#3B1D4A", title: ["Little", "Women"], size: 17, author: "LOUISA M. ALCOTT", pieces: [{ id: "glowPale", x: 100, y: 82, s: 0.7 }, { id: "stack", x: 100, y: 84, s: 0.92 }] },
  war: { bg: "#26262A", title: ["The Art", "of War"], size: 16, author: "SUN TZU", pieces: [{ id: "glowCyan", x: 100, y: 82, s: 0.85 }, { id: "pawn", x: 100, y: 82, s: 1 }] },
  walden: { bg: "#0F3B38", title: ["Walden"], size: 19, author: "H. D. THOREAU", pieces: [{ id: "glowPale", x: 100, y: 82, s: 0.8 }, { id: "leaf", x: 100, y: 82, s: 1.02 }] },
} satisfies Record<string, Cover>;


/** The covers of the books in the library, by the book's slug. Pride and Prejudice, the Hound and Alice are the first screen's own. */
export const COVERS: Readonly<Record<string, Cover>> = {
  "pride-and-prejudice": C.pride,
  "the-hound-of-the-baskervilles": C.hound,
  "alice-s-adventures-in-wonderland": C.alice,
  "the-richest-man-in-babylon": { bg: "#14407A", title: ["The Richest", "Man in", "Babylon"], size: 13.5, author: "GEORGE S. CLASON", pieces: [{ id: "glowPale", x: 100, y: 84, s: 0.8 }, { id: "stack", x: 100, y: 84, s: 0.9 }] },
  "trees-talk-to-each-other": { bg: "#DDF3E4", light: true, title: ["Trees Talk", "to Each", "Other"], size: 14, author: "", pieces: [{ id: "glowPale", x: 100, y: 84, s: 0.8 }, { id: "leaf", x: 100, y: 82, s: 1 }] },
};

/**
 * One cover at any width. Everything inside is sized in units of 1/112 of the cover's own width,
 * so the same cover is a thumbnail on a list and a poster on a book's page. Still, not moving.
 */
export function CoverFace({ cover, className = "" }: { cover: Cover; className?: string }) {
  const vars = { "--ink": cover.light ? "#16323B" : "#EAFBFF", "--paper": cover.light ? "#FFFFFF" : "#F1FAFC" } as CSSProperties;
  return (
    <div className={`bc ${className}`}>
      <div className="bc-face" style={{ background: cover.bg, color: cover.light ? "#06202B" : "#EAFBFF", ...vars }}>
        <div className="bc-head">
          <p className="bc-title" style={{ fontSize: `calc(var(--u) * ${cover.size ?? 15})` }}>
            {cover.title.map((line, i) => <span key={i} className="block whitespace-nowrap">{line}</span>)}
          </p>
          {cover.author && <p className="bc-author">{cover.author}</p>}
        </div>
        <svg viewBox="0 0 200 150" className="bc-art" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <defs><ArtDefs /></defs>
          {cover.pieces.map((p, i) => {
            const draw = ART[p.id];
            return draw ? <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r ?? 0}) scale(${p.s ?? 1})`}>{draw()}</g> : null;
          })}
        </svg>
      </div>
    </div>
  );
}
