import { RecallView } from "@/components/recall/RecallView";
import { talkReady } from "@/lib/talk/ready";

export const metadata = { title: "Recall · ReadFluent" };
// Whether Talk is switched on depends on the server's environment, so this is worked out per request.
export const dynamic = "force-dynamic";

/** The words met while reading, coming back before they are forgotten, tests, and Talk. */
export default function RecallPage() {
  return <RecallView talkReady={talkReady()} />;
}
