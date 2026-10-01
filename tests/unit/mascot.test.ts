import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Lex, type Mood } from "@/components/mascot/Lex";

const MOODS: Mood[] = ["hello", "reading", "cheer", "sleepy"];
const draw = (props: Parameters<typeof Lex>[0]) => renderToStaticMarkup(createElement(Lex, props));

describe("Lex, the mascot", () => {
  it("draws in every pose, with its round glasses, and hidden from screen readers", () => {
    for (const mood of MOODS) {
      const svg = draw({ mood });
      expect(svg, mood).toContain(`lx-${mood}`);
      expect(svg, mood).toContain('aria-hidden="true"');
      // Two glasses lenses and the bridge.
      expect((svg.match(/r="17.5"/g) ?? []).length, mood).toBe(2);
    }
  });

  it("waves when it says hello, throws its arms up to cheer, and has a different face in each pose", () => {
    expect(draw({ mood: "hello" })).toContain("lx-wave");
    expect(draw({ mood: "cheer" })).toContain("lx-cheer-l");
    expect(draw({ mood: "cheer" })).not.toContain("lx-wave");
    expect(draw({ mood: "sleepy" })).toContain("lx-z");
    expect(draw({ mood: "reading" })).toContain("lx-rise");
    expect(new Set(MOODS.map((m) => draw({ mood: m }))).size).toBe(4);
  });

  it("moves its mouth while it talks, and crops to the head for the small avatar", () => {
    expect(draw({ mood: "hello" })).not.toContain("lx-talk");
    expect(draw({ mood: "hello", talking: true })).toContain("lx-talk");
    expect(draw({ crop: "head" })).toContain('viewBox="64 12 108 118"');
    expect(draw({})).toContain('viewBox="0 0 240 240"');
  });
});
