import { describe, expect, it } from "vitest";
import { APP_NAME, APP_SCHEME, BUNDLE_ID, CACHE_PREFIX, STORAGE_PREFIX, TAGLINE, storageKey } from "@/lib/brand";

const layout = () => import("@/app/layout");
const manifest = () => import("@/app/manifest");

describe("the brand", () => {
  it("is one name and one line", () => {
    expect(APP_NAME).toBe("ReadFluent");
    expect(TAGLINE).toBe("Real books. Your level.");
  });

  it("names the app in the layout's metadata from the constants", async () => {
    const { metadata } = await layout();
    expect(metadata.title).toBe(APP_NAME);
    expect(metadata.applicationName).toBe(APP_NAME);
    expect(metadata.description).toBe(TAGLINE);
    expect(metadata.appleWebApp).toMatchObject({ title: APP_NAME });
  });

  it("names the installable app in the manifest from the constants", async () => {
    const m = (await manifest()).default();
    expect(m.name).toBe(APP_NAME);
    expect(m.short_name).toBe(APP_NAME);
    expect(m.description).toBe(TAGLINE);
  });

  it("builds every storage key from one prefix", () => {
    expect(STORAGE_PREFIX).toBe("readfluent.");
    expect(storageKey("plan")).toBe("readfluent.plan.v1");
    expect(storageKey("progress", 3)).toBe("readfluent.progress.v3");
  });

  it("is shaped the way the stores expect", () => {
    expect(BUNDLE_ID).toMatch(/^[a-z]+(\.[A-Za-z0-9]+){2,}$/);
    expect(APP_SCHEME).toMatch(/^[a-z][a-z0-9]*$/);
    expect(CACHE_PREFIX).toBe("readfluent-");
  });
});
