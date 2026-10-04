import { NextResponse } from "next/server";
import { loadDeck } from "@/lib/decks";
import { loadTopics } from "@/lib/decks/topics";
import { itemsFor, type Item } from "@/lib/tests/build";
import { buildLevelTest, hasPassages } from "@/lib/tests/level/build";
import { levelPairs } from "@/lib/tests/level/pool";
import { TESTS_PER_LEVEL, isTestNumber, type LevelPassage } from "@/lib/tests/level/types";
import { CEFR, isCefr, type Cefr } from "@/lib/xp/levels";

/**
 * One level test: `GET /api/level-test?lang=fr&level=B1&n=3`. Test `n` of a level is always the same test, made from the
 * level's ten reading passages (lib/tests/reading) and the language's vocabulary (lib/tests/level/build.ts): no model is
 * called, so the answers can be cached by the CDN. `GET /api/level-test?lang=fr` says which levels the language has.
 */
type Source = { levels: Record<string, { title: string; text: string; keys: string[]; qs?: LevelPassage["qs"]; write?: LevelPassage["write"] }[]> };

async function source(lang: string): Promise<Source | null> {
  try { return (await import(`@/lib/tests/reading/${lang}.json`)).default as Source; } catch { return null; }
}

async function passagesFor(lang: string, level: Cefr): Promise<LevelPassage[] | null> {
  const en = await source("en");
  const own = lang === "en" ? en : await source(lang);
  const base = en?.levels[level];
  const mine = own?.levels[level];
  if (!base || !mine || mine.length < TESTS_PER_LEVEL || base.length < TESTS_PER_LEVEL) return null;
  const out = mine.slice(0, TESTS_PER_LEVEL).map((m, i): LevelPassage => ({ title: m.title, text: m.text, keys: m.keys, qs: base[i].qs ?? [], write: base[i].write ?? { prompt: "", min: 6 } }));
  return hasPassages(out) ? out : null;
}

async function bank(lang: string): Promise<Item[]> {
  try {
    if (lang === "es") return (await import("@/lib/tests/corpus.es.json")).default as Item[];
    if (lang === "en") return (await import("@/lib/tests/corpus.en.json")).default as Item[];
  } catch { /* none */ }
  return [];
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lang = q.get("lang") ?? "";
  if (!/^[a-z]{2}$/.test(lang)) return NextResponse.json({ error: "no such test" }, { status: 404 });
  const level = q.get("level");
  const n = Number(q.get("n"));
  const cache = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

  if (!level) {
    const levels: Cefr[] = [];
    for (const l of CEFR) if (await passagesFor(lang, l)) levels.push(l);
    return NextResponse.json({ levels }, { headers: cache });
  }
  if (!isCefr(level) || !isTestNumber(n)) return NextResponse.json({ error: "no such test" }, { status: 404 });
  const passages = await passagesFor(lang, level);
  if (!passages) return NextResponse.json({ error: "not ready" }, { status: 404 });

  let pairs: [string, string][] = [];
  const items = await bank(lang);
  if (items.length) pairs = [...new Map(itemsFor(items, level).flatMap((i) => i.k ?? []).map((p) => [p[0].toLowerCase(), p])).values()];
  else pairs = levelPairs(level, await loadDeck(lang), await loadTopics(lang));

  const test = buildLevelTest({ lang, level, n, passages, pairs });
  if (!test) return NextResponse.json({ error: "not ready" }, { status: 404 });
  return NextResponse.json({ test }, { headers: cache });
}
