/**
 * What a plan opens, and the one promise that decides the shape of it.
 *
 * **Nothing a reader has already earned ever locks.** Their progress, the words
 * they have met, their flashcards and their schedule keep working whatever they
 * are paying, for ever. A version somebody has started stays open. The only
 * thing a paid plan opens is the longer versions of a book.
 *
 * This file is the one place the rules live (CLAUDE.md, "Accounts and money").
 * They are working defaults until the owner decides pricing (DECISIONS.md,
 * 1 Oct 2026), changed by the owner on 5 Oct 2026: free reads any 2 books; every
 * other book needs the paid plan.
 */

export type Plan = "free" | "full";

export const PLANS: Plan[] = ["free", "full"];

/**
 * Whether the gates are closed.
 *
 * False until there is a till: charging for a thing nobody can buy is not a
 * business model, it is a closed door. M10 turns it on once a sandbox purchase
 * has been seen to travel the whole way — the store, RevenueCat, the webhook,
 * `public.users.plan`.
 */
export const PAYMENTS_LIVE = false;

/**
 * Whether the gates are closed on this device: everywhere once PAYMENTS_LIVE, and before that wherever
 * the store can actually sell Pro (the native app with its RevenueCat key), so a reader is never stopped
 * by a door they cannot open, and a store reviewer who buys Pro sees it unlock something.
 */
export function gatesClosed(storeReady: boolean): boolean {
  return PAYMENTS_LIVE || storeReady;
}

/** How many books a free reader may start (owner, 5 Oct 2026). */
export const FREE_BOOKS = 2;

/**
 * What every plan opens, whatever they pay. Listed rather than assumed, so the
 * promise above is a thing in the code that a test can hold us to.
 */
export const ALWAYS_FREE = [
  "progress",   // where you are in every version you have opened
  "word-cards", // tap a word, see what it means
  "flashcards", // the words you met, scheduled
  "sync",       // your work on your other devices
  "offline",    // anything you have downloaded keeps reading with no network
] as const;

/**
 * Prices, in pence, in one place so nothing hard-codes a number into a sentence.
 *
 * PLACEHOLDERS: the owner has not set pricing. The store charges its own
 * localised price (App Store Connect sets it per country); these are only
 * shown where there is no store to ask — on the web, where the paywall can
 * only point at the app.
 */
export const PRICE = {
  monthlyPence: 599,
  yearlyPence: 3999,
} as const;

/** The free trial both subscriptions start with in the store (owner, 5 Oct 2026): set up in App Store Connect and Play; shown on the paywall. */
export const TRIAL_DAYS = 7;

/** A price as a plain string, e.g. 599 → "£5.99". */
export const pounds = (pence: number): string =>
  `£${Math.floor(pence / 100)}.${String(pence % 100).padStart(2, "0")}`;

/** Anything that is not exactly "full" is free — an unreadable plan must never open a gate. */
export function parsePlan(value: unknown): Plan {
  return value === "full" ? "full" : "free";
}

/**
 * Whether a reader may open a book.
 *
 * `started` is a book they have already begun: it stays open whatever the rules
 * become, because revoking something somebody is halfway through, over a policy
 * change made after the fact, is not this app's call. `booksStarted` is how many
 * different books they have begun (any level). With the gates not yet live
 * (`PAYMENTS_LIVE`), everything is open. `live` is a parameter only so the rule
 * can be tested with the gates shut.
 */
export function canOpenBook(plan: Plan, started: boolean, booksStarted: number, live: boolean = PAYMENTS_LIVE): boolean {
  if (!live) return true;
  return plan === "full" || started || booksStarted < FREE_BOOKS;
}

/**
 * The plan a `public.users` row is on right now — the TypeScript twin of
 * `effective_plan()` in 0002_plan.sql, for the server's gate to read without
 * a second round trip.
 *
 * "full" with no end date is full (set by hand, or a lifetime grant); "full"
 * with an end date is full until that moment passes, which is how a lapsed
 * subscription closes itself without anything having to write "free" back.
 * A date that cannot be read closes the gate rather than opening it.
 */
export function effectivePlan(
  row: { plan?: unknown; plan_until?: string | null } | null | undefined,
  now: Date = new Date(),
): Plan {
  if (parsePlan(row?.plan) !== "full") return "free";
  if (!row?.plan_until) return "full";
  const until = new Date(row.plan_until).getTime();
  return Number.isFinite(until) && until > now.getTime() ? "full" : "free";
}
