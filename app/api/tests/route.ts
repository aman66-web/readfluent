import { NextResponse } from "next/server";
import { CEFR, isCefr } from "@/lib/xp/levels";
import { makePaper, type Item, type Phrase } from "@/lib/tests/build";
import { supportFor } from "@/lib/tests/support";
import { isTestKind } from "@/lib/tests/types";

/**
 * One test paper: `GET /api/tests?lang=es&level=B1&kind=mixed&seed=123`. Made from the sentence banks
 * (lib/tests/corpus.<lang>.json) or the language's phrase deck, by lib/tests/build.ts: no model is called.
 * The answers go with the questions: the test is practice, and the XP it pays is the reader's own ledger.
 */
export const dynamic = "force-dynamic";

async function bank(lang: string): Promise<Item[]> {
  try {
    if (lang === "es") return (await import("@/lib/tests/corpus.es.json")).default as Item[];
    if (lang === "en") return (await import("@/lib/tests/corpus.en.json")).default as Item[];
  } catch { /* none */ }
  return [];
}

async function deck(lang: string): Promise<Phrase[]> {
  try {
    const raw = (await import(`@/lib/decks/data/${lang}.json`)).default as { phrases?: { t: string; en: string }[] };
    return (raw.phrases ?? []).map((p) => ({ t: p.t, en: p.en }));
  } catch { return []; }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lang = q.get("lang") ?? "";
  const level = q.get("level") ?? "";
  const kind = q.get("kind") ?? "";
  const seed = Number(q.get("seed")) || Date.now();
  const support = supportFor(lang);
  if (!support || !isCefr(level) || !isTestKind(kind) || !support.levels.includes(level) || !support.kinds.includes(kind)) {
    return NextResponse.json({ error: "no such test" }, { status: 404 });
  }
  const items = await bank(lang);
  const phrases = items.length ? undefined : await deck(lang);
  const paper = makePaper({ lang, level, kind, bank: items, phrases, seed });
  // Too few questions is no test: say so rather than hand out a paper of two.
  if (paper.questions.length < 5) return NextResponse.json({ error: "not enough material" }, { status: 404 });
  return NextResponse.json({ paper, levels: CEFR }, { headers: { "Cache-Control": "no-store" } });
}
