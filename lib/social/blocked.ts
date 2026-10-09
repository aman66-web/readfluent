import { storageKey } from "@/lib/brand";

/**
 * Readers this reader has blocked, by friend code, kept on this device: they no longer
 * appear on the league board or in the friend lists here (App Store 1.2).
 */
const KEY = storageKey("blocked");

export function readBlocked(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch { return new Set(); }
}

export function block(code: string): Set<string> {
  const next = readBlocked();
  if (code) next.add(code);
  try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch { /* private mode: it lasts this visit */ }
  return next;
}
