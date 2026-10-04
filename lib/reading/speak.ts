/**
 * Saying a word aloud with the phone's own voice (the Web Speech API). Not a model and not a
 * network call; where the device has no voice it says so and the reader gets a toast.
 * Recorded lines are M6.
 */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Whether a voice list that is not empty has nothing for this language. An empty list is "not loaded yet", not "none". */
export function noVoiceFor(voices: { lang: string }[], lang: string): boolean {
  if (voices.length === 0) return false;
  const want = lang.toLowerCase().split("-")[0];
  return !voices.some((v) => v.lang.toLowerCase().replace("_", "-").split("-")[0] === want);
}

/**
 * Say `text` in `lang` at `rate` (1 is normal). False where the device cannot; `onFail` hears of a
 * failure that only shows once speech starts, and `onEnd` of the speech stopping for any reason.
 */
export function speak(text: string, lang: string, rate: number, onFail?: () => void, onEnd?: () => void): boolean {
  if (!canSpeak()) return false;
  try {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (noVoiceFor(voices, lang)) return false;
    const busy = synth.speaking || synth.pending;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    // Name the voice: on a phone a bare "fr" can fall back to the device's own language, which then says nothing or the wrong thing.
    const want = lang.toLowerCase().split("-")[0];
    const pool = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").split("-")[0] === want);
    const voice = pool.find((v) => v.lang.toLowerCase().replace("_", "-") === lang.toLowerCase() && v.localService) ?? pool.find((v) => v.localService) ?? pool[0];
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    // Cancelling the last utterance also fires an error ("interrupted"/"canceled"); only a real one counts.
    u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") onFail?.(); onEnd?.(); };
    u.onend = () => onEnd?.();
    // Speech started in the same moment as a cancel is dropped by iOS: give it a beat.
    const go = () => { try { if (synth.paused) synth.resume(); synth.speak(u); } catch { onFail?.(); onEnd?.(); } };
    if (busy) window.setTimeout(go, 60); else go();
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  try { window.speechSynthesis.cancel(); } catch { /* nothing to stop */ }
}

/** Whether the device can say `lang` out loud: waits (briefly) for the voice list, which some browsers fill late. */
export function hasVoiceFor(lang: string): Promise<boolean> {
  if (!canSpeak()) return Promise.resolve(false);
  const synth = window.speechSynthesis;
  const check = () => !noVoiceFor(synth.getVoices(), lang) && synth.getVoices().length > 0;
  if (synth.getVoices().length > 0) return Promise.resolve(check());
  return new Promise((resolve) => {
    const done = () => { synth.removeEventListener?.("voiceschanged", done); window.clearTimeout(timer); resolve(check()); };
    const timer = window.setTimeout(done, 1500);
    synth.addEventListener?.("voiceschanged", done);
  });
}
