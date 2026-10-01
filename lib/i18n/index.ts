import { EN, type Catalog, type MessageId } from "./en";
import type { LanguageCode } from "@/lib/onboarding/languages";

/**
 * The app's own words in the reader's language. English is built in; every other
 * language is a catalog loaded the first time it is needed (a language nobody picked
 * costs nothing), and until it arrives English shows, so nothing is ever blank.
 *
 * No model translates anything at run time: the catalogs are written files
 * (lib/i18n/messages/<code>.ts), checked by tests/unit/i18n.test.ts.
 */
export { EN };
export type { Catalog, MessageId };

type Loader = () => Promise<{ default: Catalog }>;

/* Spelled out, not built from the code, so the bundler can see every file. */
const LOADERS: Record<Exclude<LanguageCode, "en">, Loader> = {
  zh: () => import("./messages/zh"),
  hi: () => import("./messages/hi"),
  es: () => import("./messages/es"),
  ar: () => import("./messages/ar"),
  fr: () => import("./messages/fr"),
  bn: () => import("./messages/bn"),
  pt: () => import("./messages/pt"),
  ru: () => import("./messages/ru"),
  ur: () => import("./messages/ur"),
  id: () => import("./messages/id"),
  de: () => import("./messages/de"),
  ja: () => import("./messages/ja"),
  tr: () => import("./messages/tr"),
  ko: () => import("./messages/ko"),
  vi: () => import("./messages/vi"),
  it: () => import("./messages/it"),
  pl: () => import("./messages/pl"),
  uk: () => import("./messages/uk"),
  nl: () => import("./messages/nl"),
};

const loaded = new Map<LanguageCode, Catalog>([["en", EN]]);
const pending = new Map<LanguageCode, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

/** A catalog already in memory, or null. */
export const catalogFor = (code: LanguageCode): Catalog | null => loaded.get(code) ?? null;

/** Fetches a language's catalog (once) and tells listeners when it lands. A failure leaves English showing. */
export function loadCatalog(code: LanguageCode): Promise<void> {
  if (loaded.has(code)) return Promise.resolve();
  const existing = pending.get(code);
  if (existing) return existing;
  const load = LOADERS[code as Exclude<LanguageCode, "en">];
  const p = load()
    .then((m) => {
      loaded.set(code, m.default);
      version += 1;
      listeners.forEach((l) => l());
    })
    .catch(() => { /* offline and never fetched: English stays */ })
    .finally(() => { pending.delete(code); });
  pending.set(code, p);
  return p;
}

export const subscribeCatalogs = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
export const catalogVersion = () => version;

/** One message with its `{values}` filled in. A missing message falls back to English, never to nothing. */
export function translate(catalog: Catalog | null, id: MessageId, vars?: Record<string, string | number>): string {
  const text = catalog?.[id] ?? EN[id];
  if (!vars) return text;
  return text.replace(/\{([a-zA-Z]+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** Languages written right to left. */
export const RTL_LANGUAGES: readonly LanguageCode[] = ["ar", "ur"];
export const isRtl = (code: LanguageCode) => RTL_LANGUAGES.includes(code);

/* ── numbers, lists, dates and names, in the reader's language ───────────── */

/** A language's name in a language ("español" in Spanish, "Spanish" in English). Falls back to the English name. */
export function languageName(code: LanguageCode, inLocale: LanguageCode): string {
  try {
    return new Intl.DisplayNames([inLocale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function formatList(items: readonly string[], locale: LanguageCode): string {
  try {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

export function formatDate(date: Date, locale: LanguageCode): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
  } catch {
    return date.toDateString();
  }
}
