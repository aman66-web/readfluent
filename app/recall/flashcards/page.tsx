import { Flashcards } from "@/components/recall/Flashcards";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { isTopic } from "@/lib/decks/topics";
import { isLanguage } from "@/lib/onboarding/languages";

export const metadata = { title: "Flashcards · ReadFluent" };

/** `?deck=50&lang=es` is one phrase deck, `?topic=food&lang=es` one topic deck; with nothing, everything that is due. */
export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ deck?: string; topic?: string; lang?: string }> }) {
  const q = await searchParams;
  const size = DECK_SIZES.find((s) => String(s) === q.deck) as DeckSize | undefined;
  const lang = isLanguage(q.lang) ? q.lang : null;
  const topic = isTopic(q.topic) && lang ? q.topic : null;
  return <Flashcards deck={size && lang && !topic ? size : null} lang={(size || topic) && lang ? lang : null} topic={topic} />;
}
