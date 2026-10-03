/**
 * The first run, as pure rules: which steps there are and in what order.
 *
 * Which language the app itself is in (so the rest can be read) → the welcome (a wall
 * of book covers) → Dewey says hello → Dewey says how quick it will be → Dewey celebrates and the run moves on by itself → which languages (the one you speak and the
 * one you want to learn) → how much of it you know (or a
 * five-minute test that finds out) → how much time a day they can give it → how
 * long that takes to reach each level → a three-screen tour → a promise → Dewey asks to be added to the home screen → sign in → what you are
 * curious about → where they heard of it → the library being set up. Every step after the welcome can be
 * skipped, and every one counts on the progress bar.
 *
 * Adapted from the first run of the app this one's engineering came from, with
 * its screens and its copy rewritten for reading.
 */
export const STEP_IDS = [
  "app", "intro", "hello", "quick", "go", "tongues", "level", "time", "path",
  "journey", "levels", "connect",
  "pledge", "home", "account", "interests", "heard", "ready",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/** The steps that ask the reader something before they are in the app. Dewey no longer says how many (the run also has a tour and more), so this is only a list. */
export const QUESTION_STEPS = ["tongues", "level", "heard", "time", "interests"] as const satisfies readonly StepId[];

/** Steps that play by themselves and move on: Back skips over them rather than landing on one that would run again. */
export const INTERLUDE_STEPS = ["go"] as const satisfies readonly StepId[];
export const isInterlude = (step: string): boolean => (INTERLUDE_STEPS as readonly string[]).includes(step);

/** The three tour screens, in order. */
export const SHOW_IDS = ["journey", "levels", "connect"] as const;
export type ShowId = (typeof SHOW_IDS)[number];

export const isShowStep = (step: string): step is ShowId => (SHOW_IDS as readonly string[]).includes(step);

/** The step `?step=` names, as an index into the list; the first step for anything else. */
export function stepIndex(param: string | null | undefined): number {
  const i = (STEP_IDS as readonly string[]).indexOf(param ?? "");
  return i >= 0 ? i : 0;
}

/** Where the run goes when it ends: the library, which is the front door. */
export const AFTER_ONBOARDING = "/";

/** Where a provider sign-in comes back to: the step after sign-in. Must name a step that exists. */
export const AFTER_SIGN_IN = "/welcome?step=interests&signedin=1";

/** The placement test opens from the level step, and comes back to the step after it (or to the level step if it is left). */
export const PLACEMENT_PATH = "/placement";
export const AFTER_PLACEMENT = "/welcome?step=ready&built=1";
export const BACK_FROM_PLACEMENT = "/welcome?step=ready&built=1";

/** Where a failed provider sign-in comes back to: the sign-in step itself. */
export const SIGN_IN_STEP = "/welcome?step=account";
