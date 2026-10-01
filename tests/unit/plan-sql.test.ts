import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The migration that stands between a devtools console and the paid plan.
 *
 * These are textual checks, which is the weaker kind, so each one guards a
 * property that was actually got wrong and proved wrong against a real
 * PostgreSQL 16 with Supabase's default grants. `supabase/checks/plan_guard.sql`
 * is the strong version and answers the same questions about a live project.
 */
const sql = readFileSync(new URL("../../supabase/migrations/0002_plan.sql", import.meta.url), "utf8");

describe("the paid column's lock", () => {
  it("revokes the table-level right, not just the two columns", () => {
    // PostgreSQL: revoking a privilege from individual columns has no effect
    // while the role holds it on the whole table — and Supabase grants exactly
    // that to `authenticated` by default. The column-only form compiles, runs,
    // reports success, and leaves the column writable from any browser.
    expect(sql).toMatch(/revoke update on public\.users from anon, authenticated;/);
    expect(sql).not.toMatch(/revoke update \(plan[^)]*\) on public\.users/);
  });

  it("grants back only what a reader's own browser writes", () => {
    // Without this the revoke takes the reader's settings with it. A column
    // list rather than the table, so a column added later is not writable
    // until somebody says it is.
    expect(sql).toMatch(/grant update \(settings\) on public\.users to authenticated;/);
    expect(sql).not.toMatch(/grant update on public\.users/);
    for (const col of ["plan", "plan_until", "plan_product", "plan_period"]) {
      expect(sql).not.toMatch(new RegExp(`grant update \\([^)]*\\b${col}\\b`));
    }
  });
});

describe("the trigger behind it", () => {
  const fn = sql.slice(sql.indexOf("create or replace function public.users_plan_is_not_yours"),
                       sql.indexOf("drop trigger if exists users_plan_guard"));

  it("runs as the caller, or it can never fire", () => {
    // Under `security definer`, current_user is the function's owner on every
    // call, so the test below would be false for everybody — including the
    // reader it exists to stop.
    expect(fn).not.toContain("security definer");
    expect(fn).toContain("current_user");
  });

  it("does not key on a setting that is absent outside PostgREST", () => {
    // `request.jwt.claims` is set by PostgREST and by nothing else, so on a
    // direct connection it is unset and the guard reverts the service role and
    // the SQL editor as readily as a reader — silently, with UPDATE 1
    // reported. Proved: the hand-grant the code documents did nothing at all.
    expect(fn).not.toContain("request.jwt.claims");
  });

  it("lets the server and the database owner through, and nobody else", () => {
    expect(fn).toMatch(/current_user not in \('service_role', 'postgres', 'supabase_admin'\)/);
    // And what it does when it fires: the old values back, both columns.
    expect(fn).toContain("new.plan := old.plan;");
    expect(fn).toContain("new.plan_until := old.plan_until;");
    expect(fn).toContain("new.plan_product := old.plan_product;");
    expect(fn).toContain("new.plan_period := old.plan_period;");
  });
});

describe("the check anybody can run against a live project", () => {
  const check = readFileSync(new URL("../../supabase/checks/plan_guard.sql", import.meta.url), "utf8");

  it("changes nothing, because it is pasted into a real project's editor", () => {
    // Not a keyword hunt: the prose explains what went wrong so it is full of
    // those words, and the query itself asks about the 'update' privilege by
    // name. What makes it safe is the shape — one statement, and that
    // statement a select.
    const runs = check.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim();
    expect(runs).toMatch(/^select\b/i);
    expect(runs.split(";").filter((part) => part.trim())).toHaveLength(1);
  });

  it("asks all five questions", () => {
    for (const name of ["plan_locked", "until_locked", "settings_writable", "guard_present", "guard_runs_as_caller"]) {
      expect(check).toContain(name);
    }
  });
});
