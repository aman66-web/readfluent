/**
 * A machine translator for the text of a book and the meaning of its words: Google Cloud Translation
 * (Basic, v2), called from the server only, with the key in `GOOGLE_TRANSLATE_API_KEY`. It is a direct
 * translator, not a language model, and the app calls it only when a reader opens a book in the language
 * they are learning (app/api/translate): the answer is kept by the CDN, so each version is translated once.
 * Without the key nothing is translated and the reader says so.
 */
import type { LanguageCode } from "@/lib/onboarding/languages";

/** `TRANSLATE_ENDPOINT` points the translator at a stand-in service when the app is tried without a key. */
const endpoint = (): string => process.env.TRANSLATE_ENDPOINT || "https://translation.googleapis.com/language/translate/v2";
/** The service takes at most 128 strings, and about 30,000 characters, in one request. */
const MAX_STRINGS = 100;
const MAX_CHARS = 18_000;
const PARALLEL = 6;

/** Our language codes where Google's differ. */
const GOOGLE_CODE: Partial<Record<LanguageCode, string>> = { zh: "zh-CN" };
export const googleCode = (code: LanguageCode): string => GOOGLE_CODE[code] ?? code;

export const translatorConfigured = (env: Record<string, string | undefined> = process.env): boolean => !!env.GOOGLE_TRANSLATE_API_KEY?.trim();

/** Splits strings into requests the service accepts, keeping their order: [index of first string, strings]. */
export function chunk(texts: readonly string[]): { from: number; texts: string[] }[] {
  const out: { from: number; texts: string[] }[] = [];
  let cur: string[] = [];
  let chars = 0;
  let from = 0;
  texts.forEach((t, i) => {
    if (cur.length && (cur.length >= MAX_STRINGS || chars + t.length > MAX_CHARS)) { out.push({ from, texts: cur }); cur = []; chars = 0; from = i; }
    if (!cur.length) from = i;
    cur.push(t);
    chars += t.length;
  });
  if (cur.length) out.push({ from, texts: cur });
  return out;
}

const decode = (s: string): string =>
  s.replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

type Fetch = typeof fetch;

/** Translates `texts`, one answer for each, in order. Throws if the service refuses. */
export async function translateTexts(texts: readonly string[], from: LanguageCode, to: LanguageCode, opts: { key?: string; fetcher?: Fetch } = {}): Promise<string[]> {
  const key = (opts.key ?? process.env.GOOGLE_TRANSLATE_API_KEY ?? "").trim();
  if (!key) throw new Error("translator off");
  const doFetch = opts.fetcher ?? fetch;
  const result: string[] = new Array(texts.length);
  const jobs = chunk(texts);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const job = jobs[next++];
      if (!job) return;
      const res = await doFetch(`${endpoint()}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: job.texts, source: googleCode(from), target: googleCode(to), format: "text" }),
      });
      if (!res.ok) throw new Error(`translator ${res.status}`);
      const body = (await res.json()) as { data?: { translations?: { translatedText: string }[] } };
      const got = body.data?.translations;
      if (!got || got.length !== job.texts.length) throw new Error("translator answered wrongly");
      got.forEach((g, k) => { result[job.from + k] = decode(g.translatedText); });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, jobs.length) }, worker));
  return result;
}
