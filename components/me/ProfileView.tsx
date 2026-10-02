"use client";

import { Modal } from "@/components/Modal";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { Paywall } from "@/components/paywall/Paywall";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SignIn, accountAvailable } from "@/components/onboarding/SignIn";
import { buildLine } from "@/lib/build";
import { CATEGORIES } from "@/lib/content/limits";
import { createClient } from "@/lib/db/client";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import { NAME_MAX, saveAnswers, toggleIn } from "@/lib/onboarding/answers";
import { DAILY_MINUTES, DEFAULT_MINUTES } from "@/lib/onboarding/firstrun";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { usePlan } from "@/lib/pro/state";
import { restartTour } from "@/lib/tour/state";
import { MASCOT_NAME } from "@/lib/brand";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { startAgain } from "@/lib/store/wipe";
import { LEDGER_KEY, parseLedger, totalXp } from "@/lib/xp/ledger";
import { levelFromXp } from "@/lib/xp/levels";

const subLedger = subscribeTo(LEDGER_KEY);
const readLedger = () => readRaw(LEDGER_KEY);
const server = () => "";

/** The signed-in person's email, or null for nobody (an anonymous session is nobody: reading needs no account). */
function useSignedInEmail(): { email: string | null; ready: boolean } {
  const [state, setState] = useState<{ email: string | null; ready: boolean }>({ email: null, ready: !accountAvailable() });
  useEffect(() => {
    if (!accountAvailable()) return;
    let live = true;
    createClient().auth.getUser()
      .then(({ data }) => { if (live) setState({ email: data.user && !data.user.is_anonymous ? data.user.email ?? null : null, ready: true }); })
      .catch(() => { if (live) setState({ email: null, ready: true }); });
    return () => { live = false; };
  }, []);
  return state;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-faint rtl:-scale-x-100" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
);

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      {title ? <h2 className="px-1 text-[12px] font-bold uppercase tracking-[0.1em] text-faint">{title}</h2> : null}
      <div className="mt-2 overflow-hidden rounded-[22px] border border-border bg-surface">{children}</div>
    </section>
  );
}

const Row = ({ children, last = false }: { children: React.ReactNode; last?: boolean }) => (
  <div className={`px-4 py-3.5 ${last ? "" : "border-b border-border"}`}>{children}</div>
);

const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-pressed={on}
          className={`h-10 rounded-full px-4 text-[13.5px] font-semibold transition-colors ${on ? "bg-accent text-white" : "bg-white text-muted ring-1 ring-inset ring-border"}`}>
    {children}
  </button>
);

/** A confirmation that must be answered: what will be lost, the way back, and the destructive button. */
function Confirm({ title, body, yes, cancel, busy, error, onYes, onCancel }: {
  title: string; body: string; yes: string; cancel: string; busy: boolean; error: string | null; onYes: () => void; onCancel: () => void;
}) {
  return (
    <Modal className="fixed inset-0 z-50 flex items-end justify-center" role="alertdialog" label={title} onClose={() => { if (!busy) onCancel(); }}>
      <button aria-label={cancel} className="fade-in absolute inset-0 bg-black/45" onClick={busy ? undefined : onCancel} />
      <div className="sheet-up relative w-full max-w-[440px] rounded-t-[24px] bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
        <h2 className="text-[20px] font-bold tracking-[-0.01em]">{title}</h2>
        <p className="mt-2 text-[14.5px] leading-snug text-muted">{body}</p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-error">{error}</p>}
        <button type="button" onClick={onYes} disabled={busy}
                className="mt-5 h-13 w-full rounded-full bg-error px-5 py-3.5 text-[16px] font-semibold text-white active:opacity-85 disabled:opacity-60">{yes}</button>
        <button type="button" onClick={onCancel} disabled={busy} className="mt-1 h-12 w-full text-[15px] font-semibold text-muted disabled:opacity-50">{cancel}</button>
      </div>
    </Modal>
  );
}

export function ProfileView() {
  const [paywall, setPaywall] = useState(false);
  const { plan } = usePlan();
  const t = useT();
  const locale = useLocale();
  const a = useAnswers();
  const ledgerRaw = useSyncExternalStore(subLedger, readLedger, server);
  const level = useMemo(() => levelFromXp(totalXp(parseLedger(ledgerRaw))), [ledgerRaw]);
  const { email, ready } = useSignedInEmail();
  const [name, setName] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [confirm, setConfirm] = useState<"account" | "device" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = name ?? a.name;
  const initial = shown.trim().charAt(0).toLocaleUpperCase();
  const goal = a.daily ?? DEFAULT_MINUTES;

  /* "account": the copy on the server first. When it refuses, nothing has been lost yet and they are told (a 401 or 503 is a refusal here:
     the account is still there). "device": only what this device holds, with no call to the server at all, so it works offline and can never
     reach an account. Then this device, and the first screen. */
  async function erase(mode: "account" | "device") {
    setBusy(true);
    setError(null);
    if (mode === "account") {
      try {
        const res = await fetch("/api/account", { method: "DELETE" });
        if (!res.ok) { setError(t("me.deleteFailed")); setBusy(false); return; }
      } catch {
        setError(t("me.deleteFailed"));
        setBusy(false);
        return;
      }
      try { await createClient().auth.signOut(); } catch { /* the row is gone anyway */ }
    }
    await startAgain();
  }

  async function signOut() {
    try { await createClient().auth.signOut(); } catch { /* signed out as far as this device is concerned */ }
    window.location.reload();
  }

  return (
    <main className="safe-top px-5 pb-32 [--pt:.5rem]">
      <Link href="/" aria-label={t("ui.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </Link>
      <h1 className="title-display mt-2">{t("me.title")}</h1>

      {/* Who they are: a name they choose, and whether they are signed in. */}
      <div className="mt-5 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full p-[3px]" style={{ background: "conic-gradient(from 200deg, #67E8F9, #22D3EE, #0E7490, #67E8F9)" }} aria-hidden>
          <span className="grid size-full place-items-center rounded-full bg-white text-[24px] font-bold">
            {initial || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-7 text-accent"><path d="M12 11.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM4.5 20a7.5 7.5 0 0115 0" /></svg>}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <label className="block text-[12px] font-semibold text-faint" htmlFor="me-name">{t("me.name")}</label>
          {/* 16px so iOS does not zoom the field on focus. */}
          <input id="me-name" type="text" value={shown} maxLength={NAME_MAX} placeholder={t("me.namePlaceholder")} autoComplete="given-name" enterKeyHint="done"
                 onChange={(e) => setName(e.target.value)} onBlur={() => { if (name !== null) { saveAnswers({ name: name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX) }); setName(null); } }}
                 onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                 className="mt-0.5 h-11 w-full rounded-lg bg-transparent text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-faint focus-visible:ring-2 focus-visible:ring-accent-bright" />
          <p className="mt-0.5 truncate text-[12.5px] text-muted" dir="auto">{!ready ? " " : email ? t("me.signedInAs", { email }) : t("me.signedOut")}</p>
        </div>
      </div>

      <Group title={t("me.learning")}>
        <Row>
          <Link href="/languages" className="flex items-center gap-3 active:opacity-70">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{t("languages.link")}</span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">{a.learn ? `${languageName(a.learn, locale)} · ${languageName(a.language, locale)}` : languageName(a.language, locale)}</span>
            </span>
            <Chevron />
          </Link>
        </Row>
        <Row>
          <span className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold">{t("me.level")}</span>
            <span className="tabular text-[13.5px] font-semibold text-accent">{level.code} · {t(`levelname.${level.level}`)}</span>
          </span>
        </Row>
        <Row>
          <span className="block text-[15px] font-semibold">{t("me.goal")}</span>
          <span className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label={t("me.goal")}>
            {[...DAILY_MINUTES, ...((DAILY_MINUTES as readonly number[]).includes(goal) ? [] : [goal])].sort((x, y) => x - y).map((m) => <Pill key={m} on={goal === m} onClick={() => saveAnswers({ daily: m })}>{t("daily.minutesLabel", { minutes: m })}</Pill>)}
          </span>
        </Row>
        <Row last>
          <span className="block text-[15px] font-semibold">{t("me.shelves")}</span>
          <span className="mt-0.5 block text-[12.5px] text-muted">{t("me.shelvesSub")}</span>
          <span className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label={t("me.shelves")}>
            {CATEGORIES.map((c) => <Pill key={c.id} on={a.interests.includes(c.id)} onClick={() => saveAnswers({ interests: toggleIn(CATEGORIES.map((x) => x.id), a.interests, c.id) })}>{t(`cat.${c.id}`)}</Pill>)}
          </span>
        </Row>
      </Group>

      <BadgeGrid />

      <Group>
        <Row>
          <Link href="/" onClick={() => restartTour()} className="flex min-h-11 w-full items-center gap-3 text-start active:opacity-70">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{t("me.tour")}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{t("me.tourSub", { mascot: MASCOT_NAME })}</span>
            </span>
            <Chevron />
          </Link>
        </Row>

        <Row last>
          <button type="button" onClick={() => setPaywall(true)} className="flex min-h-11 w-full items-center gap-3 text-start active:opacity-70">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{t("me.premium")}{plan === "full" ? " ✓" : ""}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{t("me.premiumSub")}</span>
            </span>
            <Chevron />
          </button>
        </Row>
      </Group>

      <Group title={t("me.account")}>
        {accountAvailable() && ready && (email ? (
          <Row>
            <button type="button" onClick={() => void signOut()} className="flex min-h-11 w-full items-center text-start text-[15px] font-semibold">{t("me.signOut")}</button>
          </Row>
        ) : (
          <Row>
            <p className="text-[13.5px] leading-snug text-muted">{t("me.signInHint")}</p>
            {signing ? (
              <div className="mt-3"><SignIn error={false} next="/me" onNext={() => { setSigning(false); window.location.reload(); }} /></div>
            ) : (
              <button type="button" onClick={() => setSigning(true)} className="mt-3 h-12 w-full btn-cyan rounded-full text-[15px] font-bold">{t("account.line")}</button>
            )}
          </Row>
        ))}
        {!accountAvailable() && <Row><p className="text-[13.5px] leading-snug text-muted">{t("account.off")}</p></Row>}
        <Row last>
          <button type="button" disabled={!ready} onClick={() => { setError(null); setConfirm(email ? "account" : "device"); }}
                  className="flex min-h-11 w-full items-center py-2 text-start text-[15px] font-semibold text-error disabled:opacity-50">
            {email ? t("me.deleteAccount") : t("me.deleteData")}
          </button>
        </Row>
      </Group>

      <Group title={t("me.about")}>
        <Row><Link href="/privacy" className="flex items-center gap-3 active:opacity-70"><span className="flex-1 text-[15px] font-semibold">{t("me.privacy")}</span><Chevron /></Link></Row>
        <Row last><span className="tabular text-[13px] text-faint">{t("me.version", { build: buildLine() })}</span></Row>
      </Group>

      {confirm && (
        <Confirm title={confirm === "account" ? t("me.deleteTitle") : t("me.deleteDataTitle")} body={confirm === "account" ? t("me.deleteBody") : t("me.deleteDataBody")}
                 yes={t("me.deleteYes")} cancel={t("me.cancel")} busy={busy} error={error} onYes={() => void erase(confirm)} onCancel={() => setConfirm(null)} />
      )}
      {paywall ? <Paywall onClose={() => setPaywall(false)} /> : null}
    </main>
  );
}
