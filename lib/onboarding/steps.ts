/**
 * The first run, as pure rules: which steps there are and in what order.
 *
 * Which language the app itself is in (so the rest can be read) → the welcome (a wall
 * of book covers) → Lex says hello → Lex says how quick it will be → which languages (the one you speak and the
 * one you want to learn) → how much of it you know (or a
 * five-minute test that finds out) → why they are learning → where they
 * heard of it → how much time a day they can give it → how
 * long that takes to reach each level → a five-screen tour → where that time
 * takes them → a promise → sign in → what you are
 * curious about → the library being set up. Every step after the welcome can be
 * skipped, and every one counts on the progress bar.
 *
 * Adapted from the first run of the app this one's engineering came from, with
 * its screens and its copy rewritten for reading.
 */
export const STEP_IDS = [
  "app", "intro", "hello", "quick", "tongues", "level", "why", "heard", "time", "path",
  "journey", "levels", "words", "remember", "connect",
  "future", "pledge", "account", "interests", "ready",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/** The steps that ask the reader something before they are in the app. Lex says how many ("just 6 quick questions"), so the number is counted here, not written. */
export const QUESTION_STEPS = ["tongues", "level", "why", "heard", "time", "interests"] as const satisfies readonly StepId[];

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
export const AFTER_PLACEMENT = `/welcome?step=${STEP_IDS[STEP_IDS.indexOf("level") + 1]}`;
export const BACK_FROM_PLACEMENT = "/welcome?step=level";

/** Where a failed provider sign-in comes back to: the sign-in step itself. */
export const SIGN_IN_STEP = "/welcome?step=account";
