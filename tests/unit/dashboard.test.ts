import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { addSeconds, EMPTY_LEDGER } from "@/lib/xp/ledger";

vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));

const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the dashboard's level card", () => {
  it("shows the level, the bar to the next, and what is left", async () => {
    const { LevelCard } = await import("@/components/home/LevelCard");
    const html = renderToStaticMarkup(createElement(LevelCard, { xp: 30_000, learn: "es" }));
    const t = text(html);
    expect(t).toContain("Your Spanish level");
    expect(t).toContain("Elementary");
    expect(t).toContain("30,000 XP in total");
    expect(t).toContain("8,500 of 32,500 XP");
    expect(t).toContain("24,000 XP to B1");
    expect(html).toContain('aria-label="A2"');
    // Three stages in each level, and what a reader can do at this one and at the next.
    expect(t).toContain("A2.1 · Early");
    expect(t).toContain("What you can do at A2.1");
    expect(t).toContain("You can follow simple conversations about everyday things");
    expect(t).toContain("Next, at A2.2");
    expect(t).toContain("You can describe your routine, your home and your past");
    expect(html).toContain('aria-valuenow="26"');
  });

  it("says midway through a level, and moves on to the next level's first stage after the third", async () => {
    const { LevelCard } = await import("@/components/home/LevelCard");
    const mid = text(renderToStaticMarkup(createElement(LevelCard, { xp: 74_000, learn: "es" })));
    expect(mid).toContain("B1.2 · Midway");
    expect(mid).toContain("Next, at B1.3");
    const late = text(renderToStaticMarkup(createElement(LevelCard, { xp: 90_000, learn: "es" })));
    expect(late).toContain("B1.3 · Late");
    expect(late).toContain("Next, at B2.1");
  });

  it("has a top: C2 says so and has no next level", async () => {
    const { LevelCard } = await import("@/components/home/LevelCard");
    const t = text(renderToStaticMarkup(createElement(LevelCard, { xp: 300_000, learn: null })));
    expect(t).toContain("reached the top level");
    expect(t).not.toContain("to C2");
    expect(t).toContain("What you can do at C2");
    expect(t).toContain("understand virtually everything");
    expect(t).not.toContain("Next, at");
  });

  it("says how XP is earned from the numbers the reader pays", async () => {
    const { XP } = await import("@/lib/xp/levels");
    const { translate } = await import("@/lib/i18n");
    expect(translate(null, "xp.howPage", { xp: XP.page, half: XP.pageBelow })).toBe("2 XP for every page you read (1 for a book below your level)");
  });
});

describe("the dashboard's graph", () => {
  it("draws a week of days with the minutes read, and the daily goal", async () => {
    const { StudyChartBody } = await import("@/components/home/StudyChart");
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const ledger = addSeconds(EMPTY_LEDGER, "pride-and-prejudice", 600, day);
    const html = renderToStaticMarkup(createElement(StudyChartBody, { ledger, goal: 15, bookName: () => "Pride and Prejudice", today: day }));
    const t = text(html);
    expect(t).toContain("minutes this week");
    expect(t).toContain("Daily goal: 15 min");
    expect(t).toContain("10");
    expect(html).toContain("Pride and Prejudice");
  });

  it("draws an empty week without breaking", async () => {
    const { StudyChartBody } = await import("@/components/home/StudyChart");
    const html = renderToStaticMarkup(createElement(StudyChartBody, { ledger: EMPTY_LEDGER, goal: 10, bookName: (s: string) => s, today: "2026-10-01" }));
    expect(text(html)).toContain("Nothing read in this range yet.");
  });

  it("waits for the reader's own day instead of guessing it on the server", async () => {
    const { StudyChart } = await import("@/components/home/StudyChart");
    const html = renderToStaticMarkup(createElement(StudyChart, { ledger: EMPTY_LEDGER, goal: 10, bookName: (s: string) => s }));
    expect(text(html)).not.toContain("Nothing read");
  });
});

describe("the level step", () => {
  it("asks how much of the language and offers the six levels, and nothing else: the test comes at the end", async () => {
    const { LevelScreen } = await import("@/components/onboarding/Level");
    const nav = { at: 3, of: 18, onBack() {}, onContinue() {}, onPick() {} };
    const html = renderToStaticMarkup(createElement(LevelScreen, { ...nav, learn: "en", value: "B2", placed: true }));
    const t = text(html);
    expect(t).toContain("How much English do you already know?");
    for (const id of ["A1", "A2", "B1", "B2", "C1", "C2"]) expect(t).toContain(id);
    expect(t).toContain("What are A1 to C2?");
    expect(t).toContain("Choose your level");
    expect(t).not.toContain("Option 2");
    expect(t).not.toContain("Not sure which to pick?");
    expect(t).not.toContain("Take a test to find my level");
    // The explainer comes before the six levels.
    expect(t.indexOf("What are A1 to C2?")).toBeLessThan(t.indexOf("Just starting"));
    expect(t).toContain("From your test");
  });
});
