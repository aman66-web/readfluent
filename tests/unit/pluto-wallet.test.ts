import { describe, expect, it } from "vitest";
import { EARN, ITEMS, prizeFor } from "@/lib/pluto/shop";
import { EMPTY_WALLET, balance, buy, equip, finishOf, finishedPeriods, mintFromXp, parseWallet, payPrizes, stageIndex } from "@/lib/pluto/wallet";
import { LEVEL_FLOOR } from "@/lib/xp/levels";

describe("coins from XP and level-ups", () => {
  it("one coin for every 10 XP earned, each XP counted once", () => {
    const a = mintFromXp(EMPTY_WALLET, "es", 95, LEVEL_FLOOR.A1 + 95);
    expect(a.coins).toBe(9);
    expect(balance(a.wallet)).toBe(9);
    expect(mintFromXp(a.wallet, "es", 95, LEVEL_FLOOR.A1 + 95).coins).toBe(0);
    const b = mintFromXp(a.wallet, "es", 120, LEVEL_FLOOR.A1 + 120);
    expect(b.coins).toBe(3); // the 5 left over from 95 counts now
    expect(balance(b.wallet)).toBe(12);
  });
  it("keeps every language's XP apart, in one wallet", () => {
    const es = mintFromXp(EMPTY_WALLET, "es", 200, LEVEL_FLOOR.A1 + 200).wallet;
    const fr = mintFromXp(es, "fr", 50, LEVEL_FLOOR.A1 + 50);
    expect(fr.coins).toBe(5);
    expect(balance(fr.wallet)).toBe(25);
    expect(mintFromXp(fr.wallet, "es", 200, LEVEL_FLOOR.A1 + 200).coins).toBe(0);
  });
  it("pays for each new stage and more for a new level, but not for where a reader started", () => {
    const start = mintFromXp(EMPTY_WALLET, "es", 0, LEVEL_FLOOR.B1).wallet;
    expect(balance(start)).toBe(0);
    const s = stageIndex(LEVEL_FLOOR.B1);
    const next = mintFromXp(start, "es", 0, LEVEL_FLOOR.B2);
    expect(stageIndex(LEVEL_FLOOR.B2).stage - s.stage).toBe(3);
    expect(next.coins).toBe(EARN.stage * 2 + EARN.level);
  });
});

describe("leaderboard prizes", () => {
  const days: Record<string, { xp: number }> = {};
  for (let d = 1; d <= 30; d++) days[`2026-09-${String(d).padStart(2, "0")}`] = { xp: 150 };
  const now = new Date("2026-10-04T10:00:00");
  it("pay once for each finished week and month the reader read in, newest first", () => {
    const keys = finishedPeriods(now).map((p) => p.key);
    expect(keys).toContain("week:2026-W39");
    expect(keys).toContain("month:2026-09");
    const r = payPrizes(EMPTY_WALLET, now, days, "SEEDCODE", "A2.1");
    expect(r.won.length).toBeGreaterThan(0);
    for (const w of r.won) expect(w.coins).toBe(prizeFor(w.kind, w.rank));
    expect(payPrizes(r.wallet, now, days, "SEEDCODE", "A2.1").won).toEqual([]);
    expect(balance(r.wallet)).toBe(r.won.reduce((a, w) => a + w.coins, 0));
  });
  it("the same finish every time it is worked out, and none for a period with no reading", () => {
    const end = finishedPeriods(now).find((p) => p.key === "month:2026-09")!.end;
    expect(finishOf("month", end, days, "S", "A2.1")).toBe(finishOf("month", end, days, "S", "A2.1"));
    expect(finishOf("month", end, {}, "S", "A2.1")).toBeNull();
  });
  it("places pay more the higher they are", () => {
    expect(prizeFor("week", 1)).toBeGreaterThan(prizeFor("week", 2));
    expect(prizeFor("week", 4)).toBe(prizeFor("week", 5));
    expect(prizeFor("month", 20)).toBe(EARN.month[5]);
  });
});

describe("the wardrobe", () => {
  const rich = { ...EMPTY_WALLET, minted: 1000 };
  it("buys what the reader can afford, wears it at once, and keeps it", () => {
    const r = buy(rich, "crown");
    expect(r.result).toBe("bought");
    expect(r.wallet.look.head).toBe("crown");
    expect(balance(r.wallet)).toBe(1000 - 600);
    expect(buy(r.wallet, "crown").result).toBe("owned");
    expect(buy(r.wallet, "ufo").result).toBe("poor");
    expect(buy(r.wallet, "nothing").result).toBe("unknown");
  });
  it("takes things off and puts owned things back on, never something not owned", () => {
    const w = buy(rich, "shades").wallet;
    expect(equip(w, "face", null).look.face).toBeNull();
    expect(equip(equip(w, "face", null), "face", "shades").look.face).toBe("shades");
    expect(equip(w, "head", "crown").look.head).toBeNull();
    expect(equip(w, "colour", null).look.colour).toBe("cyan");
  });
  it("reads a stored wallet safely, wearing only what is owned", () => {
    expect(parseWallet("nope")).toEqual(EMPTY_WALLET);
    const w = parseWallet(JSON.stringify({ minted: 50, owned: ["crown", "fake"], look: { head: "crown", pet: "ufo", colour: "gold" }, spent: -4 }));
    expect(w.owned).toEqual(["cyan", "crown"]);
    expect(w.look).toEqual({ colour: "cyan", head: "crown", face: null, pet: null });
    expect(w.spent).toBe(0);
  });
  it("has a price for everything and something free to start", () => {
    expect(ITEMS.filter((i) => i.price === 0).map((i) => i.id)).toEqual(["cyan"]);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });
});
