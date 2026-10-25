import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// Google signs somebody straight in with the one Google account already on the phone. Asking for the account choice
// every time (prompt=select_account) is what stops that; Apple has no such setting and gets none.

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web", isPluginAvailable: () => false },
}));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) } }));
vi.mock("@capacitor/browser", () => ({
  Browser: { open: vi.fn(), close: vi.fn(), addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) },
}));
vi.mock("@/lib/db/client", () => ({ createClient: () => ({ auth: {} }) }));

describe("Google asks which account to use", () => {
  it("asks Google to show the account choice every time", async () => {
    const { googleAccountChoice } = await import("@/lib/auth/native");
    expect(googleAccountChoice("google")).toEqual({ queryParams: { prompt: "select_account" } });
  });

  it("does not change Apple's sign-in", async () => {
    const { googleAccountChoice } = await import("@/lib/auth/native");
    expect(googleAccountChoice("apple")).toEqual({});
  });

  it("is not offered inside the phone app for now (the website keeps it)", () => {
    const signIn = readFileSync("components/onboarding/SignIn.tsx", "utf8");
    expect(signIn).toContain('native ? allProviders.filter((p) => p !== "google") : allProviders');
  });
});
