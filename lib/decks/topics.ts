import type { Phrase } from "./index";

/**
 * The topic decks: for each language, twelve small decks of 25 phrases (greetings, food, travel…), each a place to start
 * that is not "everything". One JSON file per language (`topics/<code>.json`), fetched only when somebody opens a deck.
 */
export const TOPICS = [
  { id: "greetings", icon: "👋" },
  { id: "numbers", icon: "🔢" },
  { id: "time", icon: "🕒" },
  { id: "food", icon: "🍽️" },
  { id: "travel", icon: "🧭" },
  { id: "shopping", icon: "🛍️" },
  { id: "family", icon: "👪" },
  { id: "home", icon: "🏠" },
  { id: "health", icon: "🩺" },
  { id: "feelings", icon: "🙂" },
  { id: "work", icon: "💼" },
  { id: "weather", icon: "⛅" },
] as const;
export type TopicId = (typeof TOPICS)[number]["id"];
export const TOPIC_SIZE = 25;

export const isTopic = (s: string | undefined | null): s is TopicId => TOPICS.some((t) => t.id === s);

/** `topic:<language>:<topic>:<index>`: the flashcard id of the nth phrase of a topic deck. */
export const topicCardId = (lang: string, topic: TopicId, index: number): string => `topic:${lang}:${topic}:${index}`;

export function parseTopicCardId(id: string): { lang: string; topic: TopicId; index: number } | null {
  const m = /^topic:([a-z]{2}):([a-z]+):(\d{1,3})$/.exec(id);
  return m && isTopic(m[2]) ? { lang: m[1], topic: m[2], index: Number(m[3]) } : null;
}

const LANG = /^[a-z]{2}$/;

export async function loadTopics(lang: string): Promise<Partial<Record<TopicId, Phrase[]>>> {
  if (!LANG.test(lang)) return {};
  try {
    const mod = (await import(`./topics/${lang}.json`)) as { default: { topics: Record<string, Phrase[]> } };
    const out: Partial<Record<TopicId, Phrase[]>> = {};
    for (const { id } of TOPICS) out[id] = (mod.default.topics[id] ?? []).filter((p) => typeof p.t === "string" && typeof p.en === "string");
    return out;
  } catch {
    return {};
  }
}
