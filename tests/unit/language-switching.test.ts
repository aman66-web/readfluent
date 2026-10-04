import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

async function run(lang: string, device: { kind: string | null; statuses: string[] }) {
  vi.doMock("@/lib/translate/device", () => {
    const q = [...device.statuses];
    return { deviceKind: () => device.kind, deviceStatus: async () => q.shift() ?? "ready", devicePrepare: async () => true };
  });
  vi.doMock("@/lib/translate/background", () => ({ startBackground: vi.fn() }));
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ levels: ["A1", "A2"] }) })));
  const { runSwitch } = await import("@/lib/translate/switching");
  const log: string[] = [];
  const result = await runSwitch(lang, { onStep: (id, st) => log.push(`${id}:${st}`), minMs: 0, translatorMs: 50 });
  return { log, result };
}

describe("switching the language to learn", () => {
  it("goes through every step in order and ends ready when the phone's translator is ready", async () => {
    const { log, result } = await run("fr", { kind: "native", statuses: ["ready"] });
    expect(log).toEqual([
      "progress:active", "progress:done", "decks:active", "decks:done", "tests:active", "tests:done",
      "translator:active", "translator:done", "books:active", "books:done",
    ]);
    expect(result).toMatchObject({ translator: "ready" });
  });

  it("asks the phone to download first when it has not got the language, then checks again", async () => {
    const { log, result } = await run("fr", { kind: "native", statuses: ["download", "ready"] });
    expect(log).toContain("translator:done");
    expect(result.translator).toBe("ready");
  });

  it("says so when the download is not finished, and carries on", async () => {
    const { log, result } = await run("fr", { kind: "native", statuses: ["download", "download"] });
    expect(log).toContain("translator:failed");
    expect(log).toContain("books:done");
    expect(result.translator).toBe("pending");
  });

  it("skips the translator on a device without one", async () => {
    const { log, result } = await run("fr", { kind: null, statuses: [] });
    expect(log).toContain("translator:skipped");
    expect(result.translator).toBe("unsupported");
  });

  it("has nothing to translate for English", async () => {
    const { log } = await run("en", { kind: "native", statuses: [] });
    expect(log).toContain("translator:skipped");
    expect(log).toContain("books:skipped");
  });
});
