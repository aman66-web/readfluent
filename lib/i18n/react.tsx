"use client";

import { Fragment, useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ANSWERS_KEY, parseAnswers } from "@/lib/onboarding/answers";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/onboarding/languages";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { bookMetaFor, bookMetaVersion, loadBookMeta, subscribeBookMeta } from "./book-meta";
import { EN, catalogFor, catalogVersion, isRtl, loadCatalog, subscribeCatalogs, translate, type MessageId } from "./index";

// Start fetching the saved language's words as soon as this script runs, not after the page has hydrated.
if (typeof window !== "undefined") {
  try {
    const saved = parseAnswers(readRaw(ANSWERS_KEY)).language;
    if (saved !== DEFAULT_LANGUAGE) void loadCatalog(saved);
  } catch { /* storage blocked: English */ }
}

const subscribeAnswers = subscribeTo(ANSWERS_KEY);
const readAnswersRaw = () => readRaw(ANSWERS_KEY);
// The server has no device storage: "" is what the first client render shows too.
const serverRaw = () => "";

/** The language the reader speaks: the app's language. English until they choose. */
export function useLocale(): LanguageCode {
  const raw = useSyncExternalStore(subscribeAnswers, readAnswersRaw, serverRaw);
  return useMemo(() => (raw ? parseAnswers(raw).language : DEFAULT_LANGUAGE), [raw]);
}

export type T = (id: MessageId, vars?: Record<string, string | number>) => string;

/** `t("hello.line", { app })` in the reader's language, re-rendering when their language changes. */
export function useT(): T {
  const locale = useLocale();
  // A new catalog arriving re-renders every component that reads it.
  useSyncExternalStore(subscribeCatalogs, catalogVersion, () => 0);
  useEffect(() => { void loadCatalog(locale); }, [locale]);
  const catalog = catalogFor(locale);
  return useCallback<T>((id, vars) => translate(catalog, id, vars), [catalog]);
}

/**
 * A book's title or description in the reader's language: `book.<slug>.title` / `.blurb` in the catalogs.
 * A book with no entry (not yet translated) shows the `fallback`, its own words.
 */
export function useBookText() {
  const locale = useLocale();
  useSyncExternalStore(subscribeCatalogs, catalogVersion, () => 0);
  useSyncExternalStore(subscribeBookMeta, bookMetaVersion, () => 0);
  useEffect(() => { void loadCatalog(locale); void loadBookMeta(locale); }, [locale]);
  const catalog = catalogFor(locale) as Record<string, string> | null;
  const meta = bookMetaFor(locale);
  return useCallback((slug: string, field: "title" | "blurb", fallback: string): string => {
    const id = `book.${slug}.${field}`;
    // The hand-made translations first, then the machine-made ones for every other book, then English.
    return catalog?.[id] ?? meta?.[slug]?.[field === "title" ? "t" : "b"] ?? (EN as Record<string, string>)[id] ?? fallback;
  }, [catalog, meta]);
}

/**
 * The language a book's title or description is actually in: the reader's own where a translation exists,
 * else English (the fallback). For the `lang` attribute, so a screen reader does not read English in, say, Japanese.
 */
export function useBookLang() {
  const locale = useLocale();
  useSyncExternalStore(subscribeCatalogs, catalogVersion, () => 0);
  useSyncExternalStore(subscribeBookMeta, bookMetaVersion, () => 0);
  const catalog = catalogFor(locale) as Record<string, string> | null;
  const meta = bookMetaFor(locale);
  return useCallback((slug: string, field: "title" | "blurb"): string => {
    if (catalog?.[`book.${slug}.${field}`] !== undefined || meta?.[slug]?.[field === "title" ? "t" : "b"] !== undefined) return locale;
    return "en";
  }, [catalog, meta, locale]);
}

/** A book's chapter names in the reader's language (the English ones until they arrive). */
export function useChapterNames(slug: string, english: readonly string[] | undefined): readonly string[] | undefined {
  const locale = useLocale();
  useSyncExternalStore(subscribeBookMeta, bookMetaVersion, () => 0);
  useEffect(() => { void loadBookMeta(locale); }, [locale]);
  const names = bookMetaFor(locale)?.[slug]?.c;
  return english && names && names.length === english.length ? names : english;
}

/**
 * A message with one link in it: "…our <link>Privacy Policy</link>." The words and
 * their order are the translator's; `wrap` makes the linked part.
 */
export function useRich() {
  const t = useT();
  return useCallback((id: MessageId, wrap: (text: string) => ReactNode): ReactNode => {
    const m = /^([\s\S]*?)<link>([\s\S]*?)<\/link>([\s\S]*)$/.exec(t(id));
    if (!m) return t(id);
    return <Fragment>{m[1]}{wrap(m[2])}{m[3]}</Fragment>;
  }, [t]);
}

/**
 * Keeps the page's `lang` and `dir` in step with the reader's language, so screen
 * readers pronounce it and Arabic and Urdu read right to left. Renders nothing.
 */
export function LocaleSync() {
  const locale = useLocale();
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = isRtl(locale) ? "rtl" : "ltr";
    // The page was hidden until this language's words arrived (see EARLY_LOCALE in app/layout.tsx): show it now.
    if (root.hasAttribute("data-i18n-pending")) {
      const show = () => requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-i18n-pending")));
      void loadCatalog(locale).then(show, show);
    }
  }, [locale]);
  return null;
}
