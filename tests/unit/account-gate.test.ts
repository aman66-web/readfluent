import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clampStep, isRealAccount, needsAccount, signInRedirect } from "@/lib/auth/gate";
import { EN } from "@/lib/i18n/en";
import { STEP_IDS } from "@/lib/onboarding/steps";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("which pages need an account", () => {
  it("opens only the first run and the legal and health pages", () => {
    for (const p of ["/welcome", "/privacy", "/terms", "/support", "/offline", "/health", "/welcome/x"]) expect(needsAccount(p), p).toBe(false);
  });
  it("shuts every other page, including the front door, the library, books, the reader and the paywall", () => {
    for (const p of ["/", "/library", "/book/rome", "/read/rome/a1a2/50", "/recall", "/recall/talk", "/me", "/friends", "/paywall", "/placement", "/languages", "/mine", "/welcomeback", "/privacyx"]) expect(needsAccount(p), p).toBe(true);
  });
});

describe("what counts as signed in", () => {
  it("is a real account only: not nobody, not the anonymous session", () => {
    expect(isRealAccount(null)).toBe(false);
    expect(isRealAccount(undefined)).toBe(false);
    expect(isRealAccount({ is_anonymous: true })).toBe(false);
    expect(isRealAccount({ is_anonymous: false })).toBe(true);
    expect(isRealAccount({})).toBe(true);
  });
});

describe("where somebody without an account is sent", () => {
  it("starts the first run for a new device, and lands on the sign-in for one that has been through it", () => {
    expect(signInRedirect(false)).toBe("/welcome");
    expect(signInRedirect(true)).toBe("/welcome?step=account");
  });
});

describe("the first run's steps past the sign-in", () => {
  const account = STEP_IDS.indexOf("account");
  it("only open with an account: a link, Forward or a half-finished run lands on the sign-in", () => {
    for (const id of ["interests", "heard", "ready"] as const) expect(clampStep(STEP_IDS.indexOf(id), account, false), id).toBe(account);
    expect(clampStep(STEP_IDS.indexOf("ready"), account, true)).toBe(STEP_IDS.indexOf("ready"));
  });
  it("leave the steps up to the sign-in alone", () => {
    for (let n = 0; n <= account; n++) expect(clampStep(n, account, false)).toBe(n);
  });
});

describe("there is no way past the sign-in", () => {
  it("has no 'Not now' on the sign-in, in the code or in the text", () => {
    const signIn = read("components/onboarding/SignIn.tsx");
    expect(signIn).not.toContain("notNow");
    expect(signIn).not.toContain("onSkip");
    expect("account.notNow" in EN).toBe(false);
  });
  it("is enforced by the proxy for pages and by a guard in the browser", () => {
    const proxy = read("proxy.ts");
    expect(proxy).toContain("needsAccount(pathname)");
    expect(proxy).toContain("isRealAccount(refreshed.user)");
    expect(read("app/layout.tsx")).toContain("<AccountGate />");
  });
  it("makes no anonymous session for a page that needs an account", () => {
    expect(read("proxy.ts")).toContain("!user && !gated &&");
  });
  it("does not end the first run without an account", () => {
    expect(read("components/welcome/Welcome.tsx")).toContain('if (accountRef.current === "no") { go(ACCOUNT_STEP); return; }');
  });
  it("sends a failed provider sign-in back to the sign-in, not to a page that would bounce it", () => {
    expect(read("lib/auth/next.ts")).toContain('"/welcome?step=account&error=auth"');
  });
  it("no longer says an account is optional", () => {
    const text = [read("components/PrivacyPolicy.tsx"), read("app/support/page.tsx"), ...Object.entries(EN).filter(([k]) => /^(account|notice|privacy)\./.test(k) && k !== "account.off").map(([, v]) => String(v))].join("\n").toLowerCase();
    for (const bad of ["without an account", "without a account", "optional", "no account", "never create an account", "carry on without"]) expect(text, bad).not.toContain(bad);
  });
});
