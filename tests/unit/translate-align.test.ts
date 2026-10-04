import { describe, expect, it } from "vitest";
import { keySpans } from "@/lib/reading/keys";
import { bracketed, markRange, pickKeys, standsIn } from "@/lib/translate/align";

describe("matching a page to its English line", () => {
  const en = "She hopes the young man will marry one of her daughters.";
  it("picks a phrase and the longest words, in the order they come", () => {
    expect(pickKeys(en).map((p) => p.text)).toEqual(["hopes", "young man", "daughters"]);
  });
  it("marks a pick in the English and reads the answer between the brackets", () => {
    const p = pickKeys(en)[1];
    expect(markRange(en, p.start, p.end)).toBe("She hopes the [young man] will marry one of her daughters.");
    expect(bracketed("Elle espère que le [jeune homme] épousera l'une de ses filles.")).toBe("jeune homme");
    expect(bracketed("No brackets here")).toBeNull();
  });
  it("keeps a match only if its words stand in the page", () => {
    const fr = "Elle espère que le jeune homme épousera l'une de ses filles.";
    expect(standsIn(fr, "jeune homme")).toBe(true);
    expect(standsIn(fr, "homme jeune")).toBe(false);
    expect(standsIn(fr, "jeun")).toBe(false);
  });
});

describe("matched words and phrases", () => {
  it("marks every word of a phrase, on either side, with the key's number", () => {
    const keys = [{ w: "espère", en: "hopes" }, { w: "jeune homme", en: "young man" }];
    const fr = "Elle espère que le jeune homme épousera.";
    const spans = keySpans(fr, keys, "w");
    expect(spans.get(fr.indexOf("espère"))).toBe(0);
    expect(spans.get(fr.indexOf("jeune"))).toBe(1);
    expect(spans.get(fr.indexOf("homme"))).toBe(1);
    expect(spans.get(fr.indexOf("Elle"))).toBeUndefined();
    const line = "She hopes the young man will marry.";
    const e = keySpans(line, keys, "en");
    expect(e.get(line.indexOf("young"))).toBe(1);
    expect(e.get(line.indexOf("man"))).toBe(1);
    expect(e.get(line.indexOf("hopes"))).toBe(0);
  });
});
