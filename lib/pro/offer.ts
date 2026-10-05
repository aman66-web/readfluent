import { storageKey } from "@/lib/brand";
import { purchasesAvailable } from "@/lib/purchases/native";
import { readRaw, writeRaw } from "@/lib/store/local";

/**
 * The subscription screen that comes once, before the guided tour (components/paywall/OfferGate).
 *
 * `OFFER_KEY` remembers on the device that it has been dealt with (bought, or "Continue free", or the
 * tour was already done), so it never comes twice. While it may still come, the tour waits
 * (`holdsTour`): the tour starts the moment the offer is out of the way, or at once when there is
 * nothing to offer (a browser, no store prices, signed out, already Pro).
 */
export const OFFER_KEY = storageKey("offer");

export const offerSeen = (): boolean => readRaw(OFFER_KEY) === "1";
export const markOfferSeen = (): void => { writeRaw(OFFER_KEY, "1"); release(); };

let released = false;
const listeners = new Set<() => void>();

/** The offer is out of the way for this launch (shown and closed, or not to be shown): the tour may start. */
export function release(): void {
  if (released) return;
  released = true;
  for (const fn of [...listeners]) fn();
}

export function subscribeHold(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** True while the offer may still come: only on the phone with a store to sell in, and only until it is dealt with. */
export const holdsTour = (): boolean => !released && purchasesAvailable() && !offerSeen();
