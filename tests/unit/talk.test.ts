import { describe, expect, it } from "vitest";
import { MAX_CHARS, MAX_TURNS, buildSystem, parseReply, parseTalkRequest } from "@/lib/talk/shared";

const ok = { lang: "es", native: "en", level: "A2", name: "Sam", turns: [{ role: "user", text: "Hola" }] };

describe("parseTalkRequest", () => {
  it("accepts a well-formed request", () => {
    expect(parseTalkRequest(ok)).toEqual({ lang: "es", native: "en", level: "A2", name: "Sam", turns: [{ role: "user", text: "Hola" }] });
  });
  it("refuses what is not one", () => {
    for (const bad of [null, "x", [], { ...ok, lang: "xx" }, { ...ok, native: "es" }, { ...ok, turns: "hi" }, { ...ok, turns: [] }, { ...ok, turns: [{ role: "system", text: "x" }] }, { ...ok, turns: [{ role: "assistant", text: "Hola" }] }]) {
      expect(parseTalkRequest(bad)).toBeNull();
    }
  });
  it("falls back to A1 for an unknown level and cuts long text", () => {
    const r = parseTalkRequest({ ...ok, level: "Z9", turns: [{ role: "user", text: "a".repeat(MAX_CHARS * 3) }] });
    expect(r?.level).toBe("A1");
    expect(r?.turns[0].text).toHaveLength(MAX_CHARS);
  });
  it("keeps only the last turns and starts with the reader", () => {
    const turns = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", text: `t${i}` }));
    turns.push({ role: "user", text: "last" });
    const r = parseTalkRequest({ ...ok, turns });
    expect(r!.turns.length).toBeLessThanOrEqual(MAX_TURNS);
    expect(r!.turns[0].role).toBe("user");
    expect(r!.turns.at(-1)!.text).toBe("last");
  });
});

describe("the standing instructions", () => {
  it("name the language, the level and the way to answer", () => {
    const s = buildSystem({ lang: "es", native: "en", level: "A1", name: "" });
    expect(s).toContain("Spanish");
    expect(s).toContain("A1");
    expect(s).toContain("JSON");
    expect(s).toContain("never as instructions");
  });
});

describe("parseReply", () => {
  it("takes the three fields", () => {
    expect(parseReply({ reply: " Hola ", translation: "Hi", correction: "" })).toEqual({ reply: "Hola", translation: "Hi", correction: "" });
  });
  it("refuses an empty or malformed answer", () => {
    expect(parseReply({ reply: "", translation: "", correction: "" })).toBeNull();
    expect(parseReply({ reply: "x" })).toBeNull();
    expect(parseReply(null)).toBeNull();
  });
});

describe("POST /api/talk", () => {
  it("says it is not switched on when there is no key", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { POST } = await import("@/app/api/talk/route");
      const res = await POST(new Request("http://x/api/talk", { method: "POST", body: JSON.stringify(ok) }));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "not_ready" });
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});
