import type { Phrase } from "@/lib/decks";
import type { TopicId } from "@/lib/decks/topics";
import type { Cefr } from "@/lib/xp/levels";

/**
 * The words a level's vocabulary questions draw on, for a language that has only its phrase decks (Spanish and English have
 * sentence banks instead). The first fifty phrases and some topics are A1, the next fifty and more topics A2, the rest of the
 * topics B1; above that the decks have nothing new, so B2 to C2 ask from all of it (honestly: the deck is the vocabulary there is).
 */
const BY_LEVEL: Record<Cefr, { deck: [number, number]; topics: TopicId[] }> = {
  A1: { deck: [0, 50], topics: ["greetings", "numbers", "time", "family"] },
  A2: { deck: [40, 100], topics: ["food", "travel", "shopping", "home"] },
  B1: { deck: [50, 100], topics: ["health", "feelings", "work", "weather"] },
  B2: { deck: [0, 100], topics: ["health", "feelings", "work", "weather", "travel", "shopping"] },
  C1: { deck: [0, 100], topics: ["health", "feelings", "work", "weather", "travel", "shopping", "home", "food"] },
  C2: { deck: [0, 100], topics: ["health", "feelings", "work", "weather", "travel", "shopping", "home", "food", "family", "time"] },
};

export function levelPairs(level: Cefr, deck: readonly Phrase[], topics: Partial<Record<TopicId, readonly Phrase[]>>): [string, string][] {
  const { deck: [a, b], topics: ids } = BY_LEVEL[level];
  const phrases = [...deck.slice(a, b), ...ids.flatMap((id) => topics[id] ?? [])];
  return [...new Map(phrases.map((p) => [p.t.toLowerCase(), [p.t, p.en] as [string, string]])).values()];
}
