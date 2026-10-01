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
    const html = renderToStaticMarkup(createElement(LevelCard, { xp: 7_500, learn: "es" }));
    const t = text(html);
    expect(t).toContain("Your Spanish level");
    expect(t).toContain("Elementary");
    expect(t).toContain("7,500 XP in total");
    expect(t).toContain("2,500 of 10,000 XP");
    expect(t).toContain("7,500 XP to B1");
    expect(html).toContain('aria-label="A2"');
    expect(html).toContain('aria-valuenow="25"');
  });

  it("has a top: C2 says so and has no next level", async () => {
    const { LevelCard } = await import("@/components/home/LevelCard");
    const t = text(renderToStaticMarkup(createElement(LevelCard, { xp: 140_000, learn: null })));
    expect(t).toContain("reached the top level");
    expect(t).not.toContain("to C2");
  });

  it("says how XP is earned from the numbers the reader pays", async () => {
    const { XP } = await import("@/lib/xp/levels");
    const { translate } = await import("@/lib/i18n");
    expect(translate(null, "xp.howPage", { xp: XP.page, half: XP.pageBelow })).toBe("10 XP for every page you read (5 for a book below your level)");
  });
});

describe("the dashboard's graph", () => {
  it("draws a week of days with the minutes read, and the daily goal", async () => {
    const { StudyChart } = await import("@/components/home/StudyChart");
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const ledger = addSeconds(EMPTY_LEDGER, "pride-and-prejudice", 600, day);
    const html = renderToStaticMarkup(createElement(StudyChart, { ledger, goal: 15, bookName: () => "Pride and Prejudice" }));
    const t = text(html);
    expect(t).toContain("minutes this week");
    expect(t).toContain("Daily goal: 15 min");
    expect(t).toContain("10");
    expect(html).toContain("Pride and Prejudice");
  });

  it("draws an empty week without breaking", async () => {
    const { StudyChart } = await import("@/components/home/StudyChart");
    const html = renderToStaticMarkup(createElement(StudyChart, { ledger: EMPTY_LEDGER, goal: 10, bookName: (s: string) => s }));
    expect(text(html)).toContain("Nothing read in this range yet.");
  });
});

describe("the level step", () => {
  it("asks how much of the language, offers six levels and the test", async () => {
    const { LevelScreen } = await import("@/components/onboarding/Level");
    const nav = { at: 3, of: 19, onBack() {}, onContinue() {}, onPick() {}, onTest() {} };
    const html = renderToStaticMarkup(createElement(LevelScreen, { ...nav, learn: "en", value: "B2", placed: true }));
    const t = text(html);
    expect(t).toContain("How much English do you already know?");
    for (const id of ["A1", "A2", "B1", "B2", "C1", "C2"]) expect(t).toContain(id);
    expect(t).toContain("Not sure? Take a 5-minute test");
    expect(t).toContain("From your test");
  });

  it("says the test is coming for a language that has none, instead of offering it", async () => {
    const { LevelScreen } = await import("@/components/onboarding/Level");
    const nav = { at: 3, of: 19, onBack() {}, onContinue() {}, onPick() {}, onTest() {} };
    const t = text(renderToStaticMarkup(createElement(LevelScreen, { ...nav, learn: "es", value: null, placed: false })));
    expect(t).toContain("The placement test for Spanish is coming");
    expect(t).not.toContain("Take a 5-minute test");
  });
});
