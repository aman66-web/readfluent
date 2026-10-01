"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SIGNED_IN, warmUpNativeSignIn } from "@/lib/auth/native";
import { oauthProviders, signInWith, type OAuthProvider } from "@/lib/auth/providers";
import { isReviewEmail } from "@/lib/auth/review";
import { createClient } from "@/lib/db/client";
import { dbConfigured } from "@/lib/db/env";
import { EN } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/react";
import { AFTER_SIGN_IN } from "@/lib/onboarding/steps";
import { PrimaryButton } from "./ui";

/** True when there is a Supabase project to sign in to. */
export const accountAvailable = (): boolean => dbConfigured();

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const looksLikeCode = (s: string) => /^\d{6}$/.test(s);

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "verifying"; email: string }
  | { kind: "codeError"; email: string; message: string }
  | { kind: "error"; message: string };

const FIELD = "h-14 w-full rounded-full bg-[var(--ob-card)] px-6 text-center font-semibold outline-none ring-1 ring-inset ring-[var(--ob-line)] placeholder:font-normal placeholder:text-[var(--ob-faint)] focus:ring-2 focus:ring-[var(--ob-teal)]";

/**
 * Sign in with a one-time code, sent by email.
 *
 * Two steps in one form: an address, then the six digits that arrived for it. No
 * password, and nothing to click — the code is typed back in here, which is also why
 * this has no /auth/callback round trip of its own: the session is made the moment the
 * code checks out, on this same screen. (Needs the code in the email template: README,
 * "Sending the sign-in code".) A store reviewer's address (lib/auth/review) signs in
 * with a password instead, because a reviewer cannot read the inbox the code goes to.
 */
export function EmailSignIn({ onVerified }: { onVerified?: (email: string) => void }) {
  const t = useT();
  // A message is either one of ours (an id, translated here) or the server's own words, shown as sent.
  const say = (m: string) => (m in EN ? t(m as keyof typeof EN) : m);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const validEmail = looksLikeEmail(email.trim());
  const reviewer = validEmail && isReviewEmail(email);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!validEmail || status.kind === "sending") return;
    const to = email.trim();
    if (reviewer) {
      if (!password) return;
      setStatus({ kind: "sending" });
      try {
        const { error } = await createClient().auth.signInWithPassword({ email: to, password });
        if (error) setStatus({ kind: "error", message: "email.badPassword" });
        else onVerified?.(to);
      } catch {
        setStatus({ kind: "error", message: "email.badPassword" });
      }
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const { error } = await createClient().auth.signInWithOtp({ email: to });
      if (error) setStatus({ kind: "error", message: error.message });
      else setStatus({ kind: "sent", email: to });
    } catch {
      setStatus({ kind: "error", message: "email.sendFailed" });
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (status.kind !== "sent" && status.kind !== "verifying" && status.kind !== "codeError") return;
    if (!looksLikeCode(code) || status.kind === "verifying") return;
    const to = status.email;
    setStatus({ kind: "verifying", email: to });
    try {
      const { error } = await createClient().auth.verifyOtp({ email: to, token: code, type: "email" });
      if (error) setStatus({ kind: "codeError", email: to, message: "email.badCode" });
      else onVerified?.(to);
    } catch {
      setStatus({ kind: "codeError", email: to, message: "email.badCode" });
    }
  }

  if (status.kind === "sent" || status.kind === "verifying" || status.kind === "codeError") {
    return (
      <form onSubmit={verify} className="guide-card relative rounded-[24px] p-5">
        <p className="text-[17px] font-semibold tracking-[-0.01em]">{t("email.enterCode")}</p>
        <p className="ob-muted mt-1.5 text-[13px] leading-snug">{t("email.sent", { email: "\u0001" }).split("\u0001").map((part, i) => (i === 0 ? <span key={i}>{part}</span> : <span key={i}><span className="font-semibold text-[var(--ob-ink)]" dir="ltr">{status.email}</span>{part}</span>))}</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          aria-label={t("email.codeLabel")}
          aria-invalid={status.kind === "codeError" || undefined}
          /* 16px+ so iOS does not zoom the field on focus. */
          className={`${FIELD} mt-4 bg-white text-[20px] tracking-[0.35em]`}
        />
        {status.kind === "codeError" && <p role="alert" className="mt-2 px-4 text-center text-[12.5px] font-medium text-error">{say(status.message)}</p>}
        <div className="mt-3">
          <PrimaryButton type="submit" withArrow={false} disabled={!looksLikeCode(code) || status.kind === "verifying"}>
            {status.kind === "verifying" ? t("email.checking") : t("email.confirm")}
          </PrimaryButton>
        </div>
        <button type="button" onClick={() => { setStatus({ kind: "idle" }); setCode(""); }} className="ob-muted mt-3 h-11 w-full text-[12.5px] font-semibold">
          {t("email.different")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={send} className="space-y-2.5" noValidate>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        enterKeyHint="send"
        aria-label={t("email.emailLabel")}
        aria-invalid={status.kind === "error" || undefined}
        className={`${FIELD} text-[16px]`}
      />
      {reviewer && (
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("email.reviewPassword")}
               autoComplete="current-password" enterKeyHint="go" aria-label={t("email.reviewPassword")} className={`${FIELD} text-[16px]`} />
      )}
      <PrimaryButton type="submit" withArrow={false} disabled={!validEmail || status.kind === "sending" || (reviewer && !password)}>
        {status.kind === "sending" ? (reviewer ? t("email.checking") : t("email.sending")) : reviewer ? t("email.signInPassword") : t("email.send")}
      </PrimaryButton>
      {status.kind === "error" && <p role="alert" className="px-4 text-center text-[12.5px] font-medium text-error">{say(status.message)}</p>}
    </form>
  );
}

/**
 * "Sign in or sign up": Google and Apple when the build offers them, then the emailed
 * code, then a way past. Without an account backend the step is one calm card that
 * says so, with Continue — the flow never dead-ends, and the step keeps its place so
 * the count is the same on every deploy.
 */
export function SignIn({ error, onNext, next = AFTER_SIGN_IN }: { error: boolean; onNext: () => void; /** Where a provider sign-in comes back to. */ next?: string }) {
  const t = useT();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const providers = oauthProviders();
  const available = accountAvailable();
  // Google's sheet is got ready while this screen is being read.
  useEffect(() => { warmUpNativeSignIn(); }, []);

  async function go(provider: OAuthProvider) {
    if (busy) return;
    setBusy(provider);
    setFailed(null);
    try {
      const message = await signInWith(provider, next);
      // Signed in by the phone's own sheet: on from here, like the emailed code, with
      // no reload. null: the page is leaving for the provider, so the button stays
      // busy until it does. "" (the sheet closed): quietly ready again.
      if (message === SIGNED_IN) { onNext(); return; }
      if (message !== null) { setFailed(message || null); setBusy(null); }
    } catch {
      setFailed(t("account.failed"));
      setBusy(null);
    }
  }

  if (!available) {
    return (
      <div className="guide-card wel-in relative rounded-[22px] p-5">
        <p className="ob-muted text-[13.5px] leading-snug">{t("account.off")}</p>
        <div className="mt-4"><PrimaryButton withArrow={false} onClick={onNext}>{t("ui.continue")}</PrimaryButton></div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {(error || failed) && (
        <p role="alert" className="wel-in rounded-2xl bg-red-50 px-4 py-3 text-[13px] font-medium leading-snug text-error">
          {failed ?? t("account.failed")}
        </p>
      )}
      {providers.map((p, i) => (
        <ProviderButton key={p} provider={p} busy={busy === p} disabled={busy !== null} onClick={() => void go(p)} delay={i * 60} />
      ))}
      {providers.length > 0 && (
        <div className="wel-in flex items-center gap-3 pt-1" style={{ animationDelay: "160ms" }}>
          <span className="h-px flex-1 bg-black/10" aria-hidden />
          <span className="ob-faint text-[11.5px] font-medium">{t("account.or")}</span>
          <span className="h-px flex-1 bg-black/10" aria-hidden />
        </div>
      )}
      <div className="wel-in" style={{ animationDelay: "200ms" }}><EmailSignIn onVerified={onNext} /></div>
      <button type="button" onClick={onNext} className="ob-muted h-11 w-full text-[13px] font-semibold">{t("account.notNow")}</button>
    </div>
  );
}

/**
 * An outlined 52px button carrying the provider's own mark. Solid and full-contrast,
 * as Google's and Apple's own guidelines want: a sign-in button that has to be looked
 * for is a sign-in that does not happen.
 */
function ProviderButton({ provider, busy, disabled, onClick, delay }: {
  provider: OAuthProvider; busy: boolean; disabled: boolean; onClick: () => void; delay: number;
}) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-busy={busy || undefined} style={{ animationDelay: `${delay}ms` }}
            className="ob-quiet wel-in flex h-[52px] w-full items-center justify-center gap-3 rounded-full px-5 text-[15px] font-semibold transition-[transform,opacity] duration-[140ms] active:scale-[0.98] disabled:opacity-60">
      {provider === "google" ? <GoogleMark /> : <AppleMark />}
      <span>{busy ? t("account.signingIn") : provider === "google" ? t("account.google") : t("account.apple")}</span>
    </button>
  );
}

/* The marks are the providers' own, in their own colours: the one place a colour outside the palette belongs. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M16.4 12.7c0-2.5 2-3.7 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.2 1-4.1 2.5-1.8 3-.5 7.6 1.3 10.1.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.9-1.1-2.9-4.1zM13.9 5.3c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
    </svg>
  );
}
