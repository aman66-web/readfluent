import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLevel, DISCLAIMERS } from "../../scripts/pipeline/assemble";
import { loadCatalogue, nicheSlug } from "../../scripts/pipeline/catalogue";
import { cefrIssues, namesOf } from "../../scripts/pipeline/cefr";
import { pagesSystem, SLOT_GUIDE } from "../../scripts/pipeline/prompts";
import { costOf, Ledger } from "../../scripts/pipeline/cost";
import { finalizeAll } from "../../scripts/pipeline/finalize";
import { MockExecutor } from "../../scripts/pipeline/llm";
import { stageBeats, stageBeatsOriginality, stageDictionary, stageFix, stageOriginality, stagePages, type Ctx } from "../../scripts/pipeline/stages";
import { sentences } from "../../scripts/pipeline/text";
import type { Page, UnitPage } from "../../scripts/pipeline/types";
import { containmentIssues, dictEntryIssues, pageIssues, versionIssues } from "../../scripts/pipeline/validate";
import { goodPage, mockModel, type MockOptions } from "./pipeline-mock";

const catalogue = loadCatalogue();

function setup(opts: MockOptions = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rf-pipeline-"));
  const exec = new MockExecutor(mockModel(opts));
  const paths = { content: join(dir, "content"), dictionary: join(dir, "dictionary"), reports: join(dir, "reports"), review: join(dir, "review"), work: join(dir, "work") };
  const ctx: Ctx = { exec, ledger: new Ledger(join(dir, "reports/cost.json"), 0), paths, log: () => {} };
  return { dir, exec, ctx };
}

async function runAll(ctx: Ctx, ids: string[]) {
  const books = ids.map((id) => catalogue.find((b) => b.id === id)!);
  await stageBeats(ctx, books); await stageBeatsOriginality(ctx, books);
  await stagePages(ctx, books); await stageFix(ctx, books);
  await stageDictionary(ctx, books); await stageOriginality(ctx, books);
  return { books, ...finalizeAll(ctx, books) };
}

describe("the catalogue", () => {
  it("is the 200 books, with the three pilot books in it", () => {
    expect(catalogue).toHaveLength(200);
    expect(new Set(catalogue.map((b) => b.id)).size).toBe(200);
    for (const id of ["pride-and-prejudice", "the-rival-at-desk-four", "one-small-step-a-day"]) expect(catalogue.some((b) => b.id === id), id).toBe(true);
    expect(nicheSlug("Self-help and personal development")).toBe("self-help-and-personal-development");
  });
});

describe("page checks", () => {
  const ok = goodPage("A", 1, "c1");
  it("accepts a page that follows the rules at each level", () => {
    for (const lv of ["A", "B", "C"] as const) expect(pageIssues(goodPage(lv, 4, "c2"), lv, "t"), lv).toEqual([]);
  });

  it("rejects the wrong number of sentences, and Spanish that does not match", () => {
    expect(pageIssues({ ...ok, en: `${ok.en} Another one here today.` }, "A", "t").map((i) => i.code)).toContain("en-sentences");
    expect(pageIssues({ ...ok, es: `${ok.es} Otra frase aquí hoy.` }, "A", "t").map((i) => i.code)).toContain("es-sentences");
  });

  it("rejects keys that are missing, not in the text, or in a different sentence", () => {
    expect(pageIssues({ ...ok, keys: ok.keys.slice(0, 2) }, "A", "t").map((i) => i.code)).toContain("keys-count");
    expect(pageIssues({ ...ok, keys: [{ es: "perro", en: ok.keys[0].en }, ...ok.keys.slice(1)] }, "A", "t").map((i) => i.code)).toContain("key-es-missing");
    expect(pageIssues({ ...ok, keys: [{ es: ok.keys[0].es, en: "dog" }, ...ok.keys.slice(1)] }, "A", "t").map((i) => i.code)).toContain("key-en-missing");
    const b = goodPage("B", 1, "c1");
    const second = { es: b.es.split(". ")[1].match(/\p{L}+/gu)!.find((w) => w === "gente")!, en: "people" };
    expect(pageIssues({ ...b, keys: [{ es: b.keys[0].es, en: b.keys[0].en }, b.keys[1], second] }, "B", "t").map((i) => i.code)).not.toContain("key-sentence");
    expect(pageIssues({ ...b, keys: [b.keys[0], b.keys[1], { es: b.keys[2].es, en: "town" }] }, "B", "t").length).toBeGreaterThanOrEqual(0);
  });

  it("rejects articles as key words, empty pages, markdown, abbreviations with a full stop, and Spain-only Spanish", () => {
    expect(pageIssues({ ...ok, keys: [{ es: "la", en: "the" }, ...ok.keys.slice(1)] }, "A", "t").map((i) => i.code)).toContain("key-es-stop");
    expect(pageIssues({ ...ok, en: "  " }, "A", "t").map((i) => i.code)).toContain("empty-en");
    expect(pageIssues({ ...ok, en: `**${ok.en}**` }, "A", "t").map((i) => i.code)).toContain("leftover");
    expect(pageIssues({ ...ok, en: "Mr. Qaa saw the house, the river and the garden." }, "A", "t").map((i) => i.code)).toContain("abbreviation");
    expect(pageIssues({ ...ok, es: ok.es.replace("vio", "vosotros vio") }, "A", "t").map((i) => i.code)).toContain("spain-spanish");
  });

  it("flags a hard C1–C2 sentence given as A1–A2, and a plain one given as C1–C2", () => {
    const hard = "The proprietor of the dilapidated establishment, notwithstanding considerable remonstrance, obstinately refused to relinquish the ancestral manuscripts.";
    expect(cefrIssues(hard, "A").map((i) => i.code)).toEqual(expect.arrayContaining(["too-hard-words", "too-hard-grade"]));
    expect(cefrIssues("The man went to the shop and bought some bread. It was a good day. He went home and ate his food.", "C").length).toBeGreaterThan(0);
    expect(cefrIssues("Anna saw the red house on the old road near the river.", "A")).toEqual([]);
  });

  it("does not mistake the Spanish word \"todo\" for a leftover TODO, or \"vale\" for Spain Spanish", () => {
    const es = ok.es.replace("en el camino", "sobre todo en el camino, y no vale la pena");
    expect(pageIssues({ ...ok, es }, "A", "t").map((i) => i.code)).not.toContain("leftover");
    expect(pageIssues({ ...ok, es }, "A", "t").map((i) => i.code)).not.toContain("spain-spanish");
    expect(pageIssues({ ...ok, en: `TODO ${ok.en}` }, "A", "t").map((i) => i.code)).toContain("leftover");
  });

  it("does not count a book's own names as rare words", () => {
    const en = "Hollis kept the old barometer on the wall by the door.";
    expect(cefrIssues(en, "A").map((i) => i.code)).toContain("too-hard-words");
    expect(cefrIssues(en, "A", namesOf("Hollis Marsh is the keeper of the Barometer")).map((i) => i.code)).not.toContain("too-hard-words");
  });

  it("counts a name's plural and possessive as the name", () => {
    expect(cefrIssues("The Bennets lived near Hollis's old house by the river.", "A", namesOf("Bennet Hollis")).map((i) => i.code)).not.toContain("too-hard-words");
  });

  it("reads a compound number as hard as its parts", () => {
    expect(cefrIssues("Maya is thirty-four and she drives a city bus every day.", "A").map((i) => i.code)).not.toContain("too-hard-words");
  });

  it("reads an inflected form of a common word as the common word", () => {
    expect(cefrIssues("Many gyms are full in January and much quieter by spring.", "A").map((i) => i.code)).not.toContain("too-hard-words");
    expect(cefrIssues("The proprietor refused to relinquish the manuscripts.", "A").map((i) => i.code)).toContain("too-hard-words");
  });

  it("tells every page writer what the five slots are for, and the level rules, in the system prompt", () => {
    const blocks = pagesSystem("B", "BOOK CONTEXT");
    expect(blocks.map((b) => b.text).join("\n")).toContain(SLOT_GUIDE);
    expect(blocks[1]).toEqual({ text: "BOOK CONTEXT", cache: true });
    expect(blocks[2].text).toContain("TWO sentences per page");
    expect(blocks[2].text).toContain("Latin American");
  });

  it("counts sentences the one way: titles have no full stop, quotes close inside the sentence", () => {
    expect(sentences("Mr Darcy said, “She is not pretty enough for me.” Anna laughed.")).toHaveLength(2);
    expect(sentences("Mr. Darcy left.")).toHaveLength(2);
  });
});

describe("versions", () => {
  const units = (level: "A" | "B" | "C"): UnitPage[] => Array.from({ length: 50 }, (_, i) => (["p50", "c1", "c2", "x1", "x2"] as const).map((s) => goodPage(level, i + 1, s))).flat();

  it("lays out 50, 100 and 200 pages, and the 200 holds every page of the 100", () => {
    const v = buildLevel(units("A"), "A", false);
    expect(v[50]).toHaveLength(50); expect(v[100]).toHaveLength(100); expect(v[200]).toHaveLength(200);
    expect(versionIssues(v[50], "A", 50)).toEqual([]);
    expect(versionIssues(v[100], "A", 100)).toEqual([]);
    expect(versionIssues(v[200], "A", 200)).toEqual([]);
    expect(containmentIssues(v[100], v[200])).toEqual([]);
    expect(v[200].filter((_, i) => i % 4 === 0).map((p) => p.en)).toEqual(v[100].filter((_, i) => i % 2 === 0).map((p) => p.en));
  });

  it("rejects a wrong page count, a duplicate page, a page out of order, and a 100 that is not inside the 200", () => {
    const v = buildLevel(units("A"), "A", false);
    expect(versionIssues(v[50].slice(1), "A", 50).map((i) => i.code)).toContain("page-count");
    const dup = v[100].map((p) => ({ ...p })); dup[5] = { ...dup[5], en: dup[4].en };
    expect(versionIssues(dup, "A", 100).map((i) => i.code)).toContain("duplicate");
    const shuffled = [...v[100]]; [shuffled[10], shuffled[40]] = [shuffled[40], shuffled[10]];
    expect(versionIssues(shuffled, "A", 100).map((i) => i.code)).toContain("beat-order");
    const odd = v[200].map((p) => ({ ...p })); odd[8] = { ...odd[8], en: "A different page that is not in the hundred." };
    expect(containmentIssues(v[100], odd).map((i) => i.code)).toContain("not-contained");
  });

  it("ends a health book with the notice at every level and length, and rejects one without it", () => {
    for (const lv of ["A", "B", "C"] as const) {
      const v = buildLevel(units(lv), lv, true);
      for (const len of [50, 100, 200] as const) {
        expect(v[len].at(-1)!.en).toBe(DISCLAIMERS[lv].en);
        expect(versionIssues(v[len], lv, len, { disclaimer: true }), `${lv} ${len}`).toEqual([]);
      }
      expect(containmentIssues(v[100], v[200])).toEqual([]);
    }
    const plain = buildLevel(units("A"), "A", false)[50];
    expect(versionIssues(plain, "A", 50, { disclaimer: true }).map((i) => i.code)).toContain("disclaimer");
  });
});

describe("word cards", () => {
  it("needs all four fields, and no Spain-style respelling", () => {
    expect(dictEntryIssues("oyó", undefined).map((i) => i.code)).toEqual(["dict-missing"]);
    expect(dictEntryIssues("oyó", { ph: "oh-YOH", pos: "verb · past", mean: "heard — said of hearing", root: "oír — to hear" })).toEqual([]);
    expect(dictEntryIssues("x", { ph: "", pos: "noun", mean: "m", root: "r" }).map((i) => i.code)).toContain("dict-field");
    expect(dictEntryIssues("admiración", { ph: "ahd-mee-rah-THYOHN", pos: "noun · f.", mean: "admiration", root: "admirar" }).map((i) => i.code)).toContain("dict-ph-spain");
  });
});

describe("cost", () => {
  it("prices tokens, and halves a batch", () => {
    const u = { input: 1_000_000, output: 1_000_000, cacheRead: 1_000_000, cacheWrite: 0 };
    expect(costOf(u)).toBeCloseTo(4 + 20 + 0.2, 6);
    expect(costOf(u, "claude-opus-5-5", true)).toBeCloseTo((4 + 20 + 0.2) / 2, 6);
  });
});

describe("the whole run, with a pretend model", () => {
  it("writes a book that passes every check, and a second run asks for nothing", async () => {
    const { ctx, exec, dir } = setup();
    const { reports } = await runAll(ctx, ["the-rival-at-desk-four"]);
    expect(reports[0].result, JSON.stringify(reports[0].hard.slice(0, 3))).toBe("pass");
    const base = join(dir, "content/romance/the-rival-at-desk-four");
    for (const f of ["meta.json", "beats.json", ...["A", "B", "C"].flatMap((l) => [50, 100, 200].map((n) => `${l}_${n}.json`))]) expect(existsSync(join(base, f)), f).toBe(true);
    const a200 = JSON.parse(readFileSync(join(base, "A_200.json"), "utf8")) as { pages: Page[] };
    expect(a200.pages).toHaveLength(200);
    expect(a200.pages[0]).toMatchObject({ n: 1, beat: 1 });
    const meta = JSON.parse(readFileSync(join(base, "meta.json"), "utf8"));
    expect(meta.credit).toBe("Inspired by The Hating Game. Not affiliated with or endorsed by the author.");
    expect(meta.disclaimers).toEqual([]);
    expect(Object.keys(JSON.parse(readFileSync(join(dir, "dictionary/es.json"), "utf8"))).length).toBeGreaterThan(5);
    expect(JSON.parse(readFileSync(join(dir, "review/A.json"), "utf8")).length).toBe(50);
    const first = exec.calls.length;
    await runAll(ctx, ["the-rival-at-desk-four"]);
    // Only the checks that always run (originality) may ask again; no beat, page or word card is rewritten.
    expect(exec.calls.slice(first).filter((c) => c.stage !== "originality")).toEqual([]);
  });

  it("rewrites a page that fails a check, and adds the health notice", async () => {
    const { ctx, exec } = setup({ badOnce: (r) => /\/A\/03$/.test(r.id) });
    const { reports } = await runAll(ctx, ["the-rival-at-desk-four"]);
    expect(exec.calls.some((c) => c.stage === "fix")).toBe(true);
    expect(reports[0].result).toBe("pass");
    const health = catalogue.find((b) => /^Health/.test(b.niche))!;
    const h = setup();
    const r2 = await runAll(h.ctx, [health.id]);
    expect(r2.reports[0].result, JSON.stringify(r2.reports[0].hard.slice(0, 3))).toBe("pass");
    const meta = JSON.parse(readFileSync(join(h.dir, `content/${nicheSlug(health.niche)}/${health.id}/meta.json`), "utf8"));
    expect(meta.disclaimers).toEqual(["not_medical_advice"]);
  });

  it("rewrites the beats the originality editor names", async () => {
    const { ctx, exec } = setup({ originalityRewrite: true });
    const { reports } = await runAll(ctx, ["one-small-step-a-day"]);
    expect(exec.calls.filter((c) => c.stage === "originality").length).toBeGreaterThanOrEqual(2);
    expect(exec.calls.some((c) => c.stage === "fix" && /too close to/.test(c.user))).toBe(true);
    expect(reports[0].result).toBe("pass");
  });

  it("stops at a classic whose public-domain status is not certain", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rf-pipeline-"));
    const base = mockModel();
    const exec = new MockExecutor((r) => (r.stage === "beats" ? { ...(base(r) as object), public_domain: { status: "unsure", reason: "translation may be in copyright" } } : base(r)));
    const ctx: Ctx = { exec, ledger: new Ledger(join(dir, "c.json"), 0), paths: { content: join(dir, "c"), dictionary: join(dir, "d"), reports: join(dir, "r"), review: join(dir, "v"), work: join(dir, "w") }, log: () => {} };
    const book = catalogue.find((b) => b.type === "classic")!;
    await stageBeats(ctx, [book]);
    await stagePages(ctx, [book]);
    expect(exec.calls.filter((c) => c.stage === "pages")).toEqual([]);
    expect(finalizeAll(ctx, [book]).reports[0]).toMatchObject({ result: "halted" });
  });

  it("stops before it spends past the budget", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rf-pipeline-"));
    const exec = new MockExecutor(mockModel());
    const ctx: Ctx = { exec, ledger: new Ledger(join(dir, "c.json"), 0.0001), paths: { content: join(dir, "c"), dictionary: join(dir, "d"), reports: join(dir, "r"), review: join(dir, "v"), work: join(dir, "w") }, log: () => {} };
    await expect(stageBeats(ctx, [catalogue.find((b) => b.id === "the-rival-at-desk-four")!])).rejects.toThrow(/budget/);
  });
});
