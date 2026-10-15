import { redirect } from "next/navigation";
import { Talk } from "@/components/recall/Talk";
import { talkReady } from "@/lib/talk/ready";

export const metadata = { title: "Talk · ReadFluent" };
// Whether Talk is switched on depends on the server's environment, so this is worked out per request.
export const dynamic = "force-dynamic";

/** A conversation with Pluto in the language being learned. The one screen that calls a model (app/api/talk). */
export default function TalkPage() {
  // While Talk is not switched on there is nothing to show here: back to Recall rather than a "not switched on" page (App Review 2.1).
  if (!talkReady()) redirect("/recall");
  return <Talk ready />;
}
