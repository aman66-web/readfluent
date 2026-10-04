import { NextResponse } from "next/server";
import { levelBySlug } from "@/lib/content/limits";
import { findBook } from "@/lib/preview/catalog";
import { loadEnglish } from "@/lib/preview/books/load";

/**
 * The English pages of one level of a book, as plain text: `GET /api/book-en?slug=…&level=a1a2` → { pages: string[] }.
 * What the phone's translator works from when it translates a book in the background (lib/translate/background.ts).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const slug = q.get("slug") ?? "";
  const lv = levelBySlug(q.get("level") ?? "");
  const book = findBook(slug);
  if (!book || book.source !== "file" || !lv) return NextResponse.json({ pages: [] });
  const en = await loadEnglish(slug);
  return NextResponse.json({ pages: en?.levels[lv.id] ?? [] }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
