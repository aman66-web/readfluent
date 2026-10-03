"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FirstScreen } from "@/components/welcome/FirstScreen";
import { GoScreen, HeardScreen, HelloScreen, QuickScreen } from "@/components/onboarding/Questions";
import { AppLanguageScreen } from "@/components/onboarding/AppLanguage";
import { TonguesScreen } from "@/components/onboarding/Tongues";
import { markOnboarded } from "@/lib/onboarding";
import {
  ANSWERS_KEY, parseAnswers, saveAnswers,
} from "@/lib/onboarding/answers";
import { DEFAULT_MINUTES } from "@/lib/onboarding/firstrun";
import { reportFirstRun } from "@/lib/onboarding/report";
import { AFTER_ONBOARDING, PLACEMENT_PATH, STEP_IDS, isInterlude, isShowStep, stepIndex } from "@/lib/onboarding/steps";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { setGates, startAt } from "@/lib/xp/ledger";

/**
 * First run: the welcome (a wall of book covers), which languages (the one you speak
 * and the one you want to learn), the guide's hello and its two
 * questions, how much time a day they can give it and how long that takes to reach each
 * level, the guide's tour of what the app does (three screens), where that time takes them, a promise,
 * sign in or sign up, what you are curious about, and the library being
 * set up — which saves the answers and opens the library.
 *
 * Every step can be skipped and Back always works. The progress bar counts exactly
 * these steps. `/welcome?step=<id>` opens any step directly (lib/onboarding/steps.ts),
 * which is also how a provider sign-in comes back and how a screen is looked at.
 * Nothing is typed except the optional "somewhere else" and the sign-in itself.
 */

const subscribeAnswers = subscribeTo(ANSWERS_KEY);
const readAnswersRaw = () => readRaw(ANSWERS_KEY);
// On the server there is no device storage: "" is what the first client render also shows.
const serverAnswersRaw = () => "";

/* The later screens load as their own pieces, so the first paint does not wait for
   screens nobody has reached yet; they are fetched in the background once the first
   one is up (see the effect in Welcome), so moving on never waits for them. */
const loaders = {
  tour: () => import("@/components/onboarding/Tour").then((m) => m.TourScreen),
  plan: () => import("@/components/onboarding/Plan"),
  level: () => import("@/components/onboarding/Level").then((m) => m.LevelScreen),
  home: () => import("@/components/onboarding/Home").then((m) => m.HomeScreen),
  last: () => import("@/components/onboarding/Last"),
  ready: () => import("@/components/onboarding/Ready").then((m) => m.ReadyScreen),
};
const TourScreen = dynamic(loaders.tour);
const LevelScreen = dynamic(loaders.level);
const HomeScreen = dynamic(loaders.home);
const ReadyScreen = dynamic(loaders.ready);
const TimeScreen = dynamic(() => loaders.plan().then((m) => m.TimeScreen));
const PathScreen = dynamic(() => loaders.plan().then((m) => m.PathScreen));
const PledgeScreen = dynamic(() => loaders.plan().then((m) => m.PledgeScreen));
const AccountScreen = dynamic(() => loaders.last().then((m) => m.AccountScreen));
const InterestsScreen = dynamic(() => loaders.last().then((m) => m.InterestsScreen));

export function Welcome({ initialStep, authError, built, signedIn }: {
  initialStep: number;
  /** A provider sign-in that failed comes back to `?step=account&error=auth`. */
  authError: boolean;
  /** Back from the level test: the library was already built once. */
  built: boolean;
  /** Back from a provider sign-in (`&signedin=1`). */
  signedIn: boolean;
}) {
  const router = useRouter();
  const [i, setI] = useState(initialStep);
  const iRef = useRef(initialStep);
  useEffect(() => { iRef.current = i; });

  // What they have answered so far, from the device: a store subscription rather than
  // state, so the first render matches the server's and an answer survives a reload.
  const raw = useSyncExternalStore(subscribeAnswers, readAnswersRaw, serverAnswersRaw);
  const a = useMemo(() => parseAnswers(raw), [raw]);
  const minutes = a.daily ?? DEFAULT_MINUTES;

  const step = STEP_IDS[i];
  const last = i === STEP_IDS.length - 1;
  // A double tap on Continue must not skip a screen, and "I have an account" must come back to where it left from.
  const changedAt = useRef(0);
  const jumpedFrom = useRef<number | null>(null);
  // Signed in at the very start: the sign-in screen later in the run is then skipped.
  const signedEarly = useRef(false);
  // How many steps this visit has pushed onto the browser's history, so Back can use it.
  const pushed = useRef(0);
  const go = (n: number, mode: "push" | "replace" = "replace") => {
    const to = Math.max(0, Math.min(STEP_IDS.length - 1, n));
    changedAt.current = Date.now();
    setI(to);
    // So the address always says which screen this is, and a reload stays on it. A step forward is a new entry,
    // so the phone's own Back goes to the screen before instead of leaving; the screen that moves on by itself replaces.
    if (mode === "push") { pushed.current += 1; window.history.pushState(null, "", `/welcome?step=${STEP_IDS[to]}`); }
    else window.history.replaceState(null, "", `/welcome?step=${STEP_IDS[to]}`);
  };
  const settling = () => Date.now() - changedAt.current < 350;
  const next = () => {
    if (settling()) return;
    if (last) { finish(); return; }
    const mode = isInterlude(step) ? "replace" : "push";
    // Signed in before any question was asked: the questions come now, and the sign-in screen is not shown twice.
    if (step === "account" && !a.learn && (jumpedFrom.current !== null || signedEarly.current)) {
      jumpedFrom.current = null; signedEarly.current = true;
      go(STEP_IDS.indexOf("hello"), mode);
      return;
    }
    if (step === "home" && signedEarly.current) { go(STEP_IDS.indexOf("interests"), mode); return; }
    go(i + 1, mode);
  };
  const back = () => {
    if (settling()) return;
    // The way back is the browser's own, when this visit has walked here; the popstate listener below follows it.
    if (pushed.current > 0) { changedAt.current = Date.now(); window.history.back(); return; }
    if (step === "account" && jumpedFrom.current !== null) { const to = jumpedFrom.current; jumpedFrom.current = null; go(to); return; }
    go(isInterlude(STEP_IDS[i - 1]) ? i - 2 : i - 1);
  };

  /* The end of the run is the library. What was picked is already saved; the
     answers are reported once (only the choices), and the first screen is marked
     seen so the front door stops sending this device here. */
  const finish = () => {
    reportFirstRun(a, minutes);
    // Their XP starts at the floor of the level they said or the test found.
    startAt(a.level);
    // Which levels the language being learned can examine (lib/xp/exam.ts).
    setGates(a.learn);
    markOnboarded();
    // A full page load, not the app's router: the cookie is set, so the server opens the home screen, and nothing
    // the router remembered from before the cookie existed (a cached redirect back to this page) can answer instead.
    window.location.replace(AFTER_ONBOARDING);
  };

  // The phone's Back (or a swipe) walks back through the steps; a screen that moves on by itself is never landed on.
  useEffect(() => {
    const onPop = () => {
      const to = stepIndex(new URLSearchParams(window.location.search).get("step"));
      pushed.current = Math.max(0, pushed.current + (to < iRef.current ? -1 : 1));
      changedAt.current = Date.now();
      if (isInterlude(STEP_IDS[to])) {
        if (pushed.current > 0) { window.history.back(); return; }
        const before = Math.max(0, to - 1);
        setI(before);
        window.history.replaceState(null, "", `/welcome?step=${STEP_IDS[before]}`);
        return;
      }
      setI(to);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Fetch the later screens in the background once this one is up.
  useEffect(() => {
    const warm = () => { for (const load of Object.values(loaders)) void load(); };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(warm); else window.setTimeout(warm, 1500);
  }, []);

  // Back from a provider sign-in with no language chosen: the questions still come first.
  const cameBack = useRef(signedIn);
  useEffect(() => {
    if (!cameBack.current) return;
    cameBack.current = false;
    if (!parseAnswers(readRaw(ANSWERS_KEY)).learn && !jumpedFrom.current) { signedEarly.current = true; go(STEP_IDS.indexOf("hello")); }
  }, []);

  // The first screen is its own layout: the wall of covers and the way in, with no
  // progress bar and no footer.
  // The very first screen: the language of the app itself, before anything else is said.
  if (step === "app") return <AppLanguageScreen onContinue={next} />;

  if (step === "intro") {
    const account = STEP_IDS.indexOf("account");
    return <FirstScreen onStart={next} onBack={back} onSignIn={() => { jumpedFrom.current = i; go(account, "push"); }} />;
  }

  const nav = { at: i, of: STEP_IDS.length, onBack: back, onContinue: next };
  if (step === "tongues") {
    return (
      <TonguesScreen {...nav} speak={a.language} learn={a.learn} />
    );
  }
  if (step === "hello") return <HelloScreen {...nav} />;
  if (step === "quick") return <QuickScreen {...nav} />;
  if (step === "go") return <GoScreen {...nav} />;
  if (step === "level") {
    return (
      <LevelScreen {...nav} learn={a.learn} value={a.level} placed={a.placed}
                   onPick={(level) => saveAnswers({ level, placed: false })} />
    );
  }
  if (step === "heard") {
    return (
      <HeardScreen {...nav} value={a.heard} other={a.heardOther}
                   onPick={(heard) => saveAnswers({ heard })} onOther={(heardOther) => saveAnswers({ heardOther })} />
    );
  }
  if (step === "time") return <TimeScreen {...nav} learn={a.learn} value={a.daily} onPick={(daily) => saveAnswers({ daily })} />;
  if (step === "path") return <PathScreen {...nav} level={a.level} minutes={minutes} />;
  if (isShowStep(step)) return <TourScreen key={step} id={step} learn={a.learn} {...nav} />;
  if (step === "pledge") {
    return <PledgeScreen {...nav} minutes={minutes} done={a.pledged} onDone={() => saveAnswers({ pledged: true })} />;
  }
  if (step === "home") return <HomeScreen {...nav} />;
  if (step === "account") return <AccountScreen at={i} of={STEP_IDS.length} onBack={back} error={authError} onNext={next} />;
  if (step === "interests") return <InterestsScreen {...nav} value={a.interests} onChange={(interests) => saveAnswers({ interests })} />;
  return <ReadyScreen {...nav} interests={a.interests} minutes={minutes} level={a.level} learn={a.learn} built={built} onTest={() => router.push(PLACEMENT_PATH)} />;
}
