import type { LanguageCode } from "@/lib/onboarding/languages";

/**
 * The one-line summaries of a book's moments (the path on its page), in a language. English is
 * what the server sends with the page; another language is a small file of its own, fetched only
 * for the reader who speaks it. `null` where there is none yet (English shows).
 */
const SLUG = /^[a-z0-9-]+$/;

export async function loadOutline(slug: string, lang: LanguageCode): Promise<string[] | null> {
  if (lang === "en" || !SLUG.test(slug) || !/^[a-z]{2}$/.test(lang)) return null;
  try {
    const mod = (await import(`./books/${slug}/outline.${lang}.json`)) as { default: unknown };
    const list = mod.default;
    return Array.isArray(list) && list.every((x) => typeof x === "string") ? (list as string[]) : null;
  } catch {
    return null;
  }
}
