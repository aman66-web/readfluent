import { OfflineView } from "@/components/OfflineView";

/**
 * What a page that was not downloaded opens on with no connection. Plain on
 * purpose: it is served from the shell cache, so it must need nothing else.
 */
export default function Offline() {
  return <OfflineView />;
}
