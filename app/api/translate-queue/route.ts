import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/content/limits";
import { PREVIEW_BOOKS } from "@/lib/preview/catalog";
import { orderBooks } from "@/lib/translate/queue";

/**
 * Which books the phone should translate in the background, in the order to do them:
 * `GET /api/translate-queue?cats=romance,crime` → { books: slug[] }. The shelves the reader likes come first.
 */
export async function GET(req: Request) {
  const cats = (new URL(req.url).searchParams.get("cats") ?? "").split(",").filter((c) => CATEGORIES.some((x) => x.id === c));
  const books = orderBooks(PREVIEW_BOOKS.filter((b) => b.source === "file").map((b) => ({ slug: b.slug, category: b.category, pages: b.pageCount ?? 0 })), cats);
  return NextResponse.json({ books }, { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } });
}
