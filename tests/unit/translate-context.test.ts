import { describe, expect, it } from "vitest";
import { markWord, markedAnswer } from "@/lib/translate/context";

describe("a tapped word in its sentence", () => {
  const text = "Il est parti. Elle espère que le jeune homme épousera l'une de ses filles. Fin.";
  it("marks that word in the sentence it is in, and only that sentence", () => {
    const start = text.indexOf("jeune");
    const m = markWord(text, start, "jeune");
    expect(m?.sentence).toBe("Elle espère que le jeune homme épousera l'une de ses filles.");
    expect(m?.marked).toBe("Elle espère que le [jeune] homme épousera l'une de ses filles.");
  });
  it("marks the tapped one when a word comes twice, and refuses a word that is not at that place", () => {
    const t = "Le chat voit le chat.";
    expect(markWord(t, t.lastIndexOf("chat"), "chat")?.marked).toBe("Le chat voit le [chat].");
    expect(markWord(t, 0, "chat")).toBeNull();
  });
  it("reads the answer between the brackets", () => {
    expect(markedAnswer("She hopes that the [young] man will marry one of her daughters.", "jeune")).toBe("young");
    expect(markedAnswer("[ Young ] man.", "jeune")).toBe("young");
    expect(markedAnswer("She hopes that the young man", "jeune")).toBeNull();
    expect(markedAnswer("[a] and [b]", "x")).toBeNull();
    expect(markedAnswer("[one two three four five]", "x")).toBeNull();
  });
  it("keeps a capital where the tapped word has one", () => {
    expect(markedAnswer("[Paris] is big", "Paris")).toBe("Paris");
    expect(markedAnswer("[I] think", "je")).toBe("I");
  });
});
