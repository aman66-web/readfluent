import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EN } from "@/lib/i18n/en";
import { LANGUAGES } from "@/lib/onboarding/languages";

/**
 * What App Review met on the sign-in step and the subscription screen: a closed Apple sheet says nothing while
 * a failed one says so, a browser sign-in that ends without signing in frees its button, the Terms line links
 * both pages in every language, and the legal links open over the screen instead of under it.
 *
 * Capacitor is mocked as an Android phone (no Apple or Google sheet), so Google goes through the browser flow.
 */

let urlOpen: ((data: { url: string }) => void) | null = null;
let browserFinished: (() => void) | null = null;
const browser = {
  open: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  addListener: vi.fn((_event: string, cb: () => void) => { browserFinished = cb; return Promise.resolve({ remove: vi.fn() }); }),
};
const pluginAvailable = vi.fn<(name: string) => boolean>(() => true);

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android", isPluginAvailable: (n: string) => pluginAvailable(n) } }));
vi.mock("@capacitor/app", () => ({
  App: { addListener: vi.fn((_e: string, cb: (data: { url: string }) => void) => { urlOpen = cb; return Promise.resolve({ remove: vi.fn() }); }) },
}));
vi.mock("@capacitor/browser", () => ({ Browser: browser }));
vi.mock("@/lib/db/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: "https://auth.example/authorize" }, error: null }) } }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  browser.open.mockClear();
  browserFinished = null;
  (globalThis as { window?: unknown }).window = {
    location: { origin: "https://readfluent.example", href: "https://readfluent.example/welcome?step=account", assign: vi.fn() },
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    open: vi.fn(() => ({ opener: {} })),
  };
});
afterEach(() => { vi.useRealTimers(); });

/** Whether a promise has settled yet, without waiting for it. */
async function settled<T>(p: Promise<T>): Promise<{ done: boolean; value?: T }> {
  const out: { done: boolean; value?: T } = { done: false };
  void p.then((value) => { out.done = true; out.value = value; });
  await vi.advanceTimersByTimeAsync(0);
  return out;
}

describe("a native sheet that is closed, or fails", () => {
  it("says nothing when it was closed", async () => {
    const { sheetCancelled } = await import("@/lib/auth/native");
    expect(sheetCancelled(new Error("The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)"))).toBe(true);
    // The sentence is in the phone's language; the domain and code are not.
    expect(sheetCancelled(new Error("Der Vorgang konnte nicht abgeschlossen werden. (com.apple.AuthenticationServices.AuthorizationError Fehler 1001.)"))).toBe(true);
    expect(sheetCancelled(Object.assign(new Error("Abgebrochen"), { code: "USER_CANCELLED" }))).toBe(true);
    expect(sheetCancelled(new Error("The user canceled the sign-in flow."))).toBe(true);
  });

  it("is a failure for anything else", async () => {
    const { sheetCancelled } = await import("@/lib/auth/native");
    expect(sheetCancelled(new Error("The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1000.)"))).toBe(false);
    expect(sheetCancelled(new Error("sign-in timed out"))).toBe(false);
    expect(sheetCancelled("Unacceptable audience in id_token")).toBe(false);
    expect(sheetCancelled(undefined)).toBe(false);
  });
});

describe("a browser sign-in that ends without signing in", () => {
  it("frees the button when the browser is closed", async () => {
    const { listenForNativeAuth, signInNative, SIGN_IN_CANCELLED } = await import("@/lib/auth/native");
    listenForNativeAuth();
    const ended = signInNative("google", "/");
    await vi.advanceTimersByTimeAsync(0);
    expect(browser.open).toHaveBeenCalledWith({ url: "https://auth.example/authorize" });
    expect((await settled(ended)).done).toBe(false);
    browserFinished!();
    await vi.advanceTimersByTimeAsync(1000);
    expect(await ended).toBe(SIGN_IN_CANCELLED);
  });

  it("gives the reason when the provider sends them back with an error", async () => {
    const { listenForNativeAuth, signInNative } = await import("@/lib/auth/native");
    listenForNativeAuth();
    const ended = signInNative("google", "/");
    await vi.advanceTimersByTimeAsync(0);
    urlOpen!({ url: "readfluent://auth/callback?error=server_error&error_description=Unable+to+exchange+external+code" });
    expect(await ended).toBe("server_error: Unable to exchange external code");
    expect(window.location.href).toBe("https://readfluent.example/welcome?step=account");
  });

  it("says nothing when they said no at the provider", async () => {
    const { listenForNativeAuth, signInNative, SIGN_IN_CANCELLED } = await import("@/lib/auth/native");
    listenForNativeAuth();
    const ended = signInNative("google", "/");
    await vi.advanceTimersByTimeAsync(0);
    urlOpen!({ url: "readfluent://auth/callback#error=access_denied&error_description=The+user+denied+the+request" });
    expect(await ended).toBe(SIGN_IN_CANCELLED);
  });

  it("is a failure when Supabase itself refused, even as access_denied (a banned account)", async () => {
    const { listenForNativeAuth, signInNative } = await import("@/lib/auth/native");
    listenForNativeAuth();
    const ended = signInNative("google", "/");
    await vi.advanceTimersByTimeAsync(0);
    urlOpen!({ url: "readfluent://auth/callback?error=access_denied&error_code=user_banned&error_description=User+is+banned" });
    expect(await ended).toBe("access_denied: User is banned");
  });

  it("still lands a sign-in that worked, and the browser closing then frees nothing", async () => {
    const { listenForNativeAuth, signInNative } = await import("@/lib/auth/native");
    listenForNativeAuth();
    const ended = signInNative("google", "/library");
    await vi.advanceTimersByTimeAsync(0);
    urlOpen!({ url: "readfluent://auth/callback?code=abc123&next=%2Flibrary" });
    expect(window.location.href).toBe("https://readfluent.example/auth/callback?code=abc123&next=%2Flibrary");
    browserFinished!();
    await vi.advanceTimersByTimeAsync(1000);
    expect((await settled(ended)).done).toBe(false);
  });
});

describe("the Terms line under the sign-in buttons", () => {
  const tags = (s: string) => [...s.matchAll(/<\/?[a-z]+>/g)].map((m) => m[0]);
  const linked = (s: string) => [...s.matchAll(/<(terms|privacy)>([\s\S]*?)<\/\1>/g)].map((m) => [m[1], m[2].trim()]);

  it("links the Terms and the Privacy Policy, once each, in every language", async () => {
    for (const { code } of LANGUAGES) {
      const text = code === "en" ? EN["account.agree"] : ((await import(`../../lib/i18n/messages/${code}.ts`)).default as Record<string, string>)["account.agree"];
      expect(tags(text), code).toEqual(["<terms>", "</terms>", "<privacy>", "</privacy>"]);
      const parts = linked(text);
      expect(parts.map(([tag]) => tag), code).toEqual(["terms", "privacy"]);
      for (const [, words] of parts) expect(words.length, code).toBeGreaterThan(0);
    }
  });
});

describe("the Terms and Privacy links", () => {
  it("open over the screen in the phone's browser sheet, at the app's own address", async () => {
    const { openOver } = await import("@/components/OverLink");
    openOver("/terms");
    expect(browser.open).toHaveBeenCalledWith({ url: "https://readfluent.example/terms" });
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("are followed rather than doing nothing when the sheet cannot open", async () => {
    const { openOver } = await import("@/components/OverLink");
    pluginAvailable.mockReturnValueOnce(false);
    openOver("/privacy");
    expect(window.location.assign).toHaveBeenCalledWith("https://readfluent.example/privacy");
    browser.open.mockRejectedValueOnce(new Error("no window"));
    openOver("/terms");
    await vi.advanceTimersByTimeAsync(0);
    expect(window.location.assign).toHaveBeenCalledWith("https://readfluent.example/terms");
  });

  it("ignore a second tap while the sheet is still opening, so the screen underneath never moves", async () => {
    const { openOver } = await import("@/components/OverLink");
    await vi.advanceTimersByTimeAsync(0);
    openOver("/terms");
    openOver("/privacy");
    expect(browser.open).toHaveBeenCalledTimes(1);
    expect(window.location.assign).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    openOver("/privacy");
    expect(browser.open).toHaveBeenCalledTimes(2);
  });

  it("carry the reader's language into the sheet, which has none of the app's storage", async () => {
    const { openOver } = await import("@/components/OverLink");
    vi.stubGlobal("document", { documentElement: { lang: "es" } });
    await vi.advanceTimersByTimeAsync(0);
    openOver("/privacy");
    expect(browser.open).toHaveBeenCalledWith({ url: "https://readfluent.example/privacy?hl=es" });
    vi.unstubAllGlobals();
  });
});

describe("the sign-in step, as it is drawn", () => {
  const draw = async (error: boolean) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://db.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("NEXT_PUBLIC_AUTH_GOOGLE", "1");
    vi.stubEnv("NEXT_PUBLIC_AUTH_APPLE", "1");
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { SignIn } = await import("@/components/onboarding/SignIn");
    return renderToStaticMarkup(createElement(SignIn, { error, onNext: () => {} }));
  };
  afterEach(() => { vi.unstubAllEnvs(); });

  it("says under the buttons that continuing agrees to the Terms and the Privacy Policy, both linked", async () => {
    const html = await draw(false);
    expect(html).toMatch(/By continuing, you agree to the <a [^>]*href="\/terms"[^>]*>Terms of Use<\/a> and <a [^>]*href="\/privacy"[^>]*>Privacy Policy<\/a>\./);
    expect(html.indexOf("Continue with Apple")).toBeGreaterThan(-1);
    expect(html.indexOf("Continue with Apple")).toBeLessThan(html.indexOf('href="/terms"'));
  });

  it("shows a sign-in that came back failed under the buttons, not above them", async () => {
    const html = await draw(true);
    const alert = html.search(/role="alert"[^>]*>Signing in didn/);
    expect(alert).toBeGreaterThan(-1);
    expect(html.indexOf("Continue with Apple")).toBeLessThan(alert);
  });
});
