import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Nothing of the app this project's engineering came from may ship (SPEC.md §6,
 * CLAUDE.md). A grep run once at M0 would rot; this runs on every commit.
 *
 * The documents that explain where the template came from (SPEC, DECISIONS,
 * CLAUDE) and this file are the only places the old name may appear.
 */
const FORBIDDEN = [
  /mental ?stint/i,
  /mental_stint/i,
  /\blumen\b/i,
  /\brevise\./i, // the old storage-key prefix, "revise.decks.v1"
  /revise-rho/i, // its deployment
  /amanmarwaha\.MentalStint/i,
  /958686863478/, // its Google OAuth project
  /S7G6ZHHK59/, // the Apple team id its iOS project was signed with; each app picks its own in Xcode
  /imprint/i, // a competitor the template's comments once named
];

const ALLOWED = new Set(["SPEC.md", "DECISIONS.md", "CLAUDE.md", "tests/unit/identity.test.ts"]);
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "coverage", "out", "build", ".vercel"]);
const SKIP_FILES = new Set(["package-lock.json"]);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|css|html|sql|sh|yml|yaml|xml|plist|gradle|java|swift|properties|xcconfig|pbxproj|storyboard|svg|txt|webmanifest|example)$|(^|\/)\.[a-z]+(ignore|example)$|(^|\/)\.env\.example$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (!SKIP_FILES.has(name)) out.push(full);
  }
  return out;
}

describe("the app has its own identity", () => {
  const root = process.cwd();
  const files = walk(root).map((f) => relative(root, f).split(sep).join("/")).filter((f) => TEXT.test(f) && !ALLOWED.has(f));

  it("finds files to check", () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files).toContain("lib/brand.ts");
    expect(files).toContain("public/sw.js");
  });

  it("carries no trace of the template's name, domains, keys or storage prefix", () => {
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(join(root, f), "utf8");
      for (const re of FORBIDDEN) {
        const m = re.exec(text);
        if (m) hits.push(`${f}: ${m[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
