import type { MessageId } from "@/lib/i18n/en";

/**
 * The guided tour: Dewey walks a new reader through the app, from the home screen to the first page of a
 * book. Pure rules here (which steps, in which order, where each can be shown); the overlay that draws them
 * is components/tour/Coach.tsx, and where the reader is up to is lib/tour/state.ts.
 *
 * A step points at a part of a screen (`target` is a `data-tour="…"` mark in the page) and is either moved
 * on by the reader's "Next" (`next`) or by their doing the thing it asks for, which changes the page
 * (`route`: the step is done when the address matches `until`).
 */
export interface TourStep {
  id: string;
  /** Where the step can be shown. */
  on: RegExp;
  /** The `data-tour` mark of what to point at; none means Dewey just talks. */
  target?: string;
  text: MessageId;
  mode: "next" | "route";
  /** For `route` steps: the address that completes it. */
  until?: RegExp;
  /** What Dewey looks like for this step. */
  mood: "hello" | "reading" | "cheer" | "ready";
}

export const TOUR: readonly TourStep[] = [
  { id: "welcome", on: /^\/$/, text: "coach.welcome", mode: "next", mood: "hello" },
  { id: "level", on: /^\/$/, target: "level", text: "coach.level", mode: "next", mood: "ready" },
  { id: "targets", on: /^\/$/, target: "targets", text: "coach.targets", mode: "next", mood: "reading" },
  { id: "library", on: /^\/$/, target: "tab-library", text: "coach.library", mode: "route", until: /^\/library/, mood: "hello" },
  { id: "pick", on: /^\/library/, target: "shelf", text: "coach.pick", mode: "route", until: /^\/book\//, mood: "ready" },
  { id: "levels", on: /^\/book\//, target: "levels", text: "coach.bookLevel", mode: "next", mood: "reading" },
  { id: "path", on: /^\/book\//, target: "path", text: "coach.bookPath", mode: "next", mood: "ready" },
  { id: "read", on: /^\/book\//, target: "read", text: "coach.read", mode: "route", until: /^\/read\//, mood: "cheer" },
  { id: "swipe", on: /^\/read\//, target: "page", text: "coach.swipe", mode: "next", mood: "reading" },
  { id: "word", on: /^\/read\//, target: "text", text: "coach.tapWord", mode: "next", mood: "ready" },
  { id: "listen", on: /^\/read\//, target: "listen", text: "coach.listen", mode: "next", mood: "hello" },
  { id: "settings", on: /^\/read\//, target: "settings", text: "coach.settings", mode: "next", mood: "reading" },
  { id: "finish", on: /^\/read\//, text: "coach.finish", mode: "next", mood: "cheer" },
];

/** The step to show at `pathname` when the reader is up to `index`: the step itself, or null if it belongs to another screen. */
export function stepFor(index: number, pathname: string): TourStep | null {
  const s = TOUR[index];
  return s && s.on.test(pathname) ? s : null;
}

/** Where the tour goes after step `index`: the next index, or null when it was the last. */
export const after = (index: number): number | null => (index + 1 < TOUR.length ? index + 1 : null);

/**
 * A `route` step is finished by the reader's own tap. When the page changes to where the step was leading,
 * the tour moves on to the first step that is for that page.
 */
export function advanceOnRoute(index: number, pathname: string): number {
  const s = TOUR[index];
  if (!s || s.mode !== "route" || !s.until?.test(pathname)) return index;
  return index + 1;
}
