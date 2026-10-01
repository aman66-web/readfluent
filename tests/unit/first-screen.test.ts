import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DotNumber } from "@/components/DotMatrix";
import { ART } from "@/components/welcome/art";
import { FirstScreen, MOTION, ROWS } from "@/components/welcome/FirstScreen";
import { APP_NAME, TAGLINE } from "@/lib/brand";

describe("the first screen's wall", () => {
  const tiles = ROWS.flat();

  it("is four rows of four, every tile different", () => {
    expect(ROWS).toHaveLength(4);
    for (const row of ROWS) expect(row).toHaveLength(4);
    expect(new Set(tiles.map((t) => JSON.stringify(t.pieces))).size).toBe(16);
  });

  it("only uses drawings that exist: a typo would silently draw nothing", () => {
    for (const t of tiles) for (const p of t.pieces) expect(ART, `no drawing called "${p.id}"`).toHaveProperty(p.id);
  });

  it("gives every drawing a motion: every tile on the wall is alive", () => {
    for (const t of tiles) for (const p of t.pieces) expect(MOTION, `"${p.id}" does not move`).toHaveProperty(p.id);
  });

  it("alternates dark and light grounds, so it reads as a wall rather than a stripe", () => {
    for (const row of ROWS) expect(new Set(row.map((t) => Boolean(t.light))).size).toBe(2);
  });

  it("carries nothing but reading: no money, no bank", () => {
    const ids = tiles.flatMap((t) => t.pieces.map((p) => p.id));
    for (const bad of ["bank", "coins", "gauge", "deposit", "car", "reserves", "stamp"]) expect(ids).not.toContain(bad);
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
    expect(html).toContain(TAGLINE);
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
