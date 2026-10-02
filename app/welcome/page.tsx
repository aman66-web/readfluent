"use client";

import "./welcome.css";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FirstScreen } from "@/components/welcome/FirstScreen";
import { GoScreen, HeardScreen, HelloScreen, QuickScreen } from "@/components/onboarding/Questions";
import { ReadyScreen } from "@/components/onboarding/Ready";
import { PathScreen, PledgeScreen, TimeScreen } from "@/components/onboarding/Plan";
import { AppLanguageScreen } from "@/components/onboarding/AppLanguage";
import { HomeScreen } from "@/components/onboarding/Home";
import { LevelScreen } from "@/components/onboarding/Level";
import { TonguesScreen } from "@/components/onboarding/Tongues";
import { AccountScreen, InterestsScreen } from "@/components/onboarding/Last";
import { TourScreen } from "@/components/onboarding/Tour";
import { display, jakarta } from "@/lib/fonts";
import { markOnboarded } from "@/lib/onboarding";
import {
  ANSWERS_KEY, parseAnswers, saveAnswers,
} from "@/lib/onboarding/answers";
import { DEFAULT_MINUTES } from "@/lib/onboarding/firstrun";
import { reportFirstRun } from "@/lib/onboarding/report";
import { AFTER_ONBOARDING, PLACEMENT_PATH, STEP_IDS, isInterlude, isShowStep, stepIndex } from "@/lib/onboarding/steps";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { startAt } from "@/lib/xp/ledger";

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

export default function WelcomePage() {
  // useSearchParams needs a Suspense boundary above it for the static shell.
  return (
    <div className={`${jakarta.variable} ${display.variable} min-h-dvh bg-white`}>
      <Suspense fallback={null}>
        <Welcome />
      </Suspense>
    </div>
  );
}

function Welcome() {
  const router = useRouter();
  const params = useSearchParams();
  const [i, setI] = useState(() => stepIndex(params.get("step")));
  // A provider sign-in that failed comes back to `?step=account&error=auth`.
  const authError = params.get("error") === "auth";

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
  const go = (n: number) => {
    const to = Math.max(0, Math.min(STEP_IDS.length - 1, n));
    changedAt.current = Date.now();
    setI(to);
    // So the address always says which screen this is, and a reload stays on it.
    window.history.replaceState(null, "", `/welcome?step=${STEP_IDS[to]}`);
  };
  const settling = () => Date.now() - changedAt.current < 350;
  const next = () => { if (settling()) return; if (last) finish(); else go(i + 1); };
  const back = () => {
    if (settling()) return;
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
    markOnboarded();
    // A full page load, not the app's router: the cookie is set, so the server opens the home screen, and nothing
    // the router remembered from before the cookie existed (a cached redirect back to this page) can answer instead.
    window.location.replace(AFTER_ONBOARDING);
  };

  // The first screen is its own layout: the wall of covers and the way in, with no
  // progress bar and no footer.
  // The very first screen: the language of the app itself, before anything else is said.
  if (step === "app") return <AppLanguageScreen onContinue={next} />;

  if (step === "intro") {
    const account = STEP_IDS.indexOf("account");
    return <FirstScreen onStart={next} onBack={back} onSignIn={() => { jumpedFrom.current = i; go(account); }} />;
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
  return <ReadyScreen {...nav} interests={a.interests} minutes={minutes} level={a.level} learn={a.learn} onTest={() => router.push(PLACEMENT_PATH)} />;
}
