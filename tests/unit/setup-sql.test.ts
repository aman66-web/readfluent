import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("supabase/setup.sql", () => {
  it("contains every migration, in order, unchanged", () => {
    const setup = readFileSync(join(root, "supabase/setup.sql"), "utf8");
    const files = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
    expect(files.length).toBeGreaterThan(0);
    let at = 0;
    for (const f of files) {
      const body = readFileSync(join(root, "supabase/migrations", f), "utf8");
      const found = setup.indexOf(body, at);
      expect(found, `${f} is missing or out of order - run scripts/build-setup-sql.sh`).toBeGreaterThanOrEqual(at);
      at = found + body.length;
    }
  });
});
