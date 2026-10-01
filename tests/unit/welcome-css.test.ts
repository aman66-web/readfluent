import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every motion and style class the first run's screens use is defined in welcome.css. A
 * stylesheet edit once deleted a block of them with a nearby rule, and nothing failed: the
 * tour's phone lost its background and the bars stopped filling, and only a picture showed it.
 */
const root = process.cwd();
const css = readFileSync(join(root, "app/welcome/welcome.css"), "utf8") + readFileSync(join(root, "app/globals.css"), "utf8");
const PREFIXES = ["show-", "fx-", "fs-", "wel-", "future-", "pledge-", "ready-", "guide-", "gb-", "heard-", "bp-", "first-", "year-", "ob-", "lamp-", "level-", "chart-", "xp-", "shelf-", "lx-"];

function files(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(tsx|ts)$/.test(e.name) ? [join(dir, e.name)] : []);
}

describe("welcome.css", () => {
  it("defines every prefixed class the first run's components and pages use", () => {
    const used = new Set<string>();
    for (const f of [...files("components/onboarding"), ...files("components/welcome"), ...files("components/home"), ...files("components/placement"), ...files("components/mascot"), ...files("components/recall"), "app/welcome/page.tsx"]) {
      const src = readFileSync(join(root, f), "utf8");
      for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        for (const tok of (m[1] ?? m[2] ?? "").split(/\s+/)) {
          const name = tok.replace(/^[a-z-]+:/, "").replace(/\$\{.*$/, "");
          if (!name.endsWith("-") && /^[a-z][a-z0-9-]*$/.test(name) && PREFIXES.some((p) => name.startsWith(p))) used.add(name);
        }
      }
    }
    const missing = [...used].filter((c) => !new RegExp(`\\.${c}(?![a-z0-9-])`).test(css)).sort();
    expect(missing, `classes used but not defined: ${missing.join(", ")}`).toEqual([]);
    expect(used.size).toBeGreaterThan(20);
  });
});
