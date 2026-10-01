/**
 * The one way this app touches localStorage.
 *
 * Three stores share it — decks, card states and the session log — and each
 * needs the same four things: a stable snapshot for `useSyncExternalStore`, a
 * subscription that also hears other tabs, a guarded read and a guarded write.
 * Keeping them here means the three cannot drift apart in how they handle a
 * private window or a corrupt value.
 *
 * The snapshot is the raw string, never a parsed object: parsing on every call
 * would return a new reference each time and React would re-render forever.
 * "" means "the browser was read and has nothing"; null is reserved for the
 * server, where nothing has been read at all — the two lead to different
 * screens and collapsing them is what produces a hydration mismatch.
 */

const listeners = new Set<() => void>();

/** Same-tab writes have no `storage` event, so a write announces itself. */
export function notify(): void {
  for (const fn of [...listeners]) fn();
}

/** A subscribe function for one key. Create it once, at module level. */
export function subscribeTo(key: string): (fn: () => void) => () => void {
  return (fn) => {
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => {
      // `key === null` is "everything was cleared", which is also a change.
      if (e.key === null || e.key === key) fn();
    };
    if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  };
}

/**
 * What a private window could not keep. Writes that localStorage refuses land here,
 * so the rest of the session still agrees with itself (a page is paid once, a saved
 * word stays saved) even though nothing survives a reload.
 */
const memory = new Map<string, string>();

export function readRaw(key: string): string {
  if (typeof window === "undefined") return "";
  // A value storage refused is newer than whatever storage still holds.
  const kept = memory.get(key);
  if (kept !== undefined) return kept;
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** There is nothing stored on the server; the first client render fills it in. */
export const serverSnapshot = (): null => null;

export function writeRaw(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  let kept = true;
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    // Private mode, or the quota. Keep it for this session; tell the caller it will not last.
    memory.set(key, value);
    kept = false;
  }
  notify();
  return kept;
}

/**
 * A write nothing is told about.
 *
 * For bookkeeping only — a value no screen reads, written as a side effect of
 * something else. Sync's own high-water mark is the case it exists for: it is
 * written at the end of every round, and announcing it would wake the listener
 * that schedules the next round, which would schedule the next, for ever.
 *
 * Anything a screen renders must go through writeRaw instead, or it will sit
 * there stale until something unrelated happens to notify.
 */
export function writeQuiet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
    return false;
  }
  return true;
}

/** Parse a snapshot, or fall back — a corrupt value must never crash a screen. */
export function parseJson<T>(raw: string | null, fallback: T, ok: (v: unknown) => boolean): T {
  if (!raw) return fallback;
  try {
    const v: unknown = JSON.parse(raw);
    return ok(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function newId(prefix = ""): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return prefix + id;
}
