import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The health route exists to be read by somebody who is stuck, which means it
 * is read by anybody who finds it. These are the two things that must stay
 * true of it: it never shows a value, and it never needs an account.
 */
const src = readFileSync(new URL("../../app/api/health/route.ts", import.meta.url), "utf8");

describe("the health route", () => {
  it("never puts a secret in the response", () => {
    // Every mention of a secret variable must be a presence check — `!process.env.X`
    // or `Boolean(...)` — and never the value itself reaching the JSON.
    for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
      for (const leak of [
        new RegExp(`${name}\\s*\\}`),                    // shorthand into an object
        new RegExp(`:\\s*process\\.env\\.${name}\\b`),   // assigned as a field
        new RegExp(`\\$\\{process\\.env\\.${name}`),     // interpolated into a string
        new RegExp(`slice\\([^)]*\\).*${name}`),         // a "safe" prefix, which is not safe
      ]) {
        expect(leak.test(src), `${name} may be leaking: ${leak}`).toBe(false);
      }
    }
  });

  it("works without an account, because sign-in may be the broken thing", () => {
    expect(src).not.toMatch(/return\s+json\(401/);
  });

  it("is never cached, so it reports this server now", () => {
    expect(src).toContain('export const dynamic = "force-dynamic"');
  });

  it("names every variable the database needs, and only those", () => {
    // If the database env grows a requirement and this page does not, it starts
    // lying by omission — reporting nothing missing while a route still
    // refuses. A variable with a `??` fallback is not a requirement and must
    // NOT be listed, or setup gets extra things to worry about that do not matter.
    const gate = readFileSync(new URL("../../lib/db/env.ts", import.meta.url), "utf8");
    const required = new Set<string>();
    for (const line of gate.split("\n")) {
      for (const m of line.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        // `process.env.X ?? "default"` — optional, and the default is the answer.
        if (new RegExp(`process\\.env\\.${m[1]}\\s*\\?\\?`).test(line)) continue;
        required.add(m[1]);
      }
    }
    expect([...required].sort()).toEqual([
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
    for (const name of required) {
      expect(src, `${name} is required but not reported`).toContain(name);
    }
  });
});

describe("the shape checks", () => {
  it("still never prints a value, only a judgement about one", () => {
    // The shape block reads the secrets, which is exactly where a leak would
    // get in. Every message about them must be a fixed string.
    const block = src.slice(src.indexOf("const wrongShape"), src.indexOf("return NextResponse.json"));
    expect(block).not.toMatch(/\$\{\s*(anon|svcKey|url)\b/);
    expect(block).not.toMatch(/\+\s*(anon|svcKey)\b/);
  });

  it("shouts if the anon key and the service key are the same string", () => {
    // The one mistake here that is a security incident rather than an outage:
    // NEXT_PUBLIC_ compiles its value into the JavaScript every visitor gets,
    // so the service role key pasted into that box is published to the world.
    expect(src).toContain("anonIsTheServiceKey");
    expect(src).toMatch(/DANGER[^"]*service role key/);
    expect(src).toMatch(/Rotate it/);
  });

  it("does not call itself ok while a value is the wrong shape", () => {
    expect(src).toContain("ok: service && !wrongShape.length");
  });
});

describe("what a wrong value tells you", () => {
  it("says what the value should look like, not only that it is wrong", () => {
    // "NEXT_PUBLIC_SUPABASE_URL is not a URL" is true and useless: it names the
    // fault and not the fix, which leaves somebody guessing at the one thing
    // standing between them and a working app.
    expect(src).toContain("https://YOUR-PROJECT.supabase.co");
    expect(src).toMatch(/anon \/ public/);
    expect(src).toMatch(/service_role \/ secret/);
    expect(src).toMatch(/Re-paste it/);
  });
});

describe("the browser-side health page", () => {
  const page = readFileSync(new URL("../../app/health/page.tsx", import.meta.url), "utf8");

  it("shows only public values, never a key", () => {
    // It runs in the browser, so anything it renders is visible to anyone. The
    // project host is already public; the keys are not all public and none of
    // them belongs on a page.
    expect(page).not.toContain("ANON_KEY");
    expect(page).not.toContain("SERVICE_ROLE");
    // The URL is shown as a host only, so a stray query or credential in it
    // cannot be rendered.
    expect(page).toContain("new URL(url).host");
  });

  it("reports what the bundle believes, not what the server does", () => {
    // The whole point: dbConfigured() evaluated in client code reads what was
    // compiled in, which is the value /api/health cannot see.
    expect(page).toContain('"use client"');
    expect(page).toContain("dbConfigured()");
  });

  it("can actually clear the thing that causes the disagreement", () => {
    expect(page).toContain("getRegistrations");
    expect(page).toContain("unregister");
    expect(page).toContain("caches.delete");
    expect(page).toContain("location.reload");
  });

  it("promises not to touch the reader's work or downloads, and does not", () => {
    // Clearing caches must never reach localStorage or IndexedDB, where
    // progress and flashcards live, nor a downloaded version's own cache
    // bucket (readfluent-dl-…, public/sw.js), which is the reader's.
    expect(page).not.toMatch(/localStorage|indexedDB|\.clear\(\)/);
    expect(page).toContain("`${CACHE_PREFIX}dl-`");
    // Collapsed, because JSX wraps prose across lines and a test that cares
    // where the line breaks fall fails on reformatting rather than on meaning.
    expect(page.replace(/\s+/g, " ")).toContain("reading progress and anything you&apos;ve downloaded are not touched");
  });
});
