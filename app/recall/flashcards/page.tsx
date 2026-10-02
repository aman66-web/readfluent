import { Flashcards } from "@/components/recall/Flashcards";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { isLanguage } from "@/lib/onboarding/languages";

export const metadata = { title: "Flashcards · ReadFluent" };

/** `?deck=50&lang=es` is one phrase deck; with nothing, everything that is due. */
export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ deck?: string; lang?: string }> }) {
  const q = await searchParams;
  const size = DECK_SIZES.find((s) => String(s) === q.deck) as DeckSize | undefined;
  const lang = isLanguage(q.lang) ? q.lang : null;
  return <Flashcards deck={size && lang ? size : null} lang={size && lang ? lang : null} />;
}
