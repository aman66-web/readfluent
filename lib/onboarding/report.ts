import { createClient } from "@/lib/db/client";
import { dbConfigured } from "@/lib/db/env";
import { cleanHeardOther, type Answers } from "./answers";

/**
 * The answers, sent once as the run ends, so the owner can see who the app is
 * reaching and which languages to translate into first (public.events, name
 * "first_run"). Only the choices — never a typed word except the optional
 * "somewhere else". Never in the way: with no database configured, no session, or
 * no connection it does nothing, and a failure is swallowed.
 */
export function reportFirstRun(a: Answers, goalMinutes: number): void {
  if (!dbConfigured()) return;
  if (!a.focus.length && !a.heard && !a.scroll) return;
  const db = createClient();
  db.auth.getUser()
    .then(({ data }) => {
      if (!data.user) return;
      return db.from("events").insert({
        user_id: data.user.id,
        name: "first_run",
        props: {
          focus: a.focus,
          heard: a.heard,
          ...(a.heard === "other" && cleanHeardOther(a.heardOther) ? { heard_other: cleanHeardOther(a.heardOther) } : {}),
          scroll: a.scroll,
          goal: goalMinutes,
          language: a.language,
          learn: a.learn,
          level: a.level,
          placed: a.placed,
          interests: a.interests,
        },
      });
    })
    .catch(() => { /* not worth interrupting anybody over */ });
}
