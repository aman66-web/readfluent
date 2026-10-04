/**
 * What happens when the reader switches the language they are learning (owner, 4 Oct 2026: show that the app is "now personalising to
 * the new language, the books, etc." and let them in only when it is ready). Each step really does something: moves the level and
 * progress, gets the phone's translator ready for the language, fetches the flashcard decks and the tests, and starts the
 * library translating. The screen (components/library/LanguageSwitching.tsx) shows each step as it goes.
 */
export type StepId = "progress" | "decks" | "tests" | "translator" | "books";
export const STEPS: readonly StepId[] = ["progress", "decks", "tests", "translator", "books"];
export type StepState = "wait" | "active" | "done" | "skipped" | "failed";

export interface SwitchResult {
  /** The phone's translator: ready, not on this device, or not finished (the book's own button and the background work finish it). */
  translator: "ready" | "unsupported" | "pending";
  offline: boolean;
}

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** `onStep` hears every change. Each step shows for at least `minMs`, so a quick one is still seen to happen; the translator step waits up to `translatorMs` for the phone's download. */
export async function runSwitch(lang: string, opts: {
  level?: string | null; liked?: readonly string[]; onStep: (id: StepId, state: StepState) => void; minMs?: number; translatorMs?: number; live?: () => boolean;
}): Promise<SwitchResult> {
  const { onStep, minMs = 650, translatorMs = 120_000, live = () => true } = opts;
  const result: SwitchResult = { translator: "unsupported", offline: typeof navigator !== "undefined" && navigator.onLine === false };
  const step = async (id: StepId, work: () => Promise<StepState>) => {
    if (!live()) return;
    onStep(id, "active");
    const started = Date.now();
    let state: StepState = "failed";
    try { state = await work(); } catch { state = "failed"; }
    const left = minMs - (Date.now() - started);
    if (left > 0) await pause(left);
    onStep(id, state);
  };

  // The level and the XP were moved the moment the language was picked (lib/xp/ledger.ts); this step is the reader seeing it.
  await step("progress", async () => "done");

  await step("decks", async () => {
    const [{ loadDeck }, { loadTopics }] = await Promise.all([import("@/lib/decks"), import("@/lib/decks/topics")]);
    const [deck, topics] = await Promise.all([loadDeck(lang), loadTopics(lang)]);
    return deck.length || Object.keys(topics).length ? "done" : "failed";
  });

  await step("tests", async () => {
    const r = await fetch(`/api/level-test?lang=${encodeURIComponent(lang)}`);
    if (!r.ok) return "failed";
    const d = (await r.json()) as { levels?: string[] };
    return d.levels?.length ? "done" : "failed";
  });

  await step("translator", async () => {
    if (lang === "en") { result.translator = "ready"; return "skipped"; }
    const { deviceKind, devicePrepare, deviceStatus } = await import("./device");
    const { markPreparing } = await import("./prepare");
    if (!deviceKind()) { result.translator = "unsupported"; return "skipped"; }
    let status = await deviceStatus("en", lang);
    if (status === "download") {
      markPreparing(lang);
      await Promise.race([devicePrepare("en", lang), pause(translatorMs)]);
      status = await deviceStatus("en", lang);
    }
    if (status === "ready") { result.translator = "ready"; return "done"; }
    if (status === "unsupported") { result.translator = "unsupported"; return "skipped"; }
    result.translator = "pending";
    return "failed";
  });

  await step("books", async () => {
    if (lang === "en") return "skipped";
    const { startBackground } = await import("./background");
    startBackground(lang, opts.level, opts.liked ?? []);
    return "done";
  });

  return result;
}
