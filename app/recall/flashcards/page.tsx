import { Flashcards } from "@/components/recall/Flashcards";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { isTopic } from "@/lib/decks/topics";
import { isLanguage } from "@/lib/onboarding/languages";
import { findBook } from "@/lib/preview/catalog";

export const metadata = { title: "Flashcards · ReadFluent" };

/** `?deck=50&lang=es` is one phrase deck, `?topic=food&lang=es` one topic deck, `?book=<slug>` every word saved from one book; with nothing, everything that is due. */
export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ deck?: string; topic?: string; lang?: string; book?: string }> }) {
  const q = await searchParams;
  const size = DECK_SIZES.find((s) => String(s) === q.deck) as DeckSize | undefined;
  const lang = isLanguage(q.lang) ? q.lang : null;
  const topic = isTopic(q.topic) && lang ? q.topic : null;
  const found = q.book ? findBook(q.book) : undefined;
  const book = found ? { slug: found.slug, title: found.title } : null;
  return <Flashcards deck={!book && size && lang && !topic ? size : null} lang={!book && (size || topic) && lang ? lang : null} topic={book ? null : topic} book={book} />;
}
