import { useSyncExternalStore } from "react";
import { localDay } from "./ledger";

/**
 * The reader's local day, as the screen should see it.
 *
 * "" on the server (it does not know which day it is where the reader is), the real day on the
 * device, and a new value when the app is brought back to the front or midnight passes while it is
 * open. Anything drawn from the date waits for it, so the server and the first client render agree
 * and a phone left open overnight does not go on showing yesterday.
 */
function subscribe(fn: () => void): () => void {
  const wake = () => fn();
  document.addEventListener("visibilitychange", wake);
  const id = window.setInterval(wake, 60_000);
  return () => {
    document.removeEventListener("visibilitychange", wake);
    window.clearInterval(id);
  };
}

export function useToday(): string {
  return useSyncExternalStore(subscribe, () => localDay(), () => "");
}

/** Noon on that day, so a daylight-saving shift can never move it to another date. */
export const dayDate = (day: string): Date => new Date(`${day}T12:00:00`);
