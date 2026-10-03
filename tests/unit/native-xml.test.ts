import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * XML forbids "--" inside a comment, and the Android resource compiler refuses the file: the first Android build
 * failed on `app/globals.css --background` in a comment, three days after the file was written, because nothing
 * checks these files until Gradle runs on a machine with the Android SDK.
 */
const root = process.cwd();
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "build" || name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(xml|plist|storyboard)$/.test(name)) out.push(p);
  }
  return out;
}
const files = [...walk(join(root, "android")), ...walk(join(root, "ios"))];

describe("native XML files", () => {
  it("finds the files it is meant to check", () => {
    expect(files.some((f) => f.endsWith("ic_launcher_background.xml"))).toBe(true);
  });

  it("has no '--' inside any comment", () => {
    for (const f of files) {
      for (const m of readFileSync(f, "utf8").matchAll(/<!--([\s\S]*?)-->/g)) {
        expect(m[1].includes("--") || m[1].endsWith("-"), `${f.slice(root.length + 1)}: ${m[1].trim().slice(0, 50)}`).toBe(false);
      }
    }
  });
});
