"use client";

import { useEffect, useState } from "react";
import { deviceKind } from "@/lib/translate/device";
import { meaningInContext } from "@/lib/translate/context";

/**
 * What the tapped word means in its sentence, in the reader's language (lib/translate/context.ts).
 * `pending` while the phone is working it out (the card shows "…" rather than a guess), `text` when it has, neither
 * when there is nothing to ask (no translator on this device, or no tap) or the phone could not say: the card then keeps the word's own entry.
 */
export function useSentenceMeaning(tap: { text: string; start: number; word: string } | null, from: string, to: string): { text?: string; pending: boolean } {
  const [got, setGot] = useState<{ key: string; text: string | null } | null>(null);
  const key = tap ? `${from}>${to}|${tap.start}|${tap.word}|${tap.text}` : "";
  const canAsk = !!tap && from !== to && deviceKind() !== null;
  useEffect(() => {
    if (!tap || !canAsk) return;
    let live = true;
    void meaningInContext(tap.text, tap.start, tap.word, from, to).then((text) => { if (live) setGot({ key, text }); });
    return () => { live = false; };
    // The tap is read through `key`, which holds all of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, from, to, canAsk]);
  if (!canAsk) return { pending: false };
  if (got?.key !== key) return { pending: true };
  return got.text ? { text: got.text, pending: false } : { pending: false };
}
