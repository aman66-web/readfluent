import { DecksView } from "@/components/recall/DecksView";

export const metadata = { title: "Decks · ReadFluent" };

/** The decks to choose from: the essential phrases and a deck for each topic, in the language being learned. */
export default function DecksPage() {
  return <DecksView />;
}
