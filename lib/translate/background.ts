import { cacheKey, getCached, setCached } from "./cache";
import { levelOrder } from "./queue";

/**
 * Translates the library on the phone, in the background, from the moment the reader picks the language they are learning.
 *
 * Books are done one level at a time (the reader's own level first, the shelves they like first), a piece of pages at a
 * time, and each finished level is kept (lib/translate/cache.ts) so the book opens at once. It waits for the phone's
 * translator to have the language (the reader is asked to download it while signing up), stops while the app is not on
 * screen, steps aside while a book is being translated for reading, and rests between pieces so the phone stays cool.
 * Nothing leaves the phone except the request for the English pages, which are public.
 */
const PIECE = 60;
const REST_MS = 1500;
const POLL_MS = 4000;
const GIVE_UP_MS = 15 * 60_000;

let running: string | null = null;
let foreground = 0;
export const progress = { done: 0, total: 0 };

/** The reader's own translation of a book is under way: the background work waits its turn. */
export function holdBackground(on: boolean): void { foreground = Math.max(0, foreground + (on ? 1 : -1)); }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

async function turn(live: () => boolean): Promise<boolean> {
  while (live() && (!visible() || foreground > 0)) await sleep(1000);
  return live();
}

const json = async <T,>(url: string): Promise<T | null> => {
  try { const r = await fetch(url); return r.ok ? ((await r.json()) as T) : null; } catch { return null; }
};

export function startBackground(lang: string, level: string | null | undefined, liked: readonly string[]): void {
  if (typeof window === "undefined" || !lang || lang === "en") return;
  const id = `${lang}|${level ?? ""}|${liked.join(",")}`;
  if (running === id) return;
  running = id;
  const live = () => running === id;
  void (async () => {
    try {
      const { deviceStatus, deviceTranslate, deviceKind } = await import("./device");
      if (!deviceKind()) return;
      // Wait for the language to be on the phone.
      const t0 = Date.now();
      for (;;) {
        if (!live()) return;
        const status = await deviceStatus("en", lang);
        if (status === "ready") break;
        if (status === "unsupported" || Date.now() - t0 > GIVE_UP_MS) return;
        await sleep(POLL_MS);
      }
      const queue = await json<{ books: string[] }>(`/api/translate-queue?cats=${encodeURIComponent(liked.join(","))}`);
      const books = queue?.books ?? [];
      const levels = levelOrder(level);
      progress.done = 0;
      progress.total = books.length * levels.length;
      for (const lv of levels) {
        for (const slug of books) {
          if (!(await turn(live))) return;
          const key = cacheKey(slug, lv, lang);
          progress.done += 1;
          if (await getCached(key)) continue;
          // A book translated ahead of time on a Mac needs nothing from the phone.
          const ahead = await json<{ pages: string[] }>(`/api/book-full?${new URLSearchParams({ slug, level: lv, lang })}`);
          if (ahead?.pages?.length) continue;
          const en = (await json<{ pages: string[] }>(`/api/book-en?${new URLSearchParams({ slug, level: lv })}`))?.pages ?? [];
          if (!en.length) continue;
          const out: string[] = [];
          for (let at = 0; at < en.length; at += PIECE) {
            if (!(await turn(live))) return;
            out.push(...(await deviceTranslate(en.slice(at, at + PIECE), "en", lang)));
            await sleep(REST_MS);
          }
          if (out.length === en.length) await setCached(key, { pages: out });
        }
      }
    } catch { /* it simply stops; a book opens by the usual way */ }
    finally { if (running === id) running = null; }
  })();
}

export function stopBackground(): void { running = null; }
