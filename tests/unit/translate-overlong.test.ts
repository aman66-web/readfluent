import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[][] = [];
vi.mock("@/lib/translate/device", () => ({
  deviceKind: () => "native",
  deviceStatus: async () => "ready",
  // The phone drags the words round "hain" into the brackets when the word is marked in its sentence, and says "are" when asked alone.
  deviceTranslate: async (texts: string[]) => { calls.push(texts); return texts.map((t) => (t.includes("[") ? "Mr Bingley [is kind and affable] and everyone likes him." : "are")); },
}));

import { aloneAnswer, markedAnswer, meaningInContext, overlong, peekMeaning, prepareMeanings } from "@/lib/translate/context";

describe("a one-word tap whose answer came back as a phrase (owner, 6 Oct 2026: 'hain' said 'is kind and affable')", () => {
  beforeEach(() => { calls.length = 0; });

  it("is told apart from a fair answer", () => {
    expect(overlong("is kind and affable", "hain")).toBe(true);
    expect(overlong("are", "hain")).toBe(false);
    expect(overlong("will have", "habrá")).toBe(false);
    // A tapped phrase may be longer.
    expect(overlong("is kind and affable", "kind and")).toBe(false);
  });

  it("asks for the word on its own and uses that", async () => {
    const text = "shree bingle dayaalu aur milansaar hain";
    expect(await meaningInContext(text, text.indexOf("hain"), "hain", "hi", "en")).toBe("are");
    expect(calls).toEqual([[`shree bingle dayaalu aur milansaar [hain]`], ["hain"]]);
  });

  it("does the same for a whole prepared page: one call for the marked words, one more for the words that came back long", async () => {
    const text = "aur sab unhen hain";
    await prepareMeanings(text, "hi", "en");
    expect(calls).toHaveLength(2);
    expect(peekMeaning(text, text.indexOf("hain"), "hain", "hi", "en")).toBe("are");
  });

  it("keeps the old rules for the answer itself", () => {
    expect(markedAnswer("Mr Bingley [is kind and affable] and", "hain")).toBe("is kind and affable");
    expect(aloneAnswer("are.", "hain")).toBe("are");
    expect(aloneAnswer("is kind and affable", "hain")).toBeNull();
    expect(aloneAnswer(undefined, "hain")).toBeNull();
  });
});
