import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { composeScene, hash, skyColours } from "@/lib/art/scene";
import { SceneArt } from "@/components/art/SceneArt";

describe("page pictures drawn from the scene caption", () => {
  it("is deterministic: the same caption and seed draw the same scene", () => {
    const a = composeScene("A ship sails at night under the moon", "book:3");
    expect(composeScene("A ship sails at night under the moon", "book:3")).toEqual(a);
    expect(hash("x")).toBe(hash("x"));
  });

  it("reads the setting, the sky and the things a caption names", () => {
    const s = composeScene("Two sailors haul a rope on the deck of a ship at night", "b:1");
    expect(s.setting).toBe("sea");
    expect(s.sky).toBe("night");
    expect(s.things.map((t) => t.motif)).toContain("ship");
    expect(s.people.length).toBe(1);
    expect(s.people[0].kind).toBe("group");
  });

  it("varies pages whose captions say nothing", () => {
    const seen = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(composeScene("A quiet moment", `b:${i}`))));
    expect(seen.size).toBeGreaterThan(4);
  });

  it("gives every sky two colours", () => {
    for (const k of ["day", "dawn", "dusk", "night", "storm", "snow"] as const) expect(skyColours(k, 120)).toHaveLength(2);
  });

  it("renders the same markup twice (no randomness, so no hydration mismatch)", () => {
    const html = () => renderToStaticMarkup(createElement(SceneArt, { caption: "Rain falls on a village street", seed: "b:2", id: "t" }));
    expect(html()).toBe(html());
    expect(html()).toContain("<svg");
  });
});
