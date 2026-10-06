import { Flashcards } from "@/components/recall/Flashcards";
import { DECK_SIZES, type DeckSize } from "@/lib/decks";
import { bookDeckLevel, loadBookDeck } from "@/lib/decks/books";
import { isTopic } from "@/lib/decks/topics";
import { isLanguage } from "@/lib/onboarding/languages";
import { findBook } from "@/lib/preview/catalog";

export const metadata = { title: "Flashcards · ReadFluent" };

/** `?deck=50&lang=es` is one phrase deck, `?topic=food&lang=es` one topic deck, `?book=<slug>` every word saved from one book, `?phrases=<slug>&lang=hi` the phrases of one book; with nothing, everything that is due. */
export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ deck?: string; topic?: string; lang?: string; book?: string; phrases?: string }> }) {
  const q = await searchParams;
  const deckSize = DECK_SIZES.find((s) => String(s) === q.deck) as DeckSize | undefined;
  const lang = isLanguage(q.lang) ? q.lang : null;
  const topic = isTopic(q.topic) && lang ? q.topic : null;
  const found = q.book ? findBook(q.book) : undefined;
  const book = found ? { slug: found.slug, title: found.title } : null;
  // A book's own phrases: only where the book has a deck in that language.
  const phrasesBook = !book && q.phrases ? findBook(q.phrases) : undefined;
  const level = phrasesBook && lang ? bookDeckLevel(phrasesBook.slug, lang) : null;
  const size = phrasesBook && lang && level ? (await loadBookDeck(phrasesBook.slug, lang, level)).length : 0;
  const bookDeck = phrasesBook && lang && level && size > 0 ? { slug: phrasesBook.slug, title: phrasesBook.title, lang, level, size } : null;
  if (bookDeck) return <Flashcards deck={null} lang={null} bookDeck={bookDeck} />;
  return <Flashcards deck={!book && deckSize && lang && !topic ? deckSize : null} lang={!book && (deckSize || topic) && lang ? lang : null} topic={book ? null : topic} book={book} />;
}
