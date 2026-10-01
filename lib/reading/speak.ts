/**
 * Saying a word aloud with the phone's own voice (the Web Speech API). Not a model and not a
 * network call; where the device has no voice it says so and the reader gets a toast.
 * Recorded lines are M6.
 */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Say `text` in `lang` at `rate` (1 is normal). False where the device cannot. */
export function speak(text: string, lang: string, rate: number): boolean {
  if (!canSpeak()) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  try { window.speechSynthesis.cancel(); } catch { /* nothing to stop */ }
}
