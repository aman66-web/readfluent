import { NextResponse } from "next/server";
import { levelBySlug } from "@/lib/content/limits";
import { isLanguage } from "@/lib/onboarding/languages";
import { findBook } from "@/lib/preview/catalog";
import { loadStart } from "@/lib/preview/books/load";

/**
 * The first chapter of a book in the language being learned, translated ahead of time (by hand, with Claude), for
 * one level: `GET /api/book-start?slug=…&level=a1a2&lang=es` → { pages: [{ text, keys }], dict }. The phone's own
 * translator does the rest of the book (components/reader/useTranslated.ts). `pages` is empty when there is none.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const slug = q.get("slug") ?? "";
  const lang = q.get("lang") ?? "";
  const lv = levelBySlug(q.get("level") ?? "");
  const book = findBook(slug);
  if (!book || book.source !== "file" || !lv || !isLanguage(lang) || lang === "en") return NextResponse.json({}, { status: 404 });
  const start = await loadStart(slug, lang);
  const pages = start?.levels[lv.id];
  // None for this book and language is the usual answer, not an error: an empty list (a 404 would be logged by every browser).
  if (!start || !pages?.length) return NextResponse.json({ pages: [] }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  return NextResponse.json({ pages, dict: start.dict ?? {} }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
