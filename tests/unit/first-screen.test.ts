import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotNumber } from "@/components/DotMatrix";
import { ART } from "@/components/welcome/art";
import { FirstScreen, MOTION, ROWS } from "@/components/welcome/FirstScreen";
import { APP_NAME, BRAND, TAGLINE } from "@/lib/brand";

describe("the first screen's wall of covers", () => {
  const covers = ROWS.flat();

  it("is three rows of five, every cover different", () => {
    expect(ROWS).toHaveLength(3);
    for (const row of ROWS) expect(row).toHaveLength(5);
    expect(new Set(covers.map((c) => c.title.join(" "))).size).toBe(15);
  });

  it("puts a real title and author across the top of every cover", () => {
    for (const c of covers) {
      expect(c.title.length, c.author).toBeGreaterThan(0);
      expect(c.title.length, `${c.title.join(" ")} has too many lines for the top of a cover`).toBeLessThanOrEqual(3);
      for (const line of c.title) expect(line.trim().length).toBeGreaterThan(0);
      expect(c.author).toBe(c.author.toUpperCase());
    }
  });

  it("only uses icons that exist: a typo would silently draw nothing", () => {
    for (const c of covers) for (const p of c.pieces) expect(ART, `no drawing called "${p.id}"`).toHaveProperty(p.id);
  });

  it("gives every icon a motion: every cover on the wall is alive", () => {
    for (const c of covers) for (const p of c.pieces) expect(MOTION, `"${p.id}" does not move`).toHaveProperty(p.id);
  });

  it("alternates dark and light grounds, so it reads as a wall rather than a stripe", () => {
    for (const row of ROWS) expect(new Set(row.map((c) => Boolean(c.light))).size).toBe(2);
  });

  it("carries nothing but books: no money, no bank", () => {
    const ids = covers.flatMap((c) => c.pieces.map((p) => p.id));
    for (const bad of ["bank", "coins", "gauge", "deposit", "car", "reserves", "stamp"]) expect(ids).not.toContain(bad);
  });

  it("draws each cover as a book, two units wide to three tall", () => {
    const css = readFileSync(new URL("../../app/welcome/welcome.css", import.meta.url), "utf8");
    const w = Number(/\.first-cover \{[^}]*?width:\s*(\d+)px/s.exec(css)?.[1]);
    const h = Number(/\.first-cover \{[^}]*?height:\s*(\d+)px/s.exec(css)?.[1]);
    expect(h / w).toBeCloseTo(1.5, 1);
  });

  it("loops without a seam: three copies, slid by a third", () => {
    const css = readFileSync(new URL("../../app/welcome/welcome.css", import.meta.url), "utf8");
    expect(css).toContain("translateX(-33.3333%)");
    const html = renderToStaticMarkup(createElement(FirstScreen, { onStart: () => {} }));
    expect((html.match(/class="first-cover"/g) ?? []).length).toBe(15 * 3);
  });
});

describe("the brand is cyan", () => {
  const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  // The warm accents the earlier orange palette used. None may return.
  const ORANGE = /#(?:c2522b|ee5a2a|f26a3a|e8593a|e8693c|f07a4a|b8401c|c2452a|d92c7a|ffb36b|f5b83d|ffd27a|f4b8b0)\b/i;

  it("has no orange anywhere on the first screen, in the app's tokens or in the icons", () => {
    for (const f of ["components/welcome/art.tsx", "components/welcome/FirstScreen.tsx", "components/DotMatrix.tsx", "app/welcome/welcome.css", "app/globals.css", "public/icon.svg", "public/icon-maskable.svg", "lib/brand.ts"]) {
      expect(ORANGE.test(read(f)), `${f} still has an orange`).toBe(false);
    }
  });

  it("sets the app's accent to the brand's deep cyan, and the brighter one beside it", () => {
    const css = read("app/globals.css");
    expect(css).toContain(`--accent: ${BRAND.deep.toLowerCase()};`);
    expect(css).toContain(`--accent-bright: ${BRAND.bright.toLowerCase()};`);
  });

  it("is cyan: a blue-green hue, light enough on dark and dark enough on paper", () => {
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return ((h * 60) + 360) % 360;
    };
    for (const c of [BRAND.light, BRAND.bright, BRAND.deep]) {
      const h = hue(c);
      expect(h, c).toBeGreaterThanOrEqual(180);
      expect(h, c).toBeLessThanOrEqual(200);
    }
    const lum = (hex: string) => {
      const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    // Text in the deep cyan on the app's paper, and the dark ink on the bright cyan button: both readable.
    expect(contrast(BRAND.deep, "#f6f1e7")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(BRAND.ink, BRAND.bright)).toBeGreaterThanOrEqual(7);
  });
});

describe("the name in lamps", () => {
  it("has a glyph for every letter of both lines", () => {
    const [top, bottom] = APP_NAME.split(/(?=[A-Z])/);
    expect([top, bottom]).toEqual(["Read", "Fluent"]);
    for (const word of [top, bottom]) {
      const svg = renderToStaticMarkup(createElement(DotNumber, { value: word, cell: 7 }));
      expect(svg).toContain("<circle");
      // Every letter drew something: the lamp count is more than a letter's worth each.
      expect((svg.match(/<circle/g) ?? []).length).toBeGreaterThan(word.length * 5);
    }
  });

  it("is announced once, as the app's name, not letter by letter", () => {
    const html = renderToStaticMarkup(createElement(FirstScreen, { onStart: () => {} }));
    expect(html).toContain(`aria-label="${APP_NAME}"`);
  });
});

describe("the screen", () => {
  const html = renderToStaticMarkup(createElement(FirstScreen, { onStart: () => {} }));

  it("says what the app is, with one way in", () => {
    // The tagline's second sentence is picked out in its own span.
    expect(html.replace(/<[^>]+>/g, "")).toContain(TAGLINE);
    expect(html).toContain("Get started");
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("links the privacy policy under the button", () => {
    expect(html).toContain('href="/privacy"');
  });

  it("hides the wall from screen readers and leaves it unclickable", () => {
    expect(html).toMatch(/class="first-wall pointer-events-none[^"]*" aria-hidden="true"/);
  });
});
