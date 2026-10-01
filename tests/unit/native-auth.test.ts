import { describe, expect, it, vi } from "vitest";

/**
 * The deep-link parsing in lib/auth/native.ts, tested at the level that
 * actually matters: given the URL iOS hands the app, does it build the exact
 * /auth/callback request the web flow already knows how to answer.
 *
 * The module reaches for @capacitor/app and @capacitor/browser, both mocked:
 * this is not a test of Capacitor, it is a test of what this app does with
 * what Capacitor hands it. Capacitor.isNativePlatform is mocked true so the
 * listener actually installs — false is the whole rest of the test suite,
 * which imports the same module by way of app/layout.tsx and never sees a
 * mock at all, which is its own coverage that the branch is silent on the web.
 */

let handler: ((data: { url: string }) => void) | null = null;
const removeSpy = vi.fn();
const closeSpy = vi.fn().mockResolvedValue(undefined);

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((_event: string, cb: (data: { url: string }) => void) => {
      handler = cb;
      return Promise.resolve({ remove: removeSpy });
    }),
  },
}));
vi.mock("@capacitor/browser", () => ({ Browser: { open: vi.fn(), close: closeSpy } }));

describe("the deep link back from a native sign-in", () => {
  it("turns readfluent://auth/callback?code=…&next=… into the real /auth/callback request", async () => {
    const { listenForNativeAuth } = await import("@/lib/auth/native");
    (globalThis as { window?: unknown }).window = { location: { origin: "https://readfluent.example", href: "" } };

    const stop = listenForNativeAuth();
    expect(handler).toBeTruthy();

    handler!({ url: "readfluent://auth/callback?code=abc123&next=%2Flibrary" });
    // The system browser sheet is dismissed before anything else — a sign-in
    // that landed should not leave its own browser sitting on top.
    expect(closeSpy).toHaveBeenCalled();
    expect(window.location.href).toBe("https://readfluent.example/auth/callback?code=abc123&next=%2Flibrary");

    stop();
    await Promise.resolve();
    expect(removeSpy).toHaveBeenCalled();
  });

  it("ignores a deep link with no code, rather than navigating to a callback with nothing to exchange", async () => {
    const { listenForNativeAuth } = await import("@/lib/auth/native");
    (globalThis as { window?: unknown }).window = { location: { origin: "https://readfluent.example", href: "https://readfluent.example/" } };
    listenForNativeAuth();
    handler!({ url: "readfluent://auth/callback?next=%2Flibrary" });
    expect(window.location.href).toBe("https://readfluent.example/");
  });

  it("ignores a deep link on some other scheme, so a share-sheet or another app's link is never treated as a sign-in", async () => {
    const { listenForNativeAuth } = await import("@/lib/auth/native");
    (globalThis as { window?: unknown }).window = { location: { origin: "https://readfluent.example", href: "https://readfluent.example/" } };
    listenForNativeAuth();
    handler!({ url: "https://example.com/auth/callback?code=abc123" });
    expect(window.location.href).toBe("https://readfluent.example/");
  });

  it("defaults next to Today when the deep link carries none", async () => {
    const { listenForNativeAuth } = await import("@/lib/auth/native");
    (globalThis as { window?: unknown }).window = { location: { origin: "https://readfluent.example", href: "" } };
    listenForNativeAuth();
    handler!({ url: "readfluent://auth/callback?code=abc123" });
    expect(window.location.href).toBe("https://readfluent.example/auth/callback?code=abc123&next=%2F");
  });
});
