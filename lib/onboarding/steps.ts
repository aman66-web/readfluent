/**
 * The first run, as pure rules: which steps there are and in what order.
 *
 * Which language the app itself is in (so the rest can be read) → the welcome (a wall
 * of book covers) → Dewey says hello → Dewey says how quick it will be → Dewey celebrates and the run moves on by itself → which languages (the one you speak and the
 * one you want to learn) → how much of it you know (or a
 * five-minute test that finds out) → why they are learning → where they
 * heard of it → how much time a day they can give it → how
 * long that takes to reach each level → a five-screen tour → a promise → Dewey asks to be added to the home screen → Dewey shows what three months of it adds up to → sign in → what you are
 * curious about → the library being set up. Every step after the welcome can be
 * skipped, and every one counts on the progress bar.
 *
 * Adapted from the first run of the app this one's engineering came from, with
 * its screens and its copy rewritten for reading.
 */
export const STEP_IDS = [
  "app", "intro", "hello", "quick", "go", "tongues", "level", "why", "heard", "time", "path",
  "journey", "levels", "words", "remember", "connect",
  "pledge", "home", "account", "interests", "ready",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/** The steps that ask the reader something before they are in the app. Dewey says how many ("just 6 quick questions"), so the number is counted here, not written. */
export const QUESTION_STEPS = ["tongues", "level", "why", "heard", "time", "interests"] as const satisfies readonly StepId[];

/** Steps that play by themselves and move on: Back skips over them rather than landing on one that would run again. */
export const INTERLUDE_STEPS = ["go"] as const satisfies readonly StepId[];
export const isInterlude = (step: string): boolean => (INTERLUDE_STEPS as readonly string[]).includes(step);

/** The five tour screens, in order. */
export const SHOW_IDS = ["journey", "levels", "words", "remember", "connect"] as const;
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
export const AFTER_SIGN_IN = "/welcome?step=interests";

/** The placement test opens from the level step, and comes back to the step after it (or to the level step if it is left). */
export const PLACEMENT_PATH = "/placement";
export const AFTER_PLACEMENT = "/welcome?step=ready";
export const BACK_FROM_PLACEMENT = "/welcome?step=ready";

/** Where a failed provider sign-in comes back to: the sign-in step itself. */
export const SIGN_IN_STEP = "/welcome?step=account";
