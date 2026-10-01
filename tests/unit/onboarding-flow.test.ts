import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CATEGORIES } from "@/lib/content/limits";
import {
  WHY_IDS, HEARD_IDS, HEARD_OTHER_MAX, NO_ANSWERS, cleanHeardOther, parseAnswers, toggleIn,
} from "@/lib/onboarding/answers";
import { DAILY_MINUTES, DEFAULT_MINUTES, readingTime } from "@/lib/onboarding/firstrun";
import { LANGUAGES, isLanguage } from "@/lib/onboarding/languages";
import { QUESTION_STEPS, AFTER_ONBOARDING, AFTER_SIGN_IN, SHOW_IDS, SIGN_IN_STEP, STEP_IDS, isInterlude, isShowStep, stepIndex } from "@/lib/onboarding/steps";

// The screens import the Supabase client and the native sign-in plugins; neither is wanted in a render test.
vi.mock("@/lib/db/client", () => ({ createClient: () => ({}) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => "web", isPluginAvailable: () => false } }));

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("the steps", () => {
  it("are the first run's twenty-two, in order, with the app's language first and the library last", () => {
    expect(STEP_IDS).toHaveLength(22);
    expect(new Set(STEP_IDS).size).toBe(22);
    expect(STEP_IDS[0]).toBe("app");
    expect(STEP_IDS[1]).toBe("intro");
    expect(STEP_IDS[STEP_IDS.length - 1]).toBe("ready");
    expect(AFTER_ONBOARDING).toBe("/");
  });

  it("have Lex say hello straight after the welcome, then ask which languages, then how much of it they know", () => {
    expect(STEP_IDS[STEP_IDS.indexOf("intro") + 1]).toBe("hello");
    expect(STEP_IDS[STEP_IDS.indexOf("hello") + 1]).toBe("quick");
    expect(STEP_IDS[STEP_IDS.indexOf("quick") + 1]).toBe("go");
    expect(STEP_IDS[STEP_IDS.indexOf("go") + 1]).toBe("tongues");
    expect(STEP_IDS[STEP_IDS.indexOf("tongues") + 1]).toBe("level");
  });

  it("keep the five tour screens together", () => {
    const at = STEP_IDS.indexOf(SHOW_IDS[0]);
    expect(STEP_IDS.slice(at, at + 5)).toEqual([...SHOW_IDS]);
    expect(isShowStep("words")).toBe(true);
    expect(isShowStep("daily")).toBe(false);
  });

  it("open any step by name, and the first for anything else", () => {
    expect(stepIndex("why")).toBe(STEP_IDS.indexOf("why"));
    for (const bad of [null, undefined, "", "nope", "WHY", "focus", "__proto__"]) expect(stepIndex(bad as string), String(bad)).toBe(0);
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

describe("the numbers the plan shows", () => {
  it("say reading time as a person would, rounded down", () => {
    expect(readingTime(7 * 20)).toBe("140 minutes");
    expect(readingTime(179)).toBe("179 minutes");
    expect(readingTime(180)).toBe("3 hours");
    expect(readingTime(365 * 10)).toBe("60 hours");
    expect(readingTime(365 * 20)).toBe("121 hours");
  });

  it("offer six daily times and default to one of them", () => {
    expect(DAILY_MINUTES).toEqual([10, 15, 20, 30, 45, 60]);
    expect(DAILY_MINUTES).toContain(DEFAULT_MINUTES);
  });
});

describe("the answers", () => {
  it("are empty for anything missing or corrupt, and never throw", () => {
    for (const bad of [null, undefined, "", "not json", "[]", "7", "null", '"x"']) expect(parseAnswers(bad as string)).toEqual(NO_ANSWERS);
  });

  it("keep only values that exist, in the screen's order, each once", () => {
    const a = parseAnswers(JSON.stringify({
      why: ["fun", "nope", "friends", "fun"], heard: "tiktok", daily: 15, pledged: true, language: "es", learn: "fr",
      interests: ["history", "romance", "bogus"], heardOther: "x".repeat(500),
    }));
    expect(a.why).toEqual(["friends", "fun"]);
    expect(a.heard).toBe("tiktok");
    expect(a.daily).toBe(15);
    expect(a.pledged).toBe(true);
    expect(a.language).toBe("es");
    expect(a.learn).toBe("fr");
    expect(a.interests).toEqual(["romance", "history"]);
    expect(a.heardOther).toHaveLength(HEARD_OTHER_MAX);
  });

  it("refuse a daily time that was not offered, and a language that does not exist", () => {
    const a = parseAnswers(JSON.stringify({ daily: 999, language: "xx", learn: "xx", heard: "myspace", pledged: "yes" }));
    expect(a).toEqual(NO_ANSWERS);
  });

  it("tick and untick, keeping the screen's order", () => {
    expect(toggleIn(WHY_IDS, [], "fun")).toEqual(["fun"]);
    expect(toggleIn(WHY_IDS, ["fun"], "friends")).toEqual(["friends", "fun"]);
    expect(toggleIn(WHY_IDS, ["friends", "fun"], "friends")).toEqual(["fun"]);
  });

  it("clean the one typed answer to a single trimmed line of a sensible length", () => {
    expect(cleanHeardOther("  a   podcast \n ")).toBe("a podcast");
    expect(cleanHeardOther("y".repeat(300))).toHaveLength(HEARD_OTHER_MAX);
  });

  it("offer the channels, the reasons and the shelves the screens show", () => {
    expect(HEARD_IDS).toHaveLength(11);
    expect(HEARD_IDS[HEARD_IDS.length - 1]).toBe("other");
    expect(WHY_IDS).toHaveLength(8);
    expect(WHY_IDS[WHY_IDS.length - 1]).toBe("other");
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
  const nav = { at: 3, of: 19, onBack: () => {}, onContinue: () => {} };
  const html = async () => {
    const q = await import("@/components/onboarding/Questions");
    const p = await import("@/components/onboarding/Plan");
    const l = await import("@/components/onboarding/Last");
    const t = await import("@/components/onboarding/Tour");
    const g = await import("@/components/onboarding/Tongues");
    const r = await import("@/components/onboarding/Ready");
    const mk = (c: unknown, props: object) => renderToStaticMarkup(createElement(c as never, props as never));
    return {
      hello: mk(q.HelloScreen, nav),
      why: mk(q.WhyScreen, { ...nav, learn: "es", value: ["work"], onToggle: () => {} }),
      heard: mk(q.HeardScreen, { ...nav, value: "other", other: "", onPick: () => {}, onOther: () => {} }),
      time: mk(p.TimeScreen, { ...nav, learn: "es", value: 20, onPick: () => {} }),
      path: mk(p.PathScreen, { ...nav, level: "A1", minutes: 20 }),
      pathB2: mk(p.PathScreen, { ...nav, level: "B2", minutes: 30 }),
      pathTop: mk(p.PathScreen, { ...nav, level: "C2", minutes: 30 }),
      ...Object.fromEntries(SHOW_IDS.map((id) => [id, mk(t.TourScreen, { ...nav, id, learn: "es" })])),
      future: mk(p.FutureScreen, { ...nav, minutes: 15, why: ["friends", "work"] }),
      pledge: mk(p.PledgeScreen, { ...nav, minutes: 15, done: false, onDone: () => {} }),
      tongues: mk(g.TonguesScreen, { ...nav, speak: "en", learn: "es" }),
      tonguesBlank: mk(g.TonguesScreen, { ...nav, speak: "en", learn: null }),
      account: mk(l.AccountScreen, { at: 15, of: 19, onBack: () => {}, error: false, onNext: () => {} }),
      accountFailed: mk(l.AccountScreen, { at: 15, of: 19, onBack: () => {}, error: true, onNext: () => {} }),
      interests: mk(l.InterestsScreen, { ...nav, value: ["romance"], onChange: () => {} }),
      ready: mk(r.ReadyScreen, { ...nav, interests: ["romance", "history", "science"], minutes: 15, level: "A2", learn: "es" }),
    } as Record<string, string>;
  };

  it("with the question each one asks", async () => {
    const h = await html();
    const text = (s: string) => s.replace(/<[^>]+>/g, "");
    expect(text(h.hello)).toContain("I&#x27;m Lex. Welcome to ReadFluent!");
    expect(h.hello).not.toContain("role=\"progressbar\"");
    expect(text(h.why)).toContain("Why are you learning Spanish?");
    for (const label of ["Talk with friends and family", "Travel", "My job or business", "School or exams", "Move or live abroad", "Books, films and music", "Just for fun", "Other"]) expect(text(h.why)).toContain(label);
    expect(text(h.heard)).toContain("How did you hear about ReadFluent?");
    expect(text(h.time)).toContain("How much time can you commit to learning Spanish each day?");
    for (const m of ["10", "15", "20", "30", "45", "60"]) expect(h.time).toContain(`aria-label="${m} minutes"`);
    expect(text(h.path)).toContain("At 20 minutes a day, you could reach A2 in about 4 months.");
    expect(text(h.path)).toContain("114 days");
    expect(text(h.path)).toContain("This is an estimate, not a promise.");
    expect(text(h.pathB2)).toContain("you could reach C1 in about");
    expect(text(h.pathTop)).toContain("You're already at C2".replace("'", "&#x27;"));
    expect(text(h.future)).toContain("15 minutes a day takes you");
    expect(text(h.pledge)).toContain("Make it a promise to yourself.");
    expect(text(h.tongues)).toContain("Which languages?");
    expect(text(h.tongues)).toContain("Reading Spanish, with help in English.");
    expect(text(h.tonguesBlank)).toContain("Choose the language you want to learn.");
    expect(text(h.tongues)).toContain("You can change this any time, and your progress is always saved.");
    expect(text(h.account)).toContain("Sign in or sign up");
    expect(text(h.interests)).toContain("What are you curious about?");
    expect(text(h.ready)).toContain("Building your library");
  });

  it("with all the tour's screens, each saying its own line", async () => {
    const h = await html();
    const lines = ["books of your choice", "level and your length", "Tap any word", "bring your new words back", "books everyone talks about"];
    SHOW_IDS.forEach((id, i) => expect(h[id].replace(/<[^>]+>/g, ""), id).toContain(lines[i].split(" ")[0]));
  });

  it("with the first tour screen about books of their choice and questions in the language", async () => {
    const h = await html();
    const text = h.journey.replace(/<[^>]+>/g, "");
    expect(text).toContain("go through books of your choice");
    expect(text).toContain("Every few pages, you&#x27;ll answer a few Spanish questions");
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

describe("the two languages cannot be the same", () => {
  it("drops a saved learn language that equals the one they speak", () => {
    expect(parseAnswers(JSON.stringify({ language: "en", learn: "en" })).learn).toBeNull();
    expect(parseAnswers(JSON.stringify({ language: "es", learn: "en" })).learn).toBe("en");
    expect(parseAnswers(JSON.stringify({ language: "es", learn: "es" })).learn).toBeNull();
  });

  it("offers each card every language except the one on the other", async () => {
    const { choicesFor } = await import("@/lib/onboarding/tongues");
    const codes = (w: "speak" | "learn", s: "en" | "es", l: "en" | "es" | null) => choicesFor(w, s, l, LANGUAGES).map((x) => x.code);
    expect(codes("learn", "en", null)).not.toContain("en");
    expect(codes("learn", "en", null)).toHaveLength(19);
    expect(codes("speak", "en", "es")).not.toContain("es");
    expect(codes("speak", "en", "es")).toContain("en");
    expect(codes("speak", "en", null)).toHaveLength(20);
  });

  it("keeps Continue off on the languages screen until a different language is chosen", async () => {
    const g = await import("@/components/onboarding/Tongues");
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const nav = { at: 1, of: 19, onBack: () => {}, onContinue: () => {} };
    const off = (learn: "es" | null) => /<button[^>]*disabled=""[^>]*ob-primary|<button[^>]*ob-primary[^>]*disabled=""/.test(renderToStaticMarkup(createElement(g.TonguesScreen, { ...nav, speak: "en", learn })));
    expect(off(null)).toBe(true);
    expect(off("es")).toBe(false);
  });
});

describe("the language pair", () => {
  it("says what the pair means, and what is not available yet", async () => {
    const { tonguesSummary, tonguesNote } = await import("@/lib/onboarding/tongues");
    const { translate } = await import("@/lib/i18n");
    const t = (id: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(null, id, vars);
    expect(tonguesSummary(t, "en", "en", "es")).toBe("Reading Spanish, with help in English.");
    expect(tonguesSummary(t, "en", "en", null)).toBe("Choose the language you want to learn.");
    expect(tonguesNote(t, "en", "en", "es")).toContain("The books are in English today");
    expect(tonguesNote(t, "en", "fr", "en")).toContain("French are coming");
    expect(tonguesNote(t, "en", "en", "en")).toBeNull();
  });

  it("says it in the reader's language, with the language names in that language", async () => {
    const { tonguesSummary } = await import("@/lib/onboarding/tongues");
    const { translate, EN } = await import("@/lib/i18n");
    // A stand-in catalog: the point is that names come from the browser in the reader's language.
    const fr = { ...EN, "tongues.summary": "Lecture en {learn}, avec de l'aide en {speak}." };
    const t = (id: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(fr, id, vars);
    expect(tonguesSummary(t, "fr", "en", "es")).toBe("Lecture en espagnol, avec de l'aide en anglais.");
  });
});

describe("the app's language, the very first screen", () => {
  it("says it is the app's language and not the one they will learn, and gives an example", async () => {
    const { AppLanguageScreen } = await import("@/components/onboarding/AppLanguage");
    const html = renderToStaticMarkup(createElement(AppLanguageScreen, { onContinue: () => {} }));
    const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(t).toContain("Choose the language of the app");
    expect(t).toContain("It isn&#x27;t the language you&#x27;re going to learn");
    expect(t).toContain("For example, if you speak English and want to learn Spanish, choose English here.");
    for (const l of LANGUAGES) expect(t, l.code).toContain(l.native);
    expect(t).toContain("Continue");
  });

  it("picks the reader's own language from the browser's, the first one the app is written in", async () => {
    const { detectLanguage } = await import("@/components/onboarding/AppLanguage");
    expect(detectLanguage(["es-MX", "en"])).toBe("es");
    expect(detectLanguage(["xx", "pt-BR", "en-GB"])).toBe("pt");
    expect(detectLanguage(["zh-Hans-CN"])).toBe("zh");
    expect(detectLanguage(["en-GB"])).toBe("en");
    expect(detectLanguage(["xx", "yy"])).toBeNull();
    expect(detectLanguage([])).toBeNull();
  });
});

describe("Lex says how quick it will be", () => {
  it("counts the questions from the screens that ask something, and they all come after it and before the end", () => {
    expect(QUESTION_STEPS.length).toBeGreaterThan(3);
    const at = STEP_IDS.indexOf("quick");
    for (const q of QUESTION_STEPS) {
      expect(STEP_IDS.indexOf(q), q).toBeGreaterThan(at);
      expect(STEP_IDS.indexOf(q), q).toBeLessThan(STEP_IDS.indexOf("ready"));
    }
  });

  it("says that number in the bubble, with Lex waiting to begin", async () => {
    const { QuickScreen } = await import("@/components/onboarding/Questions");
    const html = renderToStaticMarkup(createElement(QuickScreen, { at: 3, of: 20, onBack: () => {}, onContinue: () => {} }));
    const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(t).toContain(`Just ${QUESTION_STEPS.length} quick questions, then you can start reading!`);
    expect(t).toContain("keep it as quick as we can");
    expect(html).toContain("lx-ready");
    expect(html).not.toContain('role="progressbar"');
  });
});

describe("Lex celebrates, then the run moves on by itself", () => {
  it("makes the celebration an interlude that Back steps over", () => {
    expect(isInterlude("go")).toBe(true);
    expect(isInterlude("quick")).toBe(false);
    expect(read("app/welcome/page.tsx")).toContain("isInterlude(STEP_IDS[i - 1]) ? i - 2 : i - 1");
  });

  it("shows Lex cheering and 'Let's go!', with no progress bar and nothing to press", async () => {
    const { GoScreen } = await import("@/components/onboarding/Questions");
    const html = renderToStaticMarkup(createElement(GoScreen, { at: 4, of: 21, onBack: () => {}, onContinue: () => {} }));
    expect(html).toContain("lx-cheer");
    expect(html).toContain("go-lex");
    expect(html).toContain("Let&#x27;s go!");
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toContain("ob-primary");
  });

  it("puts Lex beside the line on every screen that asks or shows something", () => {
    for (const f of ["Questions", "Tongues", "Level", "Plan", "Tour", "Last", "Ready"]) {
      expect(read(`components/onboarding/${f}.tsx`), f).toContain("GuideHead");
    }
  });
});

describe("Lex asks to be added to the home screen", () => {
  it("comes after the promise and before signing in", () => {
    expect(STEP_IDS[STEP_IDS.indexOf("pledge") + 1]).toBe("home");
    expect(STEP_IDS[STEP_IDS.indexOf("home") + 1]).toBe("account");
  });

  it("shows the ask, the tile, Continue and Not now", async () => {
    const { HomeScreen } = await import("@/components/onboarding/Home");
    const html = renderToStaticMarkup(createElement(HomeScreen, { at: 16, of: 22, onBack: () => {}, onContinue: () => {} }));
    const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(t).toContain("Add me to your home screen!");
    expect(t).toContain("Not now");
    expect(t).toContain("Continue");
    expect(html).toContain("home-tile");
  });
});

describe("installing", () => {
  it("tells an iPhone, and an iPad that says it is a Mac, from the rest", async () => {
    const { isIos } = await import("@/lib/pwa/install");
    expect(isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
    expect(isIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(isIos("Mozilla/5.0 (Linux; Android 14; Pixel 8)", 5)).toBe(false);
  });
});
