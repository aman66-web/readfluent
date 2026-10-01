/**
 * The lamp grid.
 *
 * A dot-matrix readout: an actual 5x7 grid of lit lamps, not a bold typeface. It
 * is what makes the first screen's name read as an instrument. Rendered as SVG
 * circles rather than a webfont: a font would need hinting to keep the lamps
 * circular at every size, and the unlit field, the glow and the per-lamp
 * animation are all impossible once it is glyphs.
 *
 * No hooks anywhere in this file, so every piece works in a server component.
 * (Taken from the app this one was adapted from; its child-mode sizing and the
 * paragraph helper were left behind.)
 */

/** 5 wide, 7 tall, `#` is lit. Punctuation is narrower and keeps its own width. */
const GLYPHS: Record<string, string[]> = {
  "0": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  ".": [".", ".", ".", ".", ".", ".", "#"],
  ",": [".", ".", ".", ".", ".", "#", "#"],
  ":": [".", "#", ".", ".", ".", "#", "."],
  "-": ["...", "...", "...", "###", "...", "...", "..."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "!": ["#", "#", "#", "#", "#", ".", "#"],
  "'": ["#", "#", ".", ".", ".", ".", "."],
  " ": ["...", "...", "...", "...", "...", "...", "..."],

  // The alphabet, so a short headline can be set in lamps the way the
  // reference sets "NEW PLAN". Words only — a sentence in a 5x7 grid is a
  // wall, which is why DotText caps what it will render.
  "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  "I": [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "J": ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  "S": [".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."],
  "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  "X": ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
};

const ROWS = 7;

/**
 * Under this pitch a lamp is under 4px across and a two-digit figure reads as
 * texture, not a number. A readout that small is set in type instead.
 */
export const LAMP_MIN_CELL = 6;

export interface DotNumberProps {
  /** What to display. Anything not in the glyph table is skipped. */
  value: string | number;
  /** Grid pitch in px. The lamp itself is a little over a third of this. */
  cell?: number;
  color?: string;
  /** Draw the unlit lamps too, which is what makes it read as a panel. */
  field?: boolean;
  fieldColor?: string;
  /** Bloom around each lit lamp. */
  glow?: boolean;
  className?: string;
  /** Screen-reader text; defaults to the value itself. */
  label?: string;
  /** Light the lamps one after another, left to right, when they first appear. */
  stagger?: boolean;
}

export function DotNumber({
  value,
  cell = 9,
  color = "#A5F3FC",
  field = false,
  fieldColor = "rgba(255,255,255,.06)",
  glow = true,
  className = "",
  label,
  stagger = false,
}: DotNumberProps) {
  if (cell < LAMP_MIN_CELL) {
    return (
      <span className={`tabular block font-semibold leading-none ${className}`} role="img"
            aria-label={label ?? String(value)}
            style={{ fontSize: Math.round(cell * 5.4), color, letterSpacing: "-0.02em" }}>
        {String(value)}
      </span>
    );
  }

  const chars = String(value).toUpperCase().split("").filter((c) => c in GLYPHS);
  if (chars.length === 0) return null;

  const r = cell * 0.37;
  const lit: { x: number; y: number }[] = [];
  const dim: { x: number; y: number }[] = [];

  let x0 = 0;
  for (const ch of chars) {
    const rows = GLYPHS[ch];
    const w = rows[0].length;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < w; col++) {
        const p = { x: (x0 + col + 0.5) * cell, y: (row + 0.5) * cell };
        if (rows[row][col] === "#") lit.push(p);
        else if (field) dim.push(p);
      }
    }
    x0 += w + 1; // one cell of tracking
  }
  const width = (x0 - 1) * cell;
  const height = ROWS * cell;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? String(value)}
      style={{ overflow: "visible", display: "block" }}
    >
      {dim.map((p, i) => (
        <circle key={`d${i}`} cx={p.x} cy={p.y} r={r} fill={fieldColor} />
      ))}
      {/* One filter on the group, not one per lamp: a per-circle drop-shadow on
          a three-digit readout is 100+ filter regions and it shows on scroll.
          Below ~5px the bloom is wider than the lamp itself and the glyph turns
          to mush, so a small readout is lit but not blooming. */}
      <g style={glow && cell >= 5 ? { filter: `drop-shadow(0 0 ${cell * 0.5}px ${color})` } : undefined}>
        {lit.map((p, i) => (
          <circle key={`l${i}`} cx={p.x} cy={p.y} r={r} fill={color}
                  className={stagger ? "lamp-stagger" : undefined}
                  style={stagger ? { animationDelay: `${i * 18}ms` } : undefined} />
        ))}
      </g>
    </svg>
  );
}
