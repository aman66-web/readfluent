"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { BackLink } from "@/components/BackLink";
import "../../app/welcome/welcome.css";
import { SignIn } from "@/components/onboarding/SignIn";
import { APP_NAME } from "@/lib/brand";
import { useLocale, useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { NeedsSignIn, addFriend, myFriends, myLeague, removeFriend, respondFriend, syncProfile, type AddResult } from "@/lib/social/api";
import { saveSocial } from "@/lib/social/cache";
import { DEMOTE, PROMOTE, TIERS, daysLeftInMonth, profilePayload, zoneOf, type FriendRow, type League } from "@/lib/social/model";
import { readRaw } from "@/lib/store/local";
import { LEDGER_KEY, parseLedger } from "@/lib/xp/ledger";
import { useSignedIn } from "./useSignedIn";

type Tab = "league" | "friends";
type Load = "loading" | "ready" | "signin" | "error";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ADD_MESSAGE: Record<AddResult, Parameters<ReturnType<typeof useT>>[0]> = {
  sent: "friends.sent", accepted: "friends.nowFriends", already_friends: "friends.alreadyFriends", already_sent: "friends.alreadySent",
  not_found: "friends.notFound", self: "friends.self", no_profile: "friends.error", too_many: "friends.tooMany",
};

/** A name for a row: what they chose, or the start of their code for someone who has not set one. */
const shown = (name: string, code: string): string => name.trim() || `#${code.slice(0, 4)}`;

function Avatar({ name, me }: { name: string; me?: boolean }) {
  return (
    <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold uppercase ${me ? "bg-accent-bright text-on-cyan" : "bg-accent-bright/25 text-accent"}`}>
      {Array.from(name.replace(/^#/, ""))[0] ?? "?"}
    </span>
  );
}

export function FriendsView() {
  const t = useT();
  const { signedIn, ready, available } = useSignedIn();
  const [tab, setTab] = useState<Tab>("league");

  return (
    <main className="safe-top px-5 pb-32 [--pt:.5rem]">
      <BackLink fallback="/" previous label={t("ui.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </BackLink>
      <h1 className="title-display mt-1">{t("friends.title")}</h1>

      {!ready ? null : !signedIn ? (
        <section className="mt-5 rounded-[22px] border border-border bg-surface p-5">
          <p className="text-[15px] leading-snug">{t("friends.signIn")}</p>
          {available ? <div className="mt-3"><div className="ob rounded-[18px] p-3"><SignIn error={false} next="/friends" onNext={() => window.location.reload()} /></div></div> : null}
        </section>
      ) : (
        <>
          <div role="tablist" aria-label={t("friends.title")} className="mt-4 grid grid-cols-2 rounded-full bg-border/60 p-1">
            {(["league", "friends"] as const).map((k) => (
              <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)}
                      className={`h-11 rounded-full text-[15px] font-bold transition-colors ${tab === k ? "bg-surface text-accent shadow-sm" : "text-muted"}`}>
                {t(k === "league" ? "friends.tabLeague" : "friends.tabFriends")}
              </button>
            ))}
          </div>
          <Panels tab={tab} />
        </>
      )}
    </main>
  );
}

function Panels({ tab }: { tab: Tab }) {
  const t = useT();
  const a = useAnswers();
  const [load, setLoad] = useState<Load>("loading");
  const [code, setCode] = useState("");
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [league, setLeague] = useState<League | null>(null);
  const [rev, setRev] = useState(0);

  // Reports the reader to the server, then asks for the friends and the standings.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const mine = await syncProfile(profilePayload(parseLedger(readRaw(LEDGER_KEY)), a.name, new Date()));
        const [f, l] = await Promise.all([myFriends(), myLeague()]);
        if (!live) return;
        setCode(mine);
        setFriends(f);
        setLeague(l);
        saveSocial({ friendCode: mine, friends: f.filter((r) => r.relation === "friend").length, syncedAt: Date.now() });
        setLoad("ready");
      } catch (e) {
        if (live) setLoad(e instanceof NeedsSignIn ? "signin" : "error");
      }
    })();
    return () => { live = false; };
    // The name is read when the screen opens; changing it later is picked up by the next visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev]);

  const reload = useCallback(() => setRev((n) => n + 1), []);

  if (load === "loading") return <p className="mt-8 text-center text-[14px] text-muted" aria-live="polite">…</p>;
  if (load === "signin" || load === "error") {
    return (
      <div role="alert" className="mt-5 rounded-[22px] border border-border bg-surface p-5 text-center">
        <p className="text-[15px]">{load === "signin" ? t("friends.signIn") : t("friends.error")}</p>
        <button type="button" onClick={() => { setLoad("loading"); reload(); }} aria-label={t("ui.retry")} className="btn-cyan mt-4 h-11 rounded-full px-6 text-[14.5px] font-bold"><span aria-hidden>↻</span></button>
      </div>
    );
  }
  return tab === "league"
    ? <div role="tabpanel" id="panel-league" aria-labelledby="tab-league"><LeagueTab league={league} friends={friends} onChanged={reload} /></div>
    : <div role="tabpanel" id="panel-friends" aria-labelledby="tab-friends"><FriendsTab code={code} friends={friends} onChanged={reload} /></div>;
}

function LeagueTab({ league, friends, onChanged }: { league: League | null; friends: FriendRow[]; onChanged: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [asked, setAsked] = useState<Record<string, boolean>>({});
  const known = useMemo(() => new Set(friends.map((f) => f.code)), [friends]);
  const left = daysLeftInMonth(new Date());

  if (!league) return <p className="mt-6 text-[14.5px] text-muted">{t("league.alone")}</p>;
  const [y, m] = league.period.split("-").map(Number);
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y || 2026, (m || 1) - 1, 1)));
  const tier = TIERS[league.tier];

  return (
    <section className="mt-5">
      <div className="rounded-[24px] bg-accent-bright p-5 text-on-cyan">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-cyan/75">{t("league.month", { month })}</p>
        <p className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]" data-tier={tier}>{t(`league.tier.${league.tier}` as "league.tier.0")}</p>
        <p className="mt-1 text-[13.5px] text-on-cyan/80">{left <= 1 ? t("league.lastDay") : t("league.daysLeft", { n: left })} · {t("league.intro")}</p>
      </div>

      {league.rows.length <= 1 ? <p className="mt-4 text-[14.5px] text-muted">{t("league.alone")}</p> : null}

      <ol className="mt-4 overflow-hidden rounded-[22px] border border-border bg-surface">
        {league.rows.map((r, i) => {
          const zone = zoneOf(r.rank, league.size);
          const name = shown(r.name, r.code);
          return (
            <li key={`${r.code}-${i}`} data-me={r.me || undefined} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""} ${r.me ? "bg-accent-bright/20" : zone === "up" ? "bg-emerald-50/70" : zone === "down" ? "bg-rose-50/70" : ""}`}>
              <span className="w-6 shrink-0 text-center text-[15px] font-bold tabular-nums text-muted">{r.rank}</span>
              <Avatar name={name} me={r.me} />
              <div className="min-w-0 flex-1">
                <p dir="auto" className="truncate text-[15.5px] font-semibold">{r.me ? `${name} · ${t("league.you")}` : name}</p>
                <p className="text-[12.5px] text-muted">{r.level}</p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-[15px] font-bold tabular-nums">{t("league.xp", { xp: r.xp.toLocaleString(locale) })}</p>
                {!r.me && r.code && !known.has(r.code) && !asked[r.code] ? (
                  <button type="button" onClick={() => { setAsked((o) => ({ ...o, [r.code]: true })); void addFriend(r.code).then(onChanged, () => setAsked((o) => ({ ...o, [r.code]: false }))); }}
                          className="mt-0.5 text-[12.5px] font-semibold text-accent">{t("league.addThem")}</button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {league.size >= PROMOTE + DEMOTE + 1 ? (
        <p className="mt-3 flex flex-col gap-1 text-[12.5px] text-muted">
          <span><span aria-hidden className="me-1.5 inline-block size-2.5 rounded-full bg-emerald-400" />{t("league.zoneUp")}</span>
          <span><span aria-hidden className="me-1.5 inline-block size-2.5 rounded-full bg-rose-400" />{t("league.zoneDown")}</span>
        </p>
      ) : null}
    </section>
  );
}

function FriendsTab({ code, friends, onChanged }: { code: string; friends: FriendRow[]; onChanged: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const incoming = friends.filter((f) => f.relation === "incoming");
  const outgoing = friends.filter((f) => f.relation === "outgoing");
  const mine = friends.filter((f) => f.relation === "friend");

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* the code is on screen to copy by hand */ }
  };
  const share = async () => {
    const message = t("friends.shareText", { app: APP_NAME, code });
    try {
      if (navigator.share) await navigator.share({ text: message });
      else await navigator.clipboard.writeText(message);
    } catch { /* dismissed */ }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await addFriend(text);
      setNote(t(ADD_MESSAGE[r]));
      if (r === "sent" || r === "accepted") { setText(""); onChanged(); }
    } catch {
      setNote(t("friends.error"));
    } finally {
      setBusy(false);
    }
  };
  const act = (fn: () => Promise<void>) => () => { void fn().then(onChanged, () => setNote(t("friends.error"))); };

  return (
    <section className="mt-5 space-y-6">
      <div className="rounded-[22px] border border-border bg-surface p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("friends.yourCode")}</h2>
        <p className="mt-2 select-all text-[32px] font-bold leading-none tracking-[0.12em] text-accent" dir="ltr" data-code>{code.replace(/(.{4})/, "$1 ")}</p>
        <div className="mt-4 flex gap-2.5">
          <button type="button" onClick={() => void copy()} className="h-11 flex-1 rounded-full border-2 border-border text-[14.5px] font-bold active:bg-border/60">{copied ? t("friends.copied") : t("friends.copy")}</button>
          <button type="button" onClick={() => void share()} className="btn-cyan h-11 flex-1 rounded-full text-[14.5px] font-bold">{t("friends.share")}</button>
        </div>
      </div>

      <form onSubmit={(e) => void submit(e)} className="rounded-[22px] border border-border bg-surface p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("friends.addTitle")}</h2>
        <div className="mt-3 flex gap-2.5">
          <input value={text} onChange={(e) => setText(e.target.value.toUpperCase())} maxLength={12} autoCapitalize="characters" autoCorrect="off" spellCheck={false} dir="ltr"
                 placeholder={t("friends.addPlaceholder")} aria-label={t("friends.addPlaceholder")}
                 className="h-12 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 text-[16px] font-semibold uppercase tracking-[0.1em] outline-none focus:border-accent-bright" />
          <button type="submit" disabled={busy || !text.trim()} className="btn-cyan h-12 shrink-0 rounded-full px-6 text-[15px] font-bold disabled:opacity-50">{t("friends.addButton")}</button>
        </div>
        <p role="status" className="mt-2 min-h-5 text-[13.5px] text-muted">{note}</p>
      </form>

      {incoming.length > 0 ? (
        <div>
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("friends.requests")}</h2>
          <ul className="space-y-2.5">
            {incoming.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-[20px] border border-border bg-surface p-3.5">
                <Avatar name={shown(f.name, f.code)} />
                <p dir="auto" className="min-w-0 flex-1 truncate text-[15.5px] font-semibold">{shown(f.name, f.code)}</p>
                <button type="button" onClick={act(() => respondFriend(f.id, true))} className="btn-cyan h-10 rounded-full px-4 text-[14px] font-bold">{t("friends.accept")}</button>
                <button type="button" onClick={act(() => respondFriend(f.id, false))} className="h-10 rounded-full border-2 border-border px-3.5 text-[14px] font-semibold text-muted active:bg-border/60">{t("friends.decline")}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("friends.list")}</h2>
        {mine.length === 0 ? (
          <p className="rounded-[20px] border border-border bg-surface p-4 text-[14.5px] leading-snug text-muted">{t("friends.none")}</p>
        ) : (
          <ul className="space-y-2.5">
            {mine.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-[20px] border border-border bg-surface p-3.5">
                <Avatar name={shown(f.name, f.code)} />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-[15.5px] font-semibold">{shown(f.name, f.code)} <span className="text-[12.5px] font-medium text-muted">{f.level}</span></p>
                  <p className="text-[12.5px] text-muted">{t("friends.thisMonth", { xp: f.xpMonth.toLocaleString(locale) })}{f.streak > 0 ? ` · ${t("friends.streak", { n: f.streak })}` : ""}</p>
                </div>
                <button type="button" onClick={() => { if (window.confirm(t("friends.removeConfirm", { name: shown(f.name, f.code) }))) void act(() => removeFriend(f.id))(); }} aria-label={`${t("friends.remove")}: ${shown(f.name, f.code)}`} className="grid size-10 shrink-0 place-items-center rounded-full text-muted active:bg-border/60">
                  <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        {outgoing.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {outgoing.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-[20px] border border-dashed border-border p-3.5">
                <Avatar name={shown(f.name, f.code)} />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-[15.5px] font-semibold">{shown(f.name, f.code)}</p>
                  <p className="text-[12.5px] text-muted">{t("friends.waiting")}</p>
                </div>
                <button type="button" onClick={act(() => removeFriend(f.id))} className="h-10 rounded-full px-3.5 text-[13.5px] font-semibold text-muted active:bg-border/60">{t("friends.cancel")}</button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
