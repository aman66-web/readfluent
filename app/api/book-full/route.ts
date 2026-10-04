import { NextResponse } from "next/server";
import { levelBySlug } from "@/lib/content/limits";
import { isLanguage } from "@/lib/onboarding/languages";
import { findBook } from "@/lib/preview/catalog";
import { loadApple } from "@/lib/preview/books/load";

/**
 * A whole book in the language being learned, translated ahead of time (scripts/apple-translate), for one level:
 * `GET /api/book-full?slug=…&level=a1a2&lang=es` → { pages: string[], dict: { word: { en, use } } }. Works in any browser,
 * with nothing to download. `pages` is empty when the book has none in this language (the phone's own translator
 * is used then, components/reader/useTranslated.ts).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const slug = q.get("slug") ?? "";
  const lang = q.get("lang") ?? "";
  const lv = levelBySlug(q.get("level") ?? "");
  const book = findBook(slug);
  const none = () => NextResponse.json({ pages: [] }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  if (!book || book.source !== "file" || !lv || !isLanguage(lang) || lang === "en") return none();
  const tr = await loadApple(slug, lang);
  const pages = tr?.levels[lv.id];
  if (!tr || !pages?.length) return none();
  const dict = Object.fromEntries(Object.entries(tr.dict ?? {}).map(([w, en]) => [w, { en, use: "" }]));
  return NextResponse.json({ pages, dict }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
