import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CATEGORIES } from "@/lib/content/limits";
import {
  FOCUS_IDS, HEARD_IDS, HEARD_OTHER_MAX, NO_ANSWERS, cleanHeardOther, parseAnswers, toggleIn,
} from "@/lib/onboarding/answers";
import { DAILY_MINUTES, DEFAULT_MINUTES, SCROLL_HOURS, SCROLL_IDS, SWAP_MINUTES, readingTime, scrollDaysAYear } from "@/lib/onboarding/firstrun";
import { LANGUAGES, isLanguage } from "@/lib/onboarding/languages";
import { AFTER_ONBOARDING, AFTER_SIGN_IN, SHOW_IDS, SIGN_IN_STEP, STEP_IDS, isShowStep, stepIndex } from "@/lib/onboarding/steps";

// The screens import the Supabase client and the native sign-in plugins; neither is wanted in a render test.
vi.mock("@/lib/db/client", () => ({ createClient: () => ({}) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web", isPluginAvailable: () => false } }));

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("the steps", () => {
  it("are the first run's eighteen, in order, with the welcome first and the library last", () => {
    expect(STEP_IDS).toHaveLength(18);
    expect(new Set(STEP_IDS).size).toBe(18);
    expect(STEP_IDS[0]).toBe("intro");
    expect(STEP_IDS[STEP_IDS.length - 1]).toBe("ready");
    expect(AFTER_ONBOARDING).toBe("/");
  });

  it("ask which languages straight after the welcome", () => {
    expect(STEP_IDS[1]).toBe("tongues");
  });

  it("keep the five tour screens together", () => {
    const at = STEP_IDS.indexOf(SHOW_IDS[0]);
    expect(STEP_IDS.slice(at, at + 5)).toEqual([...SHOW_IDS]);
    expect(isShowStep("words")).toBe(true);
    expect(isShowStep("daily")).toBe(false);
  });

  it("open any step by name, and the first for anything else", () => {
    expect(stepIndex("focus")).toBe(STEP_IDS.indexOf("focus"));
    for (const bad of [null, undefined, "", "nope", "FOCUS", "__proto__"]) expect(stepIndex(bad as string), String(bad)).toBe(0);
  });

  it("send a provider sign-in back to steps that exist", () => {
    // A stale name here would quietly restart the whole run for everybody who signs in:
    // stepIndex falls back to the first step for anything it does not recognise.
    for (const url of [AFTER_SIGN_IN, SIGN_IN_STEP]) {
      const step = new URL(url, "https://x.example").searchParams.get("step");
      expect(STEP_IDS as readonly string[], url).toContain(step);
      expect(stepIndex(step), url).toBeGreaterThan(0);
    }
    expect(SIGN_IN_STEP).toContain("account");
    expect(STEP_IDS.indexOf("interests")).toBe(STEP_IDS.indexOf("account") + 1);
  });
});

describe("the numbers the mirror and the plan show", () => {
  it("turn what somebody said into whole days of a year, never overstated", () => {
    expect(SCROLL_IDS.map(scrollDaysAYear)).toEqual([11, 23, 46, 61]);
    expect(SCROLL_HOURS["4plus"]).toBe(4); // the bottom of an open-ended answer
    for (let i = 1; i < SCROLL_IDS.length; i++) expect(scrollDaysAYear(SCROLL_IDS[i])).toBeGreaterThan(scrollDaysAYear(SCROLL_IDS[i - 1]));
  });

  it("say reading time as a person would, rounded down", () => {
    expect(readingTime(7 * 20)).toBe("140 minutes");
    expect(readingTime(179)).toBe("179 minutes");
    expect(readingTime(180)).toBe("3 hours");
    expect(readingTime(365 * SWAP_MINUTES)).toBe("60 hours");
    expect(readingTime(365 * 20)).toBe("121 hours");
    expect(readingTime(365 * 5)).toBe("30 hours");
  });

  it("offer four daily times and default to one of them", () => {
    expect(DAILY_MINUTES).toEqual([5, 10, 15, 20]);
    expect(DAILY_MINUTES).toContain(DEFAULT_MINUTES);
    expect(DAILY_MINUTES).toContain(SWAP_MINUTES);
  });
});

describe("the answers", () => {
  it("are empty for anything missing or corrupt, and never throw", () => {
    for (const bad of [null, undefined, "", "not json", "[]", "7", "null", '"x"']) expect(parseAnswers(bad as string)).toEqual(NO_ANSWERS);
  });

  it("keep only values that exist, in the screen's order, each once", () => {
    const a = parseAnswers(JSON.stringify({
      focus: ["words", "nope", "language", "words"], heard: "tiktok", scroll: "2to4", daily: 15, pledged: true, language: "es", learn: "fr",
      interests: ["history", "romance", "bogus"], heardOther: "x".repeat(500),
    }));
    expect(a.focus).toEqual(["language", "words"]);
    expect(a.heard).toBe("tiktok");
    expect(a.scroll).toBe("2to4");
    expect(a.daily).toBe(15);
    expect(a.pledged).toBe(true);
    expect(a.language).toBe("es");
    expect(a.learn).toBe("fr");
    expect(a.interests).toEqual(["romance", "history"]);
    expect(a.heardOther).toHaveLength(HEARD_OTHER_MAX);
  });

  it("refuse a daily time that was not offered, and a language that does not exist", () => {
    const a = parseAnswers(JSON.stringify({ daily: 999, language: "xx", learn: "xx", heard: "myspace", scroll: "forever", pledged: "yes" }));
    expect(a).toEqual(NO_ANSWERS);
  });

  it("tick and untick, keeping the screen's order", () => {
    expect(toggleIn(FOCUS_IDS, [], "words")).toEqual(["words"]);
    expect(toggleIn(FOCUS_IDS, ["words"], "language")).toEqual(["language", "words"]);
    expect(toggleIn(FOCUS_IDS, ["language", "words"], "language")).toEqual(["words"]);
  });

  it("clean the one typed answer to a single trimmed line of a sensible length", () => {
    expect(cleanHeardOther("  a   podcast \n ")).toBe("a podcast");
    expect(cleanHeardOther("y".repeat(300))).toHaveLength(HEARD_OTHER_MAX);
  });

  it("offer the channels, the focuses and the shelves the screens show", () => {
    expect(HEARD_IDS).toHaveLength(11);
    expect(HEARD_IDS[HEARD_IDS.length - 1]).toBe("other");
    expect(FOCUS_IDS).toHaveLength(4);
    expect(CATEGORIES).toHaveLength(9);
  });

  it("offer twenty languages, English first", () => {
    expect(LANGUAGES).toHaveLength(20);
    expect(LANGUAGES[0].code).toBe("en");
    expect(isLanguage("es")).toBe(true);
    expect(isLanguage("xx")).toBe(false);
  });
});

describe("every screen renders", () => {
  const nav = { at: 3, of: 18, onBack: () => {}, onContinue: () => {} };
  const html = async () => {
    const q = await import("@/components/onboarding/Questions");
    const p = await import("@/components/onboarding/Plan");
    const l = await import("@/components/onboarding/Last");
    const t = await import("@/components/onboarding/Tour");
    const g = await import("@/components/onboarding/Tongues");
    const mk = (c: unknown, props: object) => renderToStaticMarkup(createElement(c as never, props as never));
    return {
      hello: mk(q.HelloScreen, nav),
      focus: mk(q.FocusScreen, { ...nav, value: ["words"], onToggle: () => {} }),
      heard: mk(q.HeardScreen, { ...nav, value: "other", other: "", onPick: () => {}, onOther: () => {} }),
      scroll: mk(q.ScrollScreen, { ...nav, value: "2to4", onPick: () => {} }),
      mirror: mk(q.MirrorScreen, { ...nav, scroll: "2to4" }),
      mirrorBlank: mk(q.MirrorScreen, { ...nav, scroll: null }),
      ...Object.fromEntries(SHOW_IDS.map((id) => [id, mk(t.TourScreen, { ...nav, id })])),
      daily: mk(p.DailyScreen, { ...nav, value: 15, onPick: () => {} }),
      future: mk(p.FutureScreen, { ...nav, minutes: 15, focus: ["language", "words"] }),
      pledge: mk(p.PledgeScreen, { ...nav, minutes: 15, done: false, onDone: () => {} }),
      tongues: mk(g.TonguesScreen, { ...nav, speak: "en", learn: "es", onSpeak: () => {}, onLearn: () => {} }),
      tonguesBlank: mk(g.TonguesScreen, { ...nav, speak: "en", learn: null, onSpeak: () => {}, onLearn: () => {} }),
      account: mk(l.AccountScreen, { at: 15, of: 18, onBack: () => {}, error: false, onNext: () => {} }),
      accountFailed: mk(l.AccountScreen, { at: 15, of: 18, onBack: () => {}, error: true, onNext: () => {} }),
      interests: mk(l.InterestsScreen, { ...nav, value: ["romance"], onChange: () => {} }),
      ready: mk(p.ReadyScreen, { ...nav, interests: ["romance", "history", "science"], minutes: 15 }),
    } as Record<string, string>;
  };

  it("with the question each one asks", async () => {
    const h = await html();
    const text = (s: string) => s.replace(/<[^>]+>/g, "");
    expect(text(h.hello)).toContain("welcome to ReadFluent");
    expect(text(h.focus)).toContain("What do you want to focus on?");
    expect(text(h.heard)).toContain("How did you hear about ReadFluent?");
    expect(text(h.scroll)).toContain("How long do you spend scrolling each day?");
    expect(text(h.mirror)).toContain("46 whole days a year");
    expect(text(h.mirrorBlank)).toContain(`Swap just ${SWAP_MINUTES} minutes a day for ReadFluent`);
    expect(text(h.daily)).toContain("How much time will you give it each day?");
    expect(text(h.future)).toContain("15 minutes a day takes you");
    expect(text(h.pledge)).toContain("Make it a promise to yourself.");
    expect(text(h.tongues)).toContain("Which languages?");
    expect(text(h.tongues)).toContain("Reading Spanish, with help in English.");
    expect(text(h.tonguesBlank)).toContain("Choose the language you want to learn.");
    expect(text(h.account)).toContain("Sign in or sign up");
    expect(text(h.interests)).toContain("What are you curious about?");
    expect(text(h.ready)).toContain("Building your library");
  });

  it("with all the tour's screens, each saying its own line", async () => {
    const h = await html();
    const lines = ["real books", "level and your length", "Tap any word", "bring your new words back", "books everyone talks about"];
    SHOW_IDS.forEach((id, i) => expect(h[id].replace(/<[^>]+>/g, ""), id).toContain(lines[i].split(" ")[0]));
  });

  it("with the sign-in step saying so when there is no database, and never dead-ending", async () => {
    const h = await html();
    expect(h.account).toContain("Accounts aren");
    expect(h.account).toContain("Continue");
  });

  it("carrying no money-app wording or currency", async () => {
    const h = await html();
    for (const [name, out] of Object.entries(h)) expect(out, name).not.toMatch(/\bbank\b|£|\bsavings\b|\binvest/i);
  });
});

describe("the white theme", () => {
  const css = read("app/welcome/welcome.css");

  it("puts every onboarding screen on a white ground", () => {
    expect(css).toMatch(/\.ob \{[^}]*background: #fff/s);
    expect(css).toMatch(/\.guide \{ background: #fff; \}/);
    expect(css).toMatch(/\.first \{ background: #fff; \}/);
  });

  it("has no black ground left behind", () => {
    // `#000` survives only as the opaque stop of a fade mask, which paints nothing.
    const withoutMasks = css.replace(/mask-image:[^;]*;/g, "").replace(/-webkit-mask-image:[^;]*;/g, "");
    expect(withoutMasks).not.toMatch(/background(?:-color)?:\s*(?:#000\b|#000000|black)/i);
  });

  it("has no orange anywhere in the onboarding", () => {
    const ORANGE = /#(?:c2522b|ee5a2a|f26a3a|e8593a|ff7a45|ffb36b|f7a04b|d92c7a|ffd27a|ff8fb8|f06aa8|ff9e7a|ffe2bd)\b/i;
    const dir = "components/onboarding";
    for (const f of readdirSync(new URL(`../../${dir}`, import.meta.url))) expect(ORANGE.test(read(`${dir}/${f}`)), `${dir}/${f}`).toBe(false);
    for (const f of ["app/welcome/welcome.css", "app/welcome/page.tsx", "lib/onboarding/firstrun.ts"]) expect(ORANGE.test(read(f)), f).toBe(false);
  });
});

describe("the run's last step", () => {
  const page = read("app/welcome/page.tsx");

  it("reports the answers once, marks the first screen seen, and opens the library", () => {
    const finish = page.slice(page.indexOf("const finish = () => {"), page.indexOf("// The first screen is its own layout"));
    expect(finish).toContain("reportFirstRun(a, minutes)");
    expect(finish).toContain("markOnboarded()");
    expect(finish).toContain("router.replace(AFTER_ONBOARDING)");
  });

  it("does not send the reader off before the run is finished", () => {
    // markOnboarded is called only from finish: quitting half-way sends the reader back to the start.
    expect(page.match(/markOnboarded\(\)/g)).toHaveLength(1);
  });
});

describe("the language pair", () => {
  it("says what the pair means, and what is not available yet", async () => {
    const { tonguesSummary, tonguesNote } = await import("@/lib/onboarding/tongues");
    expect(tonguesSummary("en", "es")).toBe("Reading Spanish, with help in English.");
    expect(tonguesSummary("en", null)).toBe("Choose the language you want to learn.");
    expect(tonguesNote("en", "es")).toContain("The books are in English today");
    expect(tonguesNote("fr", "en")).toContain("French are coming");
    expect(tonguesNote("en", "en")).toBeNull();
  });
});
