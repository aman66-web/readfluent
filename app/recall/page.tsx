import { RecallView } from "@/components/recall/RecallView";

export const metadata = { title: "Recall · ReadFluent" };

/** The words met while reading, coming back before they are forgotten. The flashcards themselves are M7; this is its place in the menu. */
export default function RecallPage() {
  return <RecallView />;
}
