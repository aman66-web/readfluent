/**
 * Fills each card's `ph` (how to say it, in Latin letters) in a book deck, with the same romaniser the reader's
 * "→A" button uses, so the card and the page always spell a word alike.
 *
 *   npx tsx scripts/books/romanise-deck.ts lib/decks/books/pride-and-prejudice/hi.a1.json
 */
import fs from "node:fs";
import { romaniserFor, romanText } from "../../lib/romanise";

const file = process.argv[2];
if (!file) throw new Error("Give the deck file.");
const deck = JSON.parse(fs.readFileSync(file, "utf8")) as { lang: string; cards: { t: string; ph?: string }[] };
void (async () => {
  const convert = await romaniserFor(deck.lang);
  if (!convert) throw new Error(`${deck.lang} has no Latin-letter form.`);
  for (const c of deck.cards) {
    const ph = romanText(c.t, convert);
    c.ph = ph.charAt(0).toUpperCase() + ph.slice(1);
  }
  fs.writeFileSync(file, JSON.stringify(deck, null, 1) + "\n");
  console.log(`${deck.cards.length} cards romanised`);
})();
