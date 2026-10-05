import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[][] = [];
vi.mock("@/lib/translate/device", () => ({
  deviceKind: () => "native",
  deviceStatus: async () => "ready",
  // Pretends the phone turns "La casa es [pequeña]." into "The house is [small]." for any bracketed word.
  deviceTranslate: async (texts: string[]) => { calls.push(texts); return texts.map((t) => t.replace(/\[[^\]]+\]/, "[word]")); },
}));

import { meaningInContext, peekMeaning, prepareMeanings } from "@/lib/translate/context";

describe("meanings prepared before a tap", () => {
  beforeEach(() => { calls.length = 0; });
  const text = "La casa era pequeña, con una mesa.";

  it("asks the phone once for the whole page, then a tap is answered at once without asking again", async () => {
    expect(peekMeaning(text, text.indexOf("casa"), "casa", "es", "en")).toBeUndefined();
    await prepareMeanings(text, "es", "en");
    expect(calls).toHaveLength(1);
    expect(calls[0].length).toBe(7);
    expect(peekMeaning(text, text.indexOf("casa"), "casa", "es", "en")).toBe("word");
    expect(await meaningInContext(text, text.indexOf("mesa"), "mesa", "es", "en")).toBe("word");
    expect(calls).toHaveLength(1);
  });

  it("does nothing twice for a page it has already done", async () => {
    await prepareMeanings(text, "es", "en");
    expect(calls).toHaveLength(0);
  });

  it("does nothing when the page is already in the reader's language", async () => {
    await prepareMeanings("The house was small.", "en", "en");
    expect(calls).toHaveLength(0);
  });
});
