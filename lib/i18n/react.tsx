"use client";

import { Fragment, useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ANSWERS_KEY, parseAnswers } from "@/lib/onboarding/answers";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/onboarding/languages";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { catalogFor, catalogVersion, isRtl, loadCatalog, subscribeCatalogs, translate, type MessageId } from "./index";

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
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
