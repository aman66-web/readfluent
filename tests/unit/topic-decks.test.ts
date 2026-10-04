import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TOPICS, TOPIC_SIZE, loadTopics, parseTopicCardId, topicCardId } from "@/lib/decks/topics";

/** The topic decks (lib/decks/topics/<lang>.json): every language has all twelve, 25 phrases each, no blanks or repeats. */
const DIR = path.join(process.cwd(), "lib/decks/topics");
const LANGS = ["ar", "bn", "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko", "nl", "pl", "pt", "ru", "tr", "uk", "ur", "vi", "zh"];

describe("topic decks", () => {
  it("exist for every interface language", () => {
    expect(fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, 2)).sort()).toEqual(LANGS);
  });

  for (const lang of LANGS) {
    it(`${lang}: 12 topics × ${TOPIC_SIZE} phrases, no blanks, no repeats`, () => {
      const data = JSON.parse(fs.readFileSync(path.join(DIR, `${lang}.json`), "utf8"));
      expect(data.lang).toBe(lang);
      expect(Object.keys(data.topics)).toEqual(TOPICS.map((t) => t.id));
      for (const { id } of TOPICS) {
        const cards = data.topics[id] as { t: string; en: string; ph?: string }[];
        expect(cards.length, id).toBe(TOPIC_SIZE);
        for (const c of cards) {
          expect(c.t?.trim(), `${id} t`).toBeTruthy();
          expect(c.en?.trim(), `${id} en`).toBeTruthy();
        }
        expect(new Set(cards.map((c) => c.t)).size, `${id} repeats`).toBe(TOPIC_SIZE);
      }
    });
  }

  it("card ids round-trip and reject nonsense", () => {
    expect(parseTopicCardId(topicCardId("es", "food", 7))).toEqual({ lang: "es", topic: "food", index: 7 });
    expect(parseTopicCardId("topic:es:nope:1")).toBeNull();
    expect(parseTopicCardId("es:12")).toBeNull();
  });

  it("load by language, and only for a real one", async () => {
    expect(await loadTopics("../x")).toEqual({});
    expect(await loadTopics("zz")).toEqual({});
    expect((await loadTopics("en")).food?.length).toBe(TOPIC_SIZE);
  });
});
