import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Every book's title, blurb and chapter names in one language: { slug: { t, b, c[] } }. Written offline by
 * scripts/books/translate-meta.py (a free, open-source translator that runs on a laptop), so reading costs
 * nothing and calls no service. One file per language, loaded only when somebody asks for that language.
 */
type Meta = Record<string, { t: string; b: string; c: string[] }>;
const FILES: Record<string, () => Promise<{ default: Meta }>> = {
  zh: () => import("@/lib/preview/books-i18n/zh.json"),
  hi: () => import("@/lib/preview/books-i18n/hi.json"),
  es: () => import("@/lib/preview/books-i18n/es.json"),
  ar: () => import("@/lib/preview/books-i18n/ar.json"),
  fr: () => import("@/lib/preview/books-i18n/fr.json"),
  bn: () => import("@/lib/preview/books-i18n/bn.json"),
  pt: () => import("@/lib/preview/books-i18n/pt.json"),
  ru: () => import("@/lib/preview/books-i18n/ru.json"),
  ur: () => import("@/lib/preview/books-i18n/ur.json"),
  id: () => import("@/lib/preview/books-i18n/id.json"),
  de: () => import("@/lib/preview/books-i18n/de.json"),
  ja: () => import("@/lib/preview/books-i18n/ja.json"),
  tr: () => import("@/lib/preview/books-i18n/tr.json"),
  ko: () => import("@/lib/preview/books-i18n/ko.json"),
  vi: () => import("@/lib/preview/books-i18n/vi.json"),
  it: () => import("@/lib/preview/books-i18n/it.json"),
  pl: () => import("@/lib/preview/books-i18n/pl.json"),
  uk: () => import("@/lib/preview/books-i18n/uk.json"),
  nl: () => import("@/lib/preview/books-i18n/nl.json"),
};

export async function GET(req: Request) {
  const lang = new URL(req.url).searchParams.get("lang") ?? "";
  const load = Object.hasOwn(FILES, lang) ? FILES[lang] : null;
  if (!load) return NextResponse.json({}, { status: 404 });
  const { default: meta } = await load();
  return NextResponse.json(meta, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
