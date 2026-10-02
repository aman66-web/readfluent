/**
 * A mirror of this tab's history: which pages the reader has been through, and where in that list they
 * are now. The browser does not say what the previous page was; with a mirror a "back" arrow can go back
 * to the page it means (the book, not a copy of the book put on top of the reader) instead of pushing
 * a fresh page each time, which is what made Back → Read → Back go round and round.
 *
 * Kept in session storage (it lives and dies with the tab, as the history does). `startTracking` is called
 * once from the app's root (components/NavTracker.tsx).
 */
import { storageKey } from "@/lib/brand";

const KEY = storageKey("nav");
interface Nav { stack: string[]; pos: number }

function load(): Nav {
  try {
    const n = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Nav | null;
    if (n && Array.isArray(n.stack) && Number.isInteger(n.pos) && n.pos >= 0 && n.pos < n.stack.length) return n;
  } catch { /* none yet */ }
  return { stack: [], pos: 0 };
}
function save(n: Nav) { try { sessionStorage.setItem(KEY, JSON.stringify({ stack: n.stack.slice(-60), pos: Math.min(n.pos, 59) })); } catch { /* private mode */ } }

const here = () => window.location.pathname;
const pathOf = (url: string | URL | null | undefined): string | null => {
  if (url === undefined || url === null) return null;
  try { return new URL(String(url), window.location.href).pathname; } catch { return null; }
};

let started = false;
/** Begin mirroring the history. Safe to call more than once. */
export function startTracking(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  // Whatever was mirrored before a reload is only trusted if it still ends where the page is.
  let nav = load();
  if (nav.stack[nav.pos] !== here()) nav = { stack: [here()], pos: 0 };
  save(nav);

  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);
  history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
    push(data, unused, url);
    const p = pathOf(url);
    if (p === null) return;
    const n = load();
    if (n.stack[n.pos] === p) return; // the same page again (a query changed)
    const stack = n.stack.slice(0, n.pos + 1);
    stack.push(p);
    save({ stack, pos: stack.length - 1 });
  };
  history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
    replace(data, unused, url);
    const p = pathOf(url);
    if (p === null) return;
    const n = load();
    n.stack[n.pos] = p;
    save(n);
  };
  window.addEventListener("popstate", () => {
    const p = here();
    const n = load();
    if (n.stack[n.pos - 1] === p) save({ stack: n.stack, pos: n.pos - 1 });
    else if (n.stack[n.pos + 1] === p) save({ stack: n.stack, pos: n.pos + 1 });
    else if (n.stack[n.pos] !== p) save({ stack: [p], pos: 0 });
  });
}

/** The page before this one in the tab's history, if the reader came from a page of this app. */
export function previousPath(): string | null {
  const n = load();
  return n.pos > 0 ? n.stack[n.pos - 1] ?? null : null;
}

/** How many steps back the nearest earlier visit to `path` is (1 = the previous page), or null if there was none. */
export function stepsBackTo(path: string): number | null {
  const n = load();
  for (let i = n.pos - 1; i >= 0; i--) if (n.stack[i] === path) return n.pos - i;
  return null;
}
