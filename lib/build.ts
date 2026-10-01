/**
 * Which build this is.
 *
 * Nothing on screen said which deploy a phone was looking at, and the cost of
 * that was two separate evenings of detective work: a change was pushed, the
 * app did not have it, and there was no way to tell whether the deploy had
 * failed, the browser was holding an old bundle, or the phone was on an
 * entirely different deployment URL. All three look identical from the outside.
 *
 * So the commit goes on the screen. `next.config.ts` reads it at build time —
 * from Vercel's own variable, or from git when building locally — and Next
 * compiles the value into the bundle. Whatever a browser shows here is, by
 * construction, the build that browser is running: it cannot be fetched, so a
 * cached bundle cannot report somebody else's answer.
 *
 * A commit is public information; this is a hash of a commit, not a secret.
 */

/** Seven characters of the commit this build came from, or "dev". */
export const BUILD: string = process.env.NEXT_PUBLIC_BUILD || "dev";

/** When it was built, `YYYY-MM-DD HH:MM` UTC, or "" when it is not known. */
export const BUILT_AT: string = process.env.NEXT_PUBLIC_BUILT_AT || "";

/** One line for a footer: the commit, and the day it was built if it is known. */
export const buildLine = (): string => (BUILT_AT ? `${BUILD} · ${BUILT_AT}` : BUILD);
