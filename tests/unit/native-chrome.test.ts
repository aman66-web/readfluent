import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The native build behaves like an app, not a website in a frame (App Review 4.2): components/NativeChrome marks
 * <html> with data-native on the phone, and app/globals.css keys its app-only rules to that mark. The website must
 * never get them, and the places where text is meant to be selected (fields, a book's page text, the legal pages)
 * must keep it. Two things can break that without any build failing: a rule written without the mark, and markup the
 * exceptions are keyed to being renamed. Both are checked here.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const cap = vi.hoisted(() => ({ native: true, platform: "ios", statusBar: true, setStyle: vi.fn(() => Promise.resolve()) }));
const effects = vi.hoisted(() => ({ cleanups: [] as Array<void | (() => void)> }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (fn: () => void | (() => void)) => { effects.cleanups.push(fn()); },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => cap.native,
    getPlatform: () => (cap.native ? cap.platform : "web"),
    isPluginAvailable: (name: string) => name === "StatusBar" && cap.statusBar,
  },
}));
vi.mock("@capacitor/status-bar", () => ({ StatusBar: { setStyle: cap.setStyle }, Style: { Light: "LIGHT", Dark: "DARK" } }));

import { NativeChrome } from "@/components/NativeChrome";

function fakeHtml() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (k: string, v: string) => { attrs.set(k, String(v)); },
    removeAttribute: (k: string) => { attrs.delete(k); },
    getAttribute: (k: string) => attrs.get(k) ?? null,
  };
}

describe("NativeChrome", () => {
  let html: ReturnType<typeof fakeHtml>;
  beforeEach(() => {
    html = fakeHtml();
    vi.stubGlobal("document", { documentElement: html });
    effects.cleanups = [];
    cap.setStyle.mockClear();
    Object.assign(cap, { native: true, platform: "ios", statusBar: true });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("marks <html> with the platform in the iPhone app and sets dark status-bar text", () => {
    expect(NativeChrome()).toBeNull();
    expect(html.getAttribute("data-native")).toBe("ios");
    expect(cap.setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
  });

  it("marks <html> on Android too", () => {
    cap.platform = "android";
    NativeChrome();
    expect(html.getAttribute("data-native")).toBe("android");
  });

  it("leaves the website alone: no mark, no plugin call", () => {
    cap.native = false;
    NativeChrome();
    expect(html.attrs.size).toBe(0);
    expect(cap.setStyle).not.toHaveBeenCalled();
  });

  it("still marks <html> in an older build without the status-bar plugin", () => {
    cap.statusBar = false;
    NativeChrome();
    expect(html.getAttribute("data-native")).toBe("ios");
    expect(cap.setStyle).not.toHaveBeenCalled();
  });

  it("takes the mark away again when it unmounts (React's development double mount)", () => {
    NativeChrome();
    const cleanup = effects.cleanups[0];
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
    expect(html.getAttribute("data-native")).toBeNull();
  });

  it("is mounted once, in the root layout", () => {
    expect(read("app/layout.tsx")).toMatch(/<NativeChrome \/>/);
  });
});

/** The rules in the `@layer base { … }` under the "Inside the native app" heading (and nothing after its closing
 *  brace, which other blocks may follow), comments removed, as [selector list, declarations] pairs. */
function nativeRules(): Array<[string[], string]> {
  const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, (c) => (c.includes("Inside the native app") ? "/*NATIVE*/" : ""));
  const at = css.indexOf("/*NATIVE*/");
  expect(at, "the native block's heading in app/globals.css").toBeGreaterThan(0);
  const open = css.indexOf("@layer base {", at) + "@layer base {".length;
  let end = open;
  for (let depth = 1; depth > 0 && end < css.length; end++) depth += css[end] === "{" ? 1 : css[end] === "}" ? -1 : 0;
  const block = css.slice(open, end - 1);
  const rules: Array<[string[], string]> = [];
  for (const m of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // Split the selector list on top-level commas only, not the ones inside :is() and :where().
    const selectors: string[] = [];
    let depth = 0, cur = "";
    for (const ch of m[1]) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) { selectors.push(cur.trim()); cur = ""; } else cur += ch;
    }
    selectors.push(cur.trim());
    rules.push([selectors.map((s) => s.replace(/\s+/g, " ")), m[2]]);
  }
  return rules;
}

describe("app/globals.css, inside the native app", () => {
  const rules = nativeRules();
  const declared = (selector: string) => rules.filter(([sel]) => sel.some((s) => s.includes(selector))).map(([, d]) => d).join(";");

  it("has its rules", () => {
    expect(rules.length).toBeGreaterThanOrEqual(6);
  });

  it("only ever applies inside the native app, never to the website", () => {
    for (const [selectors] of rules) {
      for (const s of selectors) expect(s, s).toMatch(/^html\[data-native\](?=$|[\s:[])/);
    }
  });

  it("stops the page itself bouncing, and leaves scrolling alone", () => {
    const page = rules.filter(([sel]) => sel.includes("html[data-native]") && sel.includes("html[data-native] body")).map(([, d]) => d).join(";");
    expect(page).toMatch(/overscroll-behavior:\s*none/);
    for (const [, d] of rules) expect(d).not.toMatch(/(^|[;\s])overflow(-[xy])?\s*:/);
  });

  it("selects no text anywhere by default (cards, hints, headings), as a native app's labels", () => {
    const body = rules.filter(([sel]) => sel.length === 1 && sel[0] === "html[data-native] body").map(([, d]) => d).join(";");
    expect(body).toMatch(/-webkit-user-select:\s*none/);
    expect(body).toMatch(/(^|[;\s])user-select:\s*none/);
  });

  it("stops the long-press preview, callout and selection on controls, links and pictures", () => {
    const chrome = rules.find(([sel]) => sel.some((s) => s.includes(":where(a, button")));
    expect(chrome, "the controls rule").toBeTruthy();
    const [[sel], d] = chrome!;
    for (const el of ["a", "button", '[role="button"]', '[role="tab"]', "label", "nav", "h1", "h2", "img"]) expect(sel).toContain(el);
    expect(d).toMatch(/-webkit-touch-callout:\s*none/);
    expect(d).toMatch(/-webkit-user-select:\s*none/);
    expect(d).toMatch(/(^|[;\s])user-select:\s*none/);
  });

  it("keeps selection in fields, a book's page text and the legal pages", () => {
    for (const where of [":is(input, textarea, select)", '[contenteditable]', 'section[aria-roledescription="page"] p *', "html[data-native] article *"]) {
      const d = declared(where);
      expect(d, where).toMatch(/-webkit-user-select:\s*text/);
      expect(d, where).toMatch(/(^|[;\s])user-select:\s*text/);
    }
  });

  it("is keyed to markup that is still there", () => {
    // The reader's page sections, whose text (tappable words included) stays selectable.
    expect(read("components/Reader.tsx")).toMatch(/<section [^>]*aria-roledescription="page"/);
    // The privacy policy, terms and support pages are an <article>.
    expect(read("components/LegalDoc.tsx")).toMatch(/<article\b/);
  });
});
