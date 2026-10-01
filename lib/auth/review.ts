/**
 * Accounts for the app stores' review teams.
 *
 * Everyone else signs in with a code sent by email. A reviewer cannot read our
 * inbox, and Google Play will not accept a listing whose sign-in details do
 * not open everything, Pro included — so these few addresses sign in with a
 * password instead (see RELEASE.md, "Reviewer account").
 *
 * Their Pro comes from here too, not from their `public.users` row: the row's
 * plan can only be written by the server (0006_plan.sql's guard), which is the
 * point of the guard, and a reviewer's access should not depend on somebody
 * getting past it by hand. A listed address with a confirmed email is Pro on
 * the screen (lib/pro/state.ts).
 *
 * The list is public (it is in the page's JavaScript, like every
 * NEXT_PUBLIC_ value); what keeps the account closed is its password, which is
 * long and random and lives only in Supabase and the store consoles. The
 * addresses are written out in full here so the bundler inlines them.
 */
export function reviewEmails(raw: string | undefined = process.env.NEXT_PUBLIC_REVIEW_EMAILS): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
}

/** Whether this address signs in with a password rather than an emailed code. */
export function isReviewEmail(email: string, list: readonly string[] = reviewEmails()): boolean {
  const e = email.trim().toLowerCase();
  return e.length > 0 && list.includes(e);
}

/**
 * Whether a signed-in user is a store reviewer, and so Pro whatever their row
 * says. The address must be confirmed: an unconfirmed one proves nothing
 * about who is holding it.
 */
export function isReviewer(
  user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined,
  list: readonly string[] = reviewEmails(),
): boolean {
  return Boolean(user?.email && user.email_confirmed_at && isReviewEmail(user.email, list));
}
