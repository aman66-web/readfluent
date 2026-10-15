import { onNativeShell } from "@/lib/auth/shell";

/**
 * Hearing the reader through the browser's own speech recognition (desktop Chrome and Safari, Safari on the iPhone; the
 * browser's, not ours: nothing is recorded or sent by the app, and no model of ours is called). Where there is none,
 * `canListen` is false and the speaking questions are left out, not shown broken (components/tests/LevelTestRunner.tsx).
 *
 * Inside the iPhone and Android apps there is none that works: an app's web view (WKWebView on the iPhone, WebView on
 * Android) gives a page no working speech recognition, even where the name is there. So in the app `canListen` is false
 * whatever the web view claims, and the app never offers a microphone that cannot hear (App Review, 15 Oct 2026). The
 * check (lib/auth/shell.ts) is the same answer as lib/auth/native.ts `isNative`, without loading Capacitor here.
 */
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives?: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort?(): void;
}
type Ctor = new () => Recognition;

const ctor = (): Ctor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canListen = (): boolean => !onNativeShell() && ctor() !== null;

/**
 * Why nothing was heard. "none": speech cannot be recognised here at all (no recogniser, its service is switched off,
 * or it does not know the language), so asking again will not help and the speaking part is left out. "denied": the
 * microphone was refused.
 */
export type ListenFail = "denied" | "none" | "network" | "silent" | "other";

/** A recogniser's error, as a reason. "service-not-allowed" is the service being off (Siri and Dictation off on the iPhone, or a browser that has none), not the microphone being refused. */
export function listenFail(error: string | undefined): ListenFail {
  if (error === "not-allowed") return "denied";
  if (error === "service-not-allowed" || error === "language-not-supported") return "none";
  if (error === "network") return "network";
  if (error === "no-speech" || error === "aborted") return "silent";
  return "other";
}

/** Listens once for a sentence in `lang`. `done` hears what was said (several guesses, best first) or why nothing was. Returns a stop function. */
export function listenOnce(lang: string, done: (heard: string[] | null, fail?: ListenFail) => void): () => void {
  const C = canListen() ? ctor() : null;
  if (!C) { done(null, "none"); return () => {}; }
  const r = new C();
  r.lang = lang;
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 3;
  let said: string[] = [];
  let failed: ListenFail | undefined;
  let finished = false;
  const finish = () => { if (finished) return; finished = true; done(said.length ? said : null, said.length ? undefined : (failed ?? "silent")); };
  r.onresult = (e) => { said = Array.from(e.results[0] ?? []).map((a) => a.transcript).filter(Boolean); };
  r.onerror = (e) => { failed = listenFail(e.error); };
  r.onend = finish;
  try { r.start(); } catch { finished = true; done(null, "other"); return () => {}; }
  return () => { try { r.stop(); } catch { /* already over */ } };
}

/** How good the connection looks: a small file from our own server, timed, with the browser's own hint as a tiebreak. */
export type Connection = "good" | "slow" | "offline";
export async function checkConnection(): Promise<Connection> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  const c = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (c?.effectiveType && /^(slow-2g|2g)$/.test(c.effectiveType)) return "slow";
  const t0 = performance.now();
  try {
    const res = await fetch(`/icon-192.png?ping=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return "slow";
    await res.arrayBuffer();
  } catch { return "offline"; }
  const ms = performance.now() - t0;
  return ms < 1200 && c?.effectiveType !== "3g" ? "good" : "slow";
}

/** Listens to the room for a moment and says whether it is quiet enough to be heard in: null if the microphone cannot be opened. */
export async function checkQuiet(ms = 1600): Promise<{ quiet: boolean; level: number } | null> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) { stream.getTracks().forEach((t) => t.stop()); return null; }
    const ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    let peak = 0;
    let sum = 0;
    let n = 0;
    const until = performance.now() + ms;
    while (performance.now() < until) {
      await new Promise((res) => setTimeout(res, 80));
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (const v of buf) s += v * v;
      const rms = Math.sqrt(s / buf.length);
      peak = Math.max(peak, rms);
      sum += rms; n++;
    }
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    const level = n ? sum / n : peak;
    // A quiet room is around 0.005 to 0.02 on this scale; speech and a TV or street are above 0.04.
    return { quiet: level < 0.035 && peak < 0.15, level };
  } catch { return null; }
}
