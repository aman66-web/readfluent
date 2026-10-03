"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { SAVED_KEY, parseSaved, type Saved } from "@/lib/words/saved";
import { EMPTY_SRS, SRS_KEY, parseSrs, type Srs } from "./store";

const subSrs = subscribeTo(SRS_KEY);
const subSaved = subscribeTo(SAVED_KEY);
const server = () => "";

/** The flashcards' state from the device; it follows every answer. */
export function useSrs(): Srs {
  const raw = useSyncExternalStore(subSrs, () => readRaw(SRS_KEY), server);
  return useMemo(() => (raw ? parseSrs(raw) : EMPTY_SRS), [raw]);
}

/** The saved words from the device. */
export function useSaved(): Saved {
  const raw = useSyncExternalStore(subSaved, () => readRaw(SAVED_KEY), server);
  return useMemo(() => parseSaved(raw), [raw]);
}

const subNone = () => () => {};
/** False on the server and for the first client render, true after: what needs the device waits for it. */
export function useDeviceReady(): boolean {
  return useSyncExternalStore(subNone, () => true, () => false);
}

function subMinute(fn: () => void): () => void {
  const id = window.setInterval(fn, 30_000);
  document.addEventListener("visibilitychange", fn);
  return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", fn); };
}
/** The time, rounded up to the next minute (so a card made a moment ago is already due): 0 on the server and the first render, then the real one, refreshed while the screen is open. */
export function useNowMinute(): number {
  return useSyncExternalStore(subMinute, () => Math.ceil(Date.now() / 60_000) * 60_000, () => 0);
}
