"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { BackLink } from "@/components/BackLink";
import "../../app/welcome/welcome.css";
import { SignIn } from "@/components/onboarding/SignIn";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { block, readBlocked } from "@/lib/social/blocked";
import { useLocale, useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { NeedsSignIn, addFriend, myBoard, myFriends, myUsername, removeFriend, respondFriend, setUsername, syncProfile, type AddResult, type UsernameResult } from "@/lib/social/api";
import { saveSocial } from "@/lib/social/cache";
import { boardSeed } from "@/lib/social/seed";
import { DEMOTE, PROMOTE, TIERS, hueOf, mergeBoard, profilePayload, usernameProblem, zoneOf, type BoardRow, type FriendRow, type League } from "@/lib/social/model";
import { daysLeft, myXpIn, paceOf, rivalsFor, type Period } from "@/lib/social/rivals";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { levelFromXp } from "@/lib/xp/levels";
import { LEDGER_KEY, parseLedger, totalXp } from "@/lib/xp/ledger";
import { useSignedIn } from "./useSignedIn";

type Tab = "league" | "friends";
type Load = "loading" | "ready" | "signin" | "error";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ADD_MESSAGE: Record<AddResult, Parameters<ReturnType<typeof useT>>[0]> = {
  sent: "friends.sent", accepted: "friends.nowFriends", already_friends: "friends.alreadyFriends", already_sent: "friends.alreadySent",
  not_found: "friends.notFound", self: "friends.self", no_profile: "friends.error", too_many: "friends.tooMany",
};
/** How many places a board shows: the league's real readers, topped up with practice readers. */
const BOARD_SIZE = 20;
const subLedger = subscribeTo(LEDGER_KEY);
const noSubscribe = () => () => {};

/** A name for a row: what they chose, their username, or the start of their code. */
const shown = (name: string, code: string, username = ""): string => name.trim() || (username ? `@${username}` : `#${code.slice(0, 4)}`);

function Avatar({ name, me, hue }: { name: string; me?: boolean; hue?: number }) {
  const style = me || hue === undefined ? undefined : { background: `hsl(${hue} 70% 90%)`, color: `hsl(${hue} 55% 32%)` };
  return (
    <span aria-hidden style={style} className={`grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold uppercase ${me ? "bg-accent-bright text-on-cyan" : hue === undefined ? "bg-accent-bright/25 text-accent" : ""}`}>
      {Array.from(name.replace(/^[#@]/, ""))[0] ?? "?"}
    </span>
  );
}

/** What the signed-in reader's screens need from the server: they are reported first, then friends, username and both boards. */
function useSocial(signedIn: boolean) {
  const a = useAnswers();
  const [load, setLoad] = useState<Load>("loading");
  const [code, setCode] = useState("");
  const [username, setName] = useState("");
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [boards, setBoards] = useState<Record<Period, League | null>>({ week: null, month: null });
  const [rev, setRev] = useState(0);
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    (async () => {
      try {
        const mine = await syncProfile(profilePayload(parseLedger(readRaw(LEDGER_KEY)), a.name, new Date()));
        const [f, u, week, month] = await Promise.all([myFriends(), myUsername(), myBoard("week"), myBoard("month")]);
        if (!live) return;
        setCode(mine); setName(u); setFriends(f); setBoards({ week, month });
        saveSocial({ friendCode: mine, friends: f.filter((r) => r.relation === "friend").length, syncedAt: Date.now() });
        setLoad("ready");
      } catch (e) {
        if (live) setLoad(e instanceof NeedsSignIn ? "signin" : "error");
      }
    })();
    return () => { live = false; };
    // The name is read when the screen opens; changing it later is picked up by the next visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, rev]);
  const reload = useCallback(() => setRev((n) => n + 1), []);
  return { load, code, username, setName, friends, boards, reload, retry: () => { setLoad("loading"); reload(); } };
}

/** The readers blocked on this device, read after mount (localStorage is the browser's). */
function useBlocked(): [Set<string>, (code: string) => void] {
  const [blocked, setBlocked] = useState<Set<string>>(() => new Set());
  useEffect(() => { setBlocked(readBlocked()); }, []);
  return [blocked, (code: string) => setBlocked(block(code))];
}

/** Report and Block for another reader: report goes to support by email, block hides them on this device. */
function Moderate({ code, name, onBlock }: { code: string; name: string; onBlock: (code: string) => void }) {
  const t = useT();
  return (
    <span className="mt-0.5 flex justify-end gap-3 text-[12px] font-semibold text-muted">
      {SUPPORT_EMAIL ? (
        <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("social.reportSubject"))}&body=${encodeURIComponent(`#${code} ${name}`)}`}>{t("social.report")}</a>
      ) : null}
      <button type="button" onClick={() => { if (window.confirm(t("social.blockConfirm", { name }))) onBlock(code); }}>{t("social.block")}</button>
    </span>
  );
}

export function FriendsView() {
  const t = useT();
  const { signedIn, ready, available } = useSignedIn();
  const [tab, setTab] = useState<Tab>("league");
  const social = useSocial(ready && signedIn);

  return (
    <main className="safe-top px-5 pb-32 [--pt:.5rem]">
      <BackLink fallback="/" previous label={t("ui.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </BackLink>
      <h1 className="title-display mt-1">{t("friends.title")}</h1>

      <div role="tablist" aria-label={t("friends.title")} className="mt-4 grid grid-cols-2 rounded-full bg-border/60 p-1">
        {(["league", "friends"] as const).map((k) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} onClick={() => setTab(k)}
                  className={`h-11 rounded-full text-[15px] font-bold transition-colors ${tab === k ? "bg-surface text-accent shadow-sm" : "text-muted"}`}>
            {t(k === "league" ? "friends.tabLeague" : "friends.tabFriends")}
          </button>
        ))}
      </div>

      {!ready ? null : tab === "league" ? (
        <div role="tabpanel" id="panel-league" aria-labelledby="tab-league">
          <Boards signedIn={signedIn} social={social} onJoin={() => setTab("friends")} />
        </div>
      ) : (
        <div role="tabpanel" id="panel-friends" aria-labelledby="tab-friends">
          {!signedIn ? (
            <section className="mt-5 rounded-[22px] border border-border bg-surface p-5">
              <p className="text-[15px] leading-snug">{t("friends.signIn")}</p>
              {available ? <div className="mt-3"><div className="ob rounded-[18px] p-3"><SignIn error={false} next="/friends" onNext={() => window.location.reload()} /></div></div> : null}
            </section>
          ) : social.load === "loading" ? (
            <p className="mt-8 text-center text-[14px] text-muted" aria-live="polite">…</p>
          ) : social.load !== "ready" ? (
            <Problem signin={social.load === "signin"} onRetry={social.retry} />
          ) : (
            <FriendsTab code={social.code} username={social.username} onUsername={social.setName} friends={social.friends} onChanged={social.reload} />
          )}
        </div>
      )}
    </main>
  );
}

function Problem({ signin, onRetry }: { signin: boolean; onRetry: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="mt-5 rounded-[22px] border border-border bg-surface p-5 text-center">
      <p className="text-[15px]">{signin ? t("friends.signIn") : t("friends.error")}</p>
      <button type="button" onClick={onRetry} aria-label={t("ui.retry")} className="btn-cyan mt-4 h-11 rounded-full px-6 text-[14.5px] font-bold"><span aria-hidden>↻</span></button>
    </div>
  );
}

/**
 * This week's race and this month's league. Signed in, the real readers of the reader's league come from the server; before
 * signing in it is the reader alone. Either way the board is topped up with practice readers (lib/social/rivals.ts), new
 * every week and every month, marked ✦ and explained under the board.
 */
function Boards({ signedIn, social, onJoin }: { signedIn: boolean; social: ReturnType<typeof useSocial>; onJoin: () => void }) {
  const t = useT();
  const locale = useLocale();
  const a = useAnswers();
  // The board is the device's own (its clock, its XP): it is drawn in the browser only, never on the server.
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [kind, setKind] = useState<Period>("week");
  const [asked, setAsked] = useState<Record<string, boolean>>({});
  const [blocked, onBlock] = useBlocked();
  // The practice readers keep reading through the day: the board is worked out again every minute.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(id); }, []);
  const ledgerRaw = useSyncExternalStore(subLedger, () => readRaw(LEDGER_KEY), () => "");
  const ledger = useMemo(() => parseLedger(ledgerRaw), [ledgerRaw]);
  const known = useMemo(() => new Set(social.friends.map((f) => f.code)), [social.friends]);
  const waiting = signedIn && social.load === "loading";
  const server = signedIn && social.load === "ready" ? social.boards[kind] : null;

  const rows: BoardRow[] = useMemo(() => {
    const level = levelFromXp(totalXp(ledger)).code;
    const mine = myXpIn(kind, ledger.days, now);
    const meName = a.name.trim() || t("league.you");
    const shownRows = server?.rows.filter((r) => r.me || !blocked.has(r.code)) ?? [];
    const real = shownRows.length ? shownRows.map((r) => (r.me ? { ...r, xp: Math.max(r.xp, mine) } : r)) : [{ rank: 1, code: social.code, name: meName, level, xp: mine, me: true, username: social.username }];
    const rivals = rivalsFor({ kind, now, seed: boardSeed(social.code), count: BOARD_SIZE, pace: paceOf(ledger.days, now), level });
    return mergeBoard(real, rivals, BOARD_SIZE);
  }, [kind, now, ledger, server, social.code, social.username, a.name, t, blocked]);

  if (waiting || !client) return <p className="mt-8 text-center text-[14px] text-muted" aria-live="polite">…</p>;
  const left = daysLeft(kind, now);
  const tierIx = kind === "month" ? (server?.tier ?? 0) : 0;
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(now);
  const rivals = rows.some((r) => r.rival);
  const size = rows.length;

  return (
    <section className="mt-4">
      <div role="radiogroup" aria-label={t("friends.tabLeague")} className="grid grid-cols-2 gap-2">
        {(["week", "month"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                  className={`opt h-11 rounded-2xl text-[14.5px] font-bold ${kind === k ? "opt-on" : ""}`}>
            {t(k === "week" ? "league.tabWeek" : "league.tabMonth")}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-[24px] bg-accent-bright p-5 text-on-cyan" data-board={kind}>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-on-cyan/75">{kind === "week" ? t("league.tabWeek") : t("league.month", { month: monthName })}</p>
        <p className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]" data-tier={kind === "month" ? TIERS[tierIx] : undefined}>
          {kind === "week" ? t("league.weekTitle") : t(`league.tier.${tierIx}` as "league.tier.0")}
        </p>
        <p className="mt-1 text-[13.5px] text-on-cyan/80">{left <= 1 ? t("league.lastDay") : t("league.daysLeft", { n: left })} · {kind === "week" ? t("league.weekIntro") : t("league.intro")}</p>
      </div>

      <ol className="mt-4 overflow-hidden rounded-[22px] border border-border bg-surface">
        {rows.map((r, i) => {
          const zone = kind === "month" ? zoneOf(r.rank, size) : null;
          const name = shown(r.name, r.code, r.username);
          return (
            <li key={r.key} data-me={r.me || undefined} data-rival={r.rival || undefined} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""} ${r.me ? "bg-accent-bright/20" : zone === "up" ? "bg-emerald-50/70" : zone === "down" ? "bg-rose-50/70" : ""}`}>
              <span className="w-6 shrink-0 text-center text-[15px] font-bold tabular-nums text-muted">{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</span>
              <Avatar name={name} me={r.me} hue={r.me ? undefined : r.hue} />
              <div className="min-w-0 flex-1">
                <p dir="auto" className="truncate text-[15.5px] font-semibold">
                  {r.me ? `${name} · ${t("league.you")}` : name}
                  {r.rival ? <span className="ms-1 text-[12px] text-faint" title={t("league.practice")} aria-label={t("league.practice")}>✦</span> : null}
                </p>
                <p className="truncate text-[12.5px] text-muted" dir="ltr">{[r.username && !r.me ? `@${r.username}` : "", r.level].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-[15px] font-bold tabular-nums">{t("league.xp", { xp: r.xp.toLocaleString(locale) })}</p>
                {signedIn && !r.me && !r.rival && r.code && !known.has(r.code) && !asked[r.code] ? (
                  <button type="button" onClick={() => { setAsked((o) => ({ ...o, [r.code]: true })); void addFriend(r.code).then(social.reload, () => setAsked((o) => ({ ...o, [r.code]: false }))); }}
                          className="mt-0.5 text-[12.5px] font-semibold text-accent">{t("league.addThem")}</button>
                ) : null}
                {signedIn && !r.me && !r.rival && r.code ? <Moderate code={r.code} name={name} onBlock={onBlock} /> : null}
              </div>
            </li>
          );
        })}
      </ol>

      {kind === "month" && size >= PROMOTE + DEMOTE + 1 ? (
        <p className="mt-3 flex flex-col gap-1 text-[12.5px] text-muted">
          <span><span aria-hidden className="me-1.5 inline-block size-2.5 rounded-full bg-emerald-400" />{t("league.zoneUp")}</span>
          <span><span aria-hidden className="me-1.5 inline-block size-2.5 rounded-full bg-rose-400" />{t("league.zoneDown")}</span>
        </p>
      ) : null}
      {rivals ? <p className="mt-3 text-[12.5px] leading-snug text-muted">{t("league.practiceNote")}</p> : null}
      {!signedIn ? (
        <button type="button" onClick={onJoin} className="btn-cyan mt-4 h-12 w-full rounded-full text-[15px] font-bold">{t("league.joinReal")}</button>
      ) : null}
    </section>
  );
}

const USERNAME_MESSAGE: Record<Exclude<UsernameResult, "ok">, Parameters<ReturnType<typeof useT>>[0]> = {
  taken: "friends.usernameTaken", invalid: "friends.usernameInvalid", no_profile: "friends.error", unavailable: "friends.error",
};

/** The reader's username: shown with a Change button, or a box to choose one. */
function UsernameCard({ username, onSaved }: { username: string; onSaved: (name: string) => void }) {
  const t = useT();
  const a = useAnswers();
  const [editing, setEditing] = useState(!username);
  const [text, setText] = useState(username || a.name.trim().toLowerCase().normalize("NFKD").replace(/[^a-z0-9_.]/g, "").slice(0, 20));
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const name = text.trim().replace(/^@/, "").toLowerCase();
    if (usernameProblem(name)) { setNote(t("friends.usernameInvalid")); return; }
    setBusy(true); setNote(null);
    try {
      const r = await setUsername(name);
      if (r === "ok") { onSaved(name); setEditing(false); setNote(t("friends.usernameSaved", { name })); }
      else setNote(t(USERNAME_MESSAGE[r]));
    } catch { setNote(t("friends.error")); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-[22px] border border-border bg-surface p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("friends.username")}</h2>
      {!editing && username ? (
        <div className="mt-2 flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-[26px] font-bold leading-tight text-accent" dir="ltr" data-username>@{username}</p>
          <button type="button" onClick={() => { setEditing(true); setNote(null); }} className="h-10 shrink-0 rounded-full border-2 border-border px-4 text-[14px] font-semibold active:bg-border/60">{t("friends.usernameEdit")}</button>
        </div>
      ) : (
        <form onSubmit={(e) => void save(e)} className="mt-3 flex gap-2.5">
          <div className="flex h-12 min-w-0 flex-1 items-center rounded-full border-2 border-border bg-background px-4 focus-within:border-accent-bright" dir="ltr">
            <span className="text-[16px] font-semibold text-muted" aria-hidden>@</span>
            <input value={text} onChange={(e) => setText(e.target.value.replace(/\s/g, "").toLowerCase())} maxLength={21} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                   placeholder={t("friends.usernamePlaceholder")} aria-label={t("friends.username")} className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none" />
          </div>
          <button type="submit" disabled={busy || !text.trim()} className="btn-cyan h-12 shrink-0 rounded-full px-5 text-[15px] font-bold disabled:opacity-50">{t("friends.usernameSave")}</button>
        </form>
      )}
      <p role="status" className="mt-2 min-h-5 text-[13px] leading-snug text-muted">{note ?? (editing ? t("friends.usernameHint") : "")}</p>
    </div>
  );
}

function FriendsTab({ code, username, onUsername, friends, onChanged }: { code: string; username: string; onUsername: (n: string) => void; friends: FriendRow[]; onChanged: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const [blocked, onBlock] = useBlocked();
  const seen = friends.filter((f) => !blocked.has(f.code));
  const incoming = seen.filter((f) => f.relation === "incoming");
  const outgoing = seen.filter((f) => f.relation === "outgoing");
  const mine = seen.filter((f) => f.relation === "friend");

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* the code is on screen to copy by hand */ }
  };
  const share = async () => {
    const message = username ? t("friends.shareTextName", { app: APP_NAME, name: username }) : t("friends.shareText", { app: APP_NAME, code });
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
      const r = await addFriend(text.trim());
      setNote(t(ADD_MESSAGE[r]));
      if (r === "sent" || r === "accepted") { setText(""); onChanged(); }
    } catch {
      setNote(t("friends.error"));
    } finally {
      setBusy(false);
    }
  };
  const act = (fn: () => Promise<void>) => () => { void fn().then(onChanged, () => setNote(t("friends.error"))); };
  const label = (f: FriendRow) => shown(f.name, f.code, f.username);

  return (
    <section className="mt-5 space-y-6">
      <UsernameCard username={username} onSaved={onUsername} />

      <div className="rounded-[22px] border border-border bg-surface p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("friends.yourCode")}</h2>
        <p className="mt-2 select-all text-[28px] font-bold leading-none tracking-[0.12em] text-accent" dir="ltr" data-code>{code.replace(/(.{4})/, "$1 ")}</p>
        <div className="mt-4 flex gap-2.5">
          <button type="button" onClick={() => void copy()} className="h-11 flex-1 rounded-full border-2 border-border text-[14.5px] font-bold active:bg-border/60">{copied ? t("friends.copied") : t("friends.copy")}</button>
          <button type="button" onClick={() => void share()} className="btn-cyan h-11 flex-1 rounded-full text-[14.5px] font-bold">{t("friends.share")}</button>
        </div>
      </div>

      <form onSubmit={(e) => void submit(e)} className="rounded-[22px] border border-border bg-surface p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("friends.addTitle")}</h2>
        <div className="mt-3 flex gap-2.5">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={22} autoCapitalize="none" autoCorrect="off" spellCheck={false} dir="ltr"
                 placeholder={t("friends.addPlaceholder")} aria-label={t("friends.addPlaceholder")}
                 className="h-12 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 text-[16px] font-semibold outline-none focus:border-accent-bright" />
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
                <Avatar name={label(f)} hue={hueOf(f.username || f.name || f.code)} />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-[15.5px] font-semibold">{label(f)}</p>
                  {f.username && f.name ? <p className="truncate text-[12.5px] text-muted" dir="ltr">@{f.username}</p> : null}
                </div>
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
                <Avatar name={label(f)} hue={hueOf(f.username || f.name || f.code)} />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-[15.5px] font-semibold">{label(f)} <span className="text-[12.5px] font-medium text-muted">{f.level}</span></p>
                  <p className="truncate text-[12.5px] text-muted">{f.username && f.name ? <span dir="ltr">@{f.username} · </span> : null}{t("friends.thisMonth", { xp: f.xpMonth.toLocaleString(locale) })}{f.streak > 0 ? ` · ${t("friends.streak", { n: f.streak })}` : ""}</p>
                </div>
<Moderate code={f.code} name={label(f)} onBlock={(c) => { onBlock(c); void act(() => removeFriend(f.id))(); }} />
                                <button type="button" onClick={() => { if (window.confirm(t("friends.removeConfirm", { name: label(f) }))) void act(() => removeFriend(f.id))(); }} aria-label={`${t("friends.remove")}: ${label(f)}`} className="grid size-10 shrink-0 place-items-center rounded-full text-muted active:bg-border/60">
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
                <Avatar name={label(f)} hue={hueOf(f.username || f.name || f.code)} />
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-[15.5px] font-semibold">{label(f)}</p>
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
