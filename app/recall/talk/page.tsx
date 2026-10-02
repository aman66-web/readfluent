import { Talk } from "@/components/recall/Talk";

export const metadata = { title: "Talk · ReadFluent" };

/** A conversation with Dewey in the language being learned. The one screen that calls a model (app/api/talk). */
export default function TalkPage() {
  return <Talk />;
}
