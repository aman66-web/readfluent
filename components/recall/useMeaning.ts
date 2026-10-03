"use client";

import { useEffect, useState } from "react";
import { deviceStatus, deviceTranslate } from "@/lib/translate/device";

/**
 * A meaning written in English, shown in the reader's own language when the phone's translator already has the pair
 * (lib/translate/device.ts; free, on the device, and it never starts a download by itself). Until then, or for an
 * English speaker, or when the phone cannot, the English stays: it is always right, just not always the easiest.
 */
export function useMeaning(english: string | undefined, speak: string): string | undefined {
  const [got, setGot] = useState<{ key: string; text: string } | null>(null);
  const key = `${speak}\u0000${english ?? ""}`;
  useEffect(() => {
    if (!english || !speak || speak === "en") return;
    let live = true;
    void (async () => {
      try {
        if ((await deviceStatus("en", speak)) !== "ready") return;
        const [text] = await deviceTranslate([english], "en", speak);
        if (live && text?.trim()) setGot({ key, text });
      } catch { /* the English stays */ }
    })();
    return () => { live = false; };
  }, [english, speak, key]);
  return got?.key === key ? got.text : english;
}
