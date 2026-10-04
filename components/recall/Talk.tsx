"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { SignIn } from "@/components/onboarding/SignIn";
import "../../app/welcome/welcome.css";
import { MASCOT_NAME } from "@/lib/brand";
import { useT } from "@/lib/i18n/react";
import { LANGUAGES } from "@/lib/onboarding/languages";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { canSpeak, speak, stopSpeaking } from "@/lib/reading/speak";
import { useDeviceReady } from "@/lib/srs/use";
import { MAX_CHARS, TOPICS, type Reply, type TalkLevel, type Turn } from "@/lib/talk/shared";

interface Line extends Turn { translation?: string; correction?: string }
type Problem = "not_ready" | "sign_in" | "limit" | "error" | null;

/** The slice of the browser's speech recognition this screen uses (Chrome and Safari; not every browser has it). */
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
}
const recognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Talk({ ready: switchedOn = true }: { /** Whether the server can run Talk (a model key and a database), worked out on the server. */ ready?: boolean }) {
  const ready = useDeviceReady();
  return <main className="safe-top safe-bottom flex h-dvh flex-col [--pb:.75rem] [--pt:.25rem]">{ready ? <Chat switchedOn={switchedOn} /> : null}</main>;
}

function Chat({ switchedOn }: { switchedOn: boolean }) {
  const t = useT();
  const a = useAnswers();
  const learn = a.learn;
  const learnName = LANGUAGES.find((l) => l.code === learn)?.native ?? "";
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [listening, setListening] = useState(false);
  const [talking, setTalking] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const rec = useRef<Recognition | null>(null);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    return () => { live.current = false; stopSpeaking(); try { rec.current?.stop(); } catch { /* not started */ } };
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [lines, busy, problem]);

  const send = useCallback(async (said: string, fromInput = false) => {
    const msg = said.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
    if (!msg || busy || !learn) return;
    const next: Line[] = [...lines, { role: "user", text: msg }];
    setLines(next);
    if (fromInput) setText("");
    setProblem(null);
    setBusy(true);
    try {
      const res = await fetch("/api/talk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang: learn, native: a.language, level: (a.level ?? "A1").slice(0, 2) as TalkLevel, name: a.name, turns: next.map(({ role, text }) => ({ role, text })) }),
      });
      if (!live.current) return;
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: string }).error;
        // The message goes back in the box so nothing typed is lost.
        setLines(lines);
        if (fromInput) setText(msg);
        setProblem(code === "not_ready" || code === "sign_in" || code === "limit" ? code : "error");
        return;
      }
      const data = (await res.json()) as Reply;
      setLines([...next, { role: "assistant", text: data.reply, translation: data.translation, correction: data.correction }]);
    } catch {
      if (!live.current) return;
      setLines(lines);
      if (fromInput) setText(msg);
      setProblem("error");
    } finally {
      if (live.current) setBusy(false);
    }
  }, [a.language, a.level, a.name, busy, learn, lines]);

  const say = useCallback((line: string) => {
    if (!learn) return;
    setTalking(true);
    const ok = speak(line, learn, 0.9, () => setTalking(false));
    if (!ok) { setTalking(false); return; }
    // The utterance has no handy "finished" here; the beak rests after a time proportional to the line.
    window.setTimeout(() => { if (live.current) setTalking(false); }, Math.min(12_000, 700 + line.length * 70));
  }, [learn]);

  const listen = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || !learn) return;
    if (listening) { try { rec.current?.stop(); } catch { /* already stopped */ } return; }
    stopSpeaking();
    const r = new Ctor();
    r.lang = learn;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => { const said = e.results[0]?.[0]?.transcript ?? ""; if (said) setText((cur) => (cur ? `${cur} ${said}` : said)); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    rec.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, [learn, listening]);

  const header = (
    <header className="flex items-center gap-2 px-4 pb-2">
      <Link href="/recall" aria-label={t("cards.back")} className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-full active:bg-border/60">
        <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </Link>
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-bright/25">
        <Mascot mood={busy ? "reading" : "hello"} talking={talking} crop="head" className="block h-10 w-auto" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-bold leading-tight">{t("talk.title", { name: MASCOT_NAME })}</h1>
        <p className="truncate text-[12.5px] text-muted" aria-live="polite">{busy ? t("talk.thinking", { name: MASCOT_NAME }) : learnName}</p>
      </div>
      {lines.length > 0 ? (
        <button type="button" aria-label={t("talk.new")} title={t("talk.new")} onClick={() => { stopSpeaking(); setLines([]); setOpen({}); setProblem(null); setText(""); }} className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-accent active:bg-border/60">
          <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </button>
      ) : null}
    </header>
  );

  if (!learn) {
    return (
      <>
        {header}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-[15px] text-muted">{t("recall.deckPick")}</p>
          <Link href="/languages" className="btn-cyan mt-4 flex h-12 items-center rounded-full px-7 text-[15px] font-bold">{t("languages.title")}</Link>
        </div>
      </>
    );
  }

  if (!switchedOn) {
    return (
      <>
        {header}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <Mascot mood="sleepy" className="block h-[130px] w-auto" />
          <p role="status" className="mt-4 max-w-[17rem] text-[15.5px] leading-snug text-muted">{t("talk.notReady")}</p>
        </div>
      </>
    );
  }

  const canMic = recognitionCtor() !== null;
  return (
    <>
      {header}
      <div className="flex-1 overflow-y-auto px-4 py-3" role="log" aria-live="polite">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center pt-6 text-center">
            <Mascot mood="hello" talking className="block h-[130px] w-auto" />
            <button type="button" onClick={() => void send(t("talk.start", { language: learnName }))} className="btn-cyan mt-5 h-12 rounded-full px-7 text-[15.5px] font-bold">{t("talk.start", { language: learnName })}</button>
            <p className="mt-7 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("talk.topics")}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {TOPICS.map((k) => (
                <button key={k} type="button" onClick={() => void send(t(`talk.topic.${k}`))} className="h-11 rounded-full border border-border bg-surface px-4 text-[14px] font-semibold active:bg-border/60">{t(`talk.topic.${k}`)}</button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {lines.map((l, i) => (
              <li key={i} className={l.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-[20px] px-4 py-2.5 ${l.role === "user" ? "rounded-ee-md bg-accent-bright text-on-cyan" : "rounded-es-md border border-border bg-surface"}`}>
                  <p lang={l.role === "assistant" ? learn : undefined} dir="auto" className="text-[16.5px] leading-snug">{l.text}</p>
                  {l.role === "assistant" ? (
                    <>
                      <div className="mt-2 flex items-center gap-1.5">
                        {canSpeak() ? (
                          <button type="button" onClick={() => say(l.text)} aria-label={t("reader.listenPage")} className="grid size-9 place-items-center rounded-full text-accent active:bg-border/60">
                            <svg viewBox="0 0 24 24" className="size-5" {...stroke} aria-hidden><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
                          </button>
                        ) : null}
                        {l.translation ? (
                          <button type="button" aria-expanded={!!open[i]} onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))} className="h-9 rounded-full px-3 text-[13px] font-semibold text-accent active:bg-border/60">{open[i] ? t("talk.hide") : t("talk.translate")}</button>
                        ) : null}
                      </div>
                      {open[i] && l.translation ? <p dir="auto" className="mt-1 text-[14.5px] leading-snug text-muted">{l.translation}</p> : null}
                    </>
                  ) : null}
                </div>
              </li>
            ))}
            {/* A kind note about the reader's last message, once Pluto has answered. */}
            {lines.at(-1)?.role === "assistant" && lines.at(-1)?.correction ? (
              <li className="flex justify-start">
                <div className="max-w-[85%] rounded-[16px] border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-amber-900">
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em]">{t("talk.correction")}</p>
                  <p dir="auto" className="mt-0.5 text-[14.5px] leading-snug">{lines.at(-1)?.correction}</p>
                </div>
              </li>
            ) : null}
            {busy ? (
              <li className="flex justify-start" aria-hidden>
                <div className="flex gap-1.5 rounded-[20px] rounded-es-md border border-border bg-surface px-4 py-3.5">
                  {[0, 1, 2].map((d) => <span key={d} className="size-2 animate-pulse rounded-full bg-accent-bright" style={{ animationDelay: `${d * 160}ms` }} />)}
                </div>
              </li>
            ) : null}
          </ul>
        )}

        {problem ? (
          <div role="alert" className="mx-auto mt-4 max-w-[22rem] rounded-[18px] border border-border bg-surface p-4 text-center text-[14.5px] leading-snug">
            {problem === "sign_in" ? (
              <>
                <p className="mb-3">{t("talk.signIn", { name: MASCOT_NAME })}</p>
                <div className="ob rounded-[18px] p-3 text-start"><SignIn error={false} next="/recall/talk" onNext={() => window.location.reload()} /></div>
              </>
            ) : (
              <p>{problem === "not_ready" ? t("talk.notReady") : problem === "limit" ? t("talk.limit") : t("talk.error")}</p>
            )}
          </div>
        ) : null}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void send(text, true); }}
        className="flex items-end gap-2 border-t border-border bg-background px-4 pt-3"
      >
        {canMic ? (
          <button type="button" onClick={listen} aria-pressed={listening} aria-label={listening ? t("talk.listening") : t("talk.mic")} className={`grid size-12 shrink-0 place-items-center rounded-full border-2 ${listening ? "animate-pulse border-rose-400 bg-rose-50 text-rose-600" : "border-border text-accent active:bg-border/60"}`}>
            <svg viewBox="0 0 24 24" className="size-6" {...stroke} aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
          </button>
        ) : null}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_CHARS}
          lang={learn}
          dir="auto"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="send"
          placeholder={listening ? t("talk.listening") : t("talk.placeholder", { language: learnName })}
          aria-label={t("talk.placeholder", { language: learnName })}
          className="h-12 min-w-0 flex-1 rounded-full border-2 border-border bg-surface px-4 text-[16px] outline-none focus:border-accent-bright"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label={t("talk.send")} className="btn-cyan grid size-12 shrink-0 place-items-center rounded-full disabled:opacity-50">
          <svg viewBox="0 0 24 24" className="size-5 rtl:-scale-x-100" {...stroke} aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
    </>
  );
}
