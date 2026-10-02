import { NextResponse } from "next/server";
import { LENGTHS, levelBySlug } from "@/lib/content/limits";
import { isLanguage } from "@/lib/onboarding/languages";
import { findBook, lengthsOf } from "@/lib/preview/catalog";
import { loadEnglish } from "@/lib/preview/books/load";
import { translatorConfigured } from "@/lib/translate/google";
import { buildVariant } from "@/lib/translate/version";

/**
 * One version of a book in the language being learned, translated by the machine translator
 * (lib/translate): `GET /api/translate?slug=…&level=a1a2&length=200&lang=es&speak=en`. No language model
 * is called. The answer never changes for the same address, so the CDN keeps it for good and each version
 * is paid for once. Only books in the library and the twenty app languages are accepted, which bounds the
 * number of different answers. Without `GOOGLE_TRANSLATE_API_KEY` it says the translator is off.
 */
export const maxDuration = 60;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const slug = q.get("slug") ?? "";
  const lang = q.get("lang") ?? "";
  const speak = q.get("speak") ?? "en";
  const book = findBook(slug);
  const lv = levelBySlug(q.get("level") ?? "");
  const len = LENGTHS.find((l) => String(l.pages) === q.get("length"));
  if (!book || book.source !== "file" || !lv || !len || !lengthsOf(book).includes(len.pages) || !isLanguage(lang) || lang === "en" || !isLanguage(speak)) {
    return NextResponse.json({ error: "no such version" }, { status: 404 });
  }
  if (!translatorConfigured()) return NextResponse.json({ error: "off" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const en = await loadEnglish(slug);
  if (!en) return NextResponse.json({ error: "no such version" }, { status: 404 });
  try {
    const variant = await buildVariant(en.levels[lv.id], lang, speak);
    return NextResponse.json({ variant }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" } });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
