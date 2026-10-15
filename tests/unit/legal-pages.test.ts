import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EN } from "@/lib/i18n/en";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown } & Record<string, unknown>) => createElement("a", { href, ...rest }, children as never) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {} }), usePathname: () => "/privacy", useSearchParams: () => new URLSearchParams() }));

/** The page as a reader reads it: tags out, entities and spaces tidied. */
const text = (el: ReactElement) => renderToStaticMarkup(el)
  .replace(/<[^>]+>/g, " ").replace(/&#x27;|&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/&quot;|&ldquo;|&rdquo;/g, "\"").replace(/\s+/g, " ");

/** Opened from the iPhone subscription screen: no other platform or its store (App Review 2.3.10). */
const OTHER_PLATFORM = /google play|play store|android/i;
/** Things the app does not do (yet): saying so would be untrue (App Review 2.3.1, 5.1.1). */
const UNTRUE = /follow you to another phone|coming soon|synced|download a book|cloud/i;

const withTalk = (on: boolean) => {
  vi.stubEnv("ANTHROPIC_API_KEY", on ? "test-key" : "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
};

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("the privacy policy", () => {
  it("covers what Apple asks of it (5.1.1(i)): what, how, why, who else, how long, and how to delete", async () => {
    const { PrivacyPolicy } = await import("@/components/PrivacyPolicy");
    const t = text(createElement(PrivacyPolicy, { talk: false, translator: false }));
    for (const s of ["What stays on your phone", "What we collect and keep", "Why we use it", "Who else handles it", "How long we keep it", "Your choices and rights", "Withdraw your consent",
      "Supabase", "Vercel", "RevenueCat", "at least as well as this policy does", "Delete account", "top right of Home", "sign in with Google", "Apple", "App Store", "speech recognition", "ico.org.uk"]) {
      expect(t, s).toContain(s);
    }
    expect(t).not.toMatch(OTHER_PLATFORM);
    expect(t).not.toMatch(UNTRUE);
  });

  it("names Anthropic only when Talk is switched on", async () => {
    const { PrivacyPolicy } = await import("@/components/PrivacyPolicy");
    const off = text(createElement(PrivacyPolicy, { talk: false, translator: false }));
    const on = text(createElement(PrivacyPolicy, { talk: true, translator: false }));
    expect(off).not.toMatch(/anthropic|\btalk\b/i);
    expect(on).toContain("Anthropic");
    expect(on).toContain("Talking with Pluto");
    expect(on).not.toMatch(OTHER_PLATFORM);
  });

  it("mentions the server's translator only when it is switched on, and says only the book's text goes", async () => {
    const { PrivacyPolicy } = await import("@/components/PrivacyPolicy");
    expect(text(createElement(PrivacyPolicy, { talk: false, translator: false }))).not.toContain("Google’s translation service");
    expect(text(createElement(PrivacyPolicy, { talk: false, translator: true }))).toContain("only the book’s text is sent, never anything about you");
  });

  it("works out Talk from the server's environment when not told", async () => {
    withTalk(true);
    const { PrivacyPolicy } = await import("@/components/PrivacyPolicy");
    expect(text(createElement(PrivacyPolicy))).toContain("Anthropic");
  });

  it("has a short translated summary that no longer promises a copy on another phone", () => {
    expect(EN["privacy.p1"]).toContain("{app}");
    expect(EN["privacy.p1"]).toContain("not on our servers");
    expect(EN["privacy.p1"]).not.toMatch(/another phone|follow you/i);
    // Points go to the server for Friends, so the summary does not also say they never leave the device.
    expect(EN["privacy.p1"].split(".")[1]).not.toMatch(/points/i);
  });

  it("does not say what is on the phone is never sent, when Friends and the first answers are", async () => {
    const { PrivacyPolicy } = await import("@/components/PrivacyPolicy");
    const t = text(createElement(PrivacyPolicy, { talk: false, translator: false }));
    expect(t).toContain("apart from what the next section lists");
    expect(t).not.toMatch(/temporary session/i);
  });

  it("says the speaking questions are left out inside the app, where nothing can hear (lib/reading/listen.ts)", async () => {
    const { PrivacyPolicy } = await import("@/components/PrivacyPolicy");
    expect(text(createElement(PrivacyPolicy, { talk: false, translator: false }))).toContain("not inside the app on a phone");
    withTalk(false);
    const support = text(createElement((await import("@/app/support/page")).default));
    expect(support).toContain("Inside the app on a phone they are left out");
    expect(support).not.toMatch(/open Settings and find/);
  });
});

describe("the terms of use", () => {
  it("are store-neutral, with Apple's own rules and licence for the iPhone", async () => {
    withTalk(false);
    const { default: Terms } = await import("@/app/terms/page");
    const html = renderToStaticMarkup(createElement(Terms));
    const t = text(createElement(Terms));
    expect(t).not.toMatch(OTHER_PLATFORM);
    expect(t).not.toMatch(/\btalk\b/i);
    for (const s of ["auto-renewing", "at least 24 hours before the end of the current period", "app store you downloaded ReadFluent from", "Apple’s App Store", "Settings, tap your name, then Subscriptions", "does not cancel a subscription", "unused part of the trial"]) {
      expect(t, s).toContain(s);
    }
    expect(html).toContain("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
    expect(html).toContain('href="/privacy"');
    // The Back link is the device's call (below): the server's page has none, so a sheet or a store visitor never gets one to Profile.
    expect(html).not.toContain('href="/me"');
  });

  it("mention Talk when it is switched on", async () => {
    withTalk(true);
    const { default: Terms } = await import("@/app/terms/page");
    expect(text(createElement(Terms))).toContain("Talk");
  });
});

describe("the support page", () => {
  it("says how to cancel, restore and delete, truthfully and without naming another store", async () => {
    withTalk(false);
    const { default: Support } = await import("@/app/support/page");
    const t = text(createElement(Support));
    expect(t).not.toMatch(OTHER_PLATFORM);
    expect(t).not.toMatch(UNTRUE);
    for (const s of ["Settings, tap your name, then Subscriptions", "Restore purchases", "round button at the top right of Home", "Delete account", "do not move to another phone", "reportaproblem.apple.com"]) {
      expect(t, s).toContain(s);
    }
  });

  it("gives the support email when one is set, and the store listing when not", async () => {
    withTalk(false);
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "");
    const none = text(createElement((await import("@/app/support/page")).default));
    expect(none).toContain("the app store you downloaded it from");
    expect(none).not.toMatch(/Use Report/);

    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "help@example.com");
    const html = renderToStaticMarkup(createElement((await import("@/app/support/page")).default));
    expect(html).toContain('href="mailto:help@example.com"');
    expect(html).toContain("Use Report");
  });
});

describe("the way back from a legal page", () => {
  const nav = (stack: string[]) => vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify({ stack, pos: stack.length - 1 }), setItem() {} });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("is there inside the app, which has no Back of its own", async () => {
    vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => true } });
    nav(["/terms"]);
    const { hasWayBack } = await import("@/components/PrivacyView");
    expect(hasWayBack()).toBe(true);
  });

  it("is there in a browser that came from another page of the app", async () => {
    vi.stubGlobal("window", {});
    nav(["/me", "/terms"]);
    const { hasWayBack } = await import("@/components/PrivacyView");
    expect(hasWayBack()).toBe(true);
  });

  it("is not there in the sheet the subscription screen opens, or for a visitor from a store listing", async () => {
    vi.stubGlobal("window", {});
    nav(["/terms"]);
    const { hasWayBack } = await import("@/components/PrivacyView");
    expect(hasWayBack()).toBe(false);
  });
});
