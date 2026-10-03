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

describe("caption rules (audited against real captions)", () => {
  const sc = (c: string) => composeScene(c, "b:1");
  const motifs = (c: string) => sc(c).things.map((t) => t.motif);
  it("never falls back to water, sea, mountain or forest, and draws no random prop", () => {
    for (let i = 0; i < 200; i++) {
      const s = composeScene("A quiet moment", `b:${i}`);
      expect(["field", "garden", "road", "street"]).toContain(s.setting);
      expect(s.things).toHaveLength(0);
    }
    expect(sc("Lena sips herbal tea in soft lamplight").setting).toBe("room");
  });
  it("does not turn rain or a well into a lake", () => {
    expect(sc("Jane hides behind a red curtain, rain outside").setting).not.toBe("water");
    expect(sc("She feels well again").setting).not.toBe("water");
    expect(sc("Rain falls on the road").rain).toBe(true);
  });
  it("reads rooms before streets, and courts as rooms", () => {
    expect(sc("A lamp burns at a writing table in a sitting room in Baker Street").setting).toBe("room");
    expect(sc("Elizabeth stands before the crowded court trial").setting).toBe("room");
  });
  it("does not draw bar charts, campfires, coffins or wine for the wrong words", () => {
    expect(motifs("Couples dancing in rows")).not.toContain("chart");
    expect(motifs("A lamp burns on the desk")).not.toContain("fire");
    expect(motifs("A firelit dining room")).toContain("hearth");
    expect(motifs("Kofi does a press-up with his whole body")).not.toContain("coffin");
    expect(motifs("A girl drinks a glass of water at a kitchen table")).not.toContain("wine");
    expect(motifs("A girl drinks a glass of water at a kitchen table")).toContain("cup");
    expect(motifs("A grave under the yew")).toContain("coffin");
  });
  it("sees plural people and fog", () => {
    expect(sc("Five sisters sit sewing").people).toHaveLength(1);
    expect(sc("Scrooge hurries through a foggy London street").people).toHaveLength(1);
    expect(sc("Scrooge hurries through a foggy London street").sky).toBe("storm");
  });
});
