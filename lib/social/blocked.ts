import { useMemo, useSyncExternalStore } from "react";
import { storageKey } from "@/lib/brand";
import { readRaw, subscribeTo, writeRaw } from "@/lib/store/local";

/**
 * Readers this reader has blocked, by friend code, kept on this device: they no longer
 * appear on the league board or in the friend lists here (App Store 1.2).
 */
const KEY = storageKey("blocked");
const subscribe = subscribeTo(KEY);

function parse(raw: string): Set<string> {
  try {
    const v = JSON.parse(raw || "[]") as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch { return new Set(); }
}

export function block(code: string): void {
  if (!code) return;
  const next = parse(readRaw(KEY));
  next.add(code);
  writeRaw(KEY, JSON.stringify([...next]));
}

/** The blocked codes, kept in step with every screen that blocks someone. */
export function useBlocked(): Set<string> {
  const raw = useSyncExternalStore(subscribe, () => readRaw(KEY), () => "");
  return useMemo(() => parse(raw), [raw]);
}
