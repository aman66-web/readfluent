import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A window whose localStorage can be told to refuse writes, as a private window does. */
function fakeStorage(refuse: () => boolean) {
  const data = new Map<string, string>();
  return {
    data,
    api: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (refuse()) throw new Error("quota");
        data.set(k, v);
      },
    },
  };
}

describe("local store when storage refuses writes", () => {
  let refuse = false;
  let store: ReturnType<typeof fakeStorage>;

  beforeEach(() => {
    vi.resetModules();
    refuse = false;
    store = fakeStorage(() => refuse);
    vi.stubGlobal("window", { localStorage: store.api, addEventListener() {}, removeEventListener() {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the value for the session and reports that it will not last", async () => {
    const { readRaw, writeRaw } = await import("@/lib/store/local");
    refuse = true;
    expect(writeRaw("k", "one")).toBe(false);
    expect(readRaw("k")).toBe("one");
    expect(writeRaw("k", "two")).toBe(false);
    expect(readRaw("k")).toBe("two");
  });

  it("prefers the newer refused value, then goes back to storage once it works", async () => {
    const { readRaw, writeRaw } = await import("@/lib/store/local");
    expect(writeRaw("k", "stored")).toBe(true);
    refuse = true;
    writeRaw("k", "newer");
    expect(readRaw("k")).toBe("newer");
    refuse = false;
    expect(writeRaw("k", "again")).toBe(true);
    expect(readRaw("k")).toBe("again");
    expect(store.data.get("k")).toBe("again");
  });
});
