import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reader = readFileSync(new URL("../../components/Reader.tsx", import.meta.url), "utf8");
const pick = reader.slice(reader.indexOf("const pick = ("), reader.indexOf("const selPage"));

describe("a tapped word is said aloud at once (owner, 6 Oct 2026)", () => {
  it("says the word, and the whole phrase when the word belongs to one, from inside the tap", () => {
    // From the tap's own call stack: the phone only lets speech start from a touch, so it cannot wait for the card's meaning.
    expect(pick).toContain("sayTapped(word)");
    expect(pick).toContain("sayTapped(phrase)");
  });

  it("uses the phone's voice for the language being read, at the normal (or slow, if chosen) speed", () => {
    expect(reader).toContain("speak(text, variant.lang, slow ? 0.7 : 0.95");
  });

  it("tells the reader at most once, not on every tap, that the phone has no voice for the language", () => {
    expect(reader).toContain("toldNoVoice");
  });

  it("leaves the card's Listen and Say it slowly buttons in place", () => {
    expect(reader).toContain("onListen={() => hear(");
    expect(reader).toContain("onSlow={() => hear(0.5)}");
  });
});
