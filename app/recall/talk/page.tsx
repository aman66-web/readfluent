import { Talk } from "@/components/recall/Talk";
import { talkReady } from "@/lib/talk/ready";

export const metadata = { title: "Talk · ReadFluent" };
// Whether Talk is switched on depends on the server's environment, so this is worked out per request.
export const dynamic = "force-dynamic";

/** A conversation with Dewey in the language being learned. The one screen that calls a model (app/api/talk). */
export default function TalkPage() {
  return <Talk ready={talkReady()} />;
}
