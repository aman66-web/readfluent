import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** XP and level belong to the language being learned: switching keeps each one and brings it back. */
describe("the XP ledger per learning language", () => {
  const data = new Map<string, string>();
  beforeEach(() => {
    vi.resetModules();
    data.clear();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }, addEventListener() {}, removeEventListener() {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps Spanish XP when French is chosen, and gives it back", async () => {
    const m = await import("@/lib/xp/ledger");
    m.awardPage("persuasion/A1A2-200", 1, "A");
    const spanish = m.currentXp();
    expect(spanish).toBeGreaterThan(0);
    m.switchLanguageLedger("es", "fr");
    expect(m.currentXp()).toBe(0);
    m.switchLanguageLedger("fr", "es");
    expect(m.currentXp()).toBe(spanish);
  });

  it("moves nothing when nothing was earned, or the language is the same", async () => {
    const m = await import("@/lib/xp/ledger");
    m.startAt("B1");
    const start = m.currentXp();
    m.switchLanguageLedger("es", "fr");
    expect(m.currentXp()).toBe(start);
    m.switchLanguageLedger("fr", "fr");
    expect(m.currentXp()).toBe(start);
  });
});
