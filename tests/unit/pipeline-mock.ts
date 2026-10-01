import type { LlmRequest } from "../../scripts/pipeline/llm";

/** A pretend model for the pipeline tests: it answers every request with text that obeys the rules, so the whole run can be checked with no network. */
const NOUNS: [string, string][] = [["house", "casa"], ["river", "río"], ["garden", "jardín"], ["bridge", "puente"], ["market", "mercado"], ["window", "ventana"], ["mountain", "montaña"], ["letter", "carta"]];
const name = (i: number) => `Q${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + (Math.floor(i / 26) % 26))}${String.fromCharCode(97 + (Math.floor(i / 676) % 26))}`;

export const SLOT_INDEX: Record<string, number> = { p50: 0, c1: 1, c2: 2, x1: 3, x2: 4 };

function sentence(level: "A" | "B" | "C", i: number, k: number): { en: string; es: string; keys: { es: string; en: string }[] } {
  const n = [NOUNS[(i + k) % 8], NOUNS[(i + k + 3) % 8], NOUNS[(i + k + 5) % 8]];
  const who = name(i * 3 + k);
  if (level === "A") return { en: `${who} saw the ${n[0][0]}, the ${n[1][0]} and the ${n[2][0]} on the road.`, es: `${who} vio la ${n[0][1]}, el ${n[1][1]} y el ${n[2][1]} en el camino.`, keys: n.map((x) => ({ es: x[1], en: x[0] })) };
  if (level === "B") return {
    en: `${who} looked at the ${n[0][0]}, the ${n[1][0]} and the ${n[2][0]} while the people of the town waited quietly in the street.`,
    es: `${who} miró la ${n[0][1]}, el ${n[1][1]} y el ${n[2][1]} mientras la gente del pueblo esperaba en silencio en la calle.`, keys: n.map((x) => ({ es: x[1], en: x[0] })),
  };
  return {
    en: `${who} reluctantly considered the meticulous plans for the ${n[0][0]}, the ${n[1][0]} and the ${n[2][0]}, while a melancholy silence settled over the valley and the ancient road beyond.`,
    es: `${who} consideró a regañadientes los meticulosos planes para la ${n[0][1]}, el ${n[1][1]} y el ${n[2][1]}, mientras un silencio melancólico se asentaba sobre el valle y el antiguo camino más allá.`,
    keys: n.map((x) => ({ es: x[1], en: x[0] })),
  };
}

export function goodPage(level: "A" | "B" | "C", beat: number, slot: "p50" | "c1" | "c2" | "x1" | "x2") {
  const count = level === "A" ? 1 : level === "B" ? 2 : 3;
  const seed = beat * 5 + SLOT_INDEX[slot];
  const parts = Array.from({ length: count }, (_, k) => sentence(level, seed, k));
  // The three key pairs come from the first sentence (they must sit in the same sentence in both texts).
  return { beat, slot, en: parts.map((p) => p.en).join(" "), es: parts.map((p) => p.es).join(" "), keys: parts[0].keys };
}

export interface MockOptions { badOnce?: (r: LlmRequest) => boolean; originalityRewrite?: boolean }

export function mockModel(opts: MockOptions = {}) {
  const spoiled = new Set<string>();
  return (r: LlmRequest): unknown => {
    if (r.stage === "beats") {
      return {
        public_domain: { status: "certain", reason: "test" }, title_es: "Un libro de prueba", blurb_en: "A test book.", blurb_es: "Un libro de prueba.",
        bible: "Names and places for the test. ".repeat(12),
        beats: Array.from({ length: 50 }, (_, i) => ({ n: i + 1, summary: `Beat ${i + 1} happens.`, details: `Details of beat ${i + 1}.` })),
      };
    }
    if (r.stage === "pages") {
      const m = /beats (\d+) to (\d+) at level (A1–A2|B1–B2|C1–C2)/.exec(r.user)!;
      const level = m[3][0] as "A" | "B" | "C";
      const pages = [];
      for (let b = Number(m[1]); b <= Number(m[2]); b++) for (const s of ["p50", "c1", "x1", "c2", "x2"] as const) pages.push(goodPage(level, b, s));
      if (opts.badOnce?.(r) && !spoiled.has(r.id)) { spoiled.add(r.id); pages[1] = { ...pages[1], en: `${pages[1].en} And one more sentence here.` }; }
      return { pages };
    }
    if (r.stage === "fix") {
      const level = /level (A1–A2|B1–B2|C1–C2)/.exec(r.user)![1][0] as "A" | "B" | "C";
      const pages = [...r.user.matchAll(/beat (\d+), slot (p50|c1|c2|x1|x2)\n/g)].map((m) => goodPage(level, Number(m[1]), m[2] as "p50" | "c1" | "c2" | "x1" | "x2"));
      return { pages };
    }
    if (r.stage === "dictionary") {
      return { entries: [...r.user.matchAll(/^word: (.+)$/gm)].map((m) => ({ word: m[1], ph: "ah-BEE-ah", pos: "noun · m.", mean: "a thing — used every day", root: `${m[1]} — a thing` })) };
    }
    if (r.stage === "originality") return opts.originalityRewrite && !spoiled.has(r.id.replace(/\d+$/, "")) && (spoiled.add(r.id.replace(/\d+$/, "")), true) && /text/.test(r.user)
      ? { verdict: "rewrite", findings: [{ beats: [3], kind: "plot", severity: "high", detail: "the same opening scene" }] }
      : { verdict: "pass", findings: [] };
    throw new Error(`mock has no answer for ${r.stage}`);
  };
}
