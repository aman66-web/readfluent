"use client";

import "./welcome.css";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { FirstScreen } from "@/components/welcome/FirstScreen";
import { HeardScreen, HelloScreen, FocusScreen, MirrorScreen, ScrollScreen } from "@/components/onboarding/Questions";
import { DailyScreen, FutureScreen, PledgeScreen, ReadyScreen } from "@/components/onboarding/Plan";
import { TonguesScreen } from "@/components/onboarding/Tongues";
import { AccountScreen, InterestsScreen } from "@/components/onboarding/Last";
import { accountAvailable } from "@/components/onboarding/SignIn";
import { TourScreen } from "@/components/onboarding/Tour";
import { display, jakarta } from "@/lib/fonts";
import { markOnboarded } from "@/lib/onboarding";
import {
  ANSWERS_KEY, FOCUS_IDS, parseAnswers, saveAnswers, toggleIn,
} from "@/lib/onboarding/answers";
import { DEFAULT_MINUTES } from "@/lib/onboarding/firstrun";
import { reportFirstRun } from "@/lib/onboarding/report";
import { AFTER_ONBOARDING, STEP_IDS, isShowStep, stepIndex } from "@/lib/onboarding/steps";
import { readRaw, subscribeTo } from "@/lib/store/local";

/**
 * First run: the welcome (a wall of book covers), which languages (the one you speak
 * and the one you want to learn), the guide's hello and its two
 * questions, how long somebody scrolls and what that adds up to, the guide's tour of
 * what the app does (five screens), a daily time and where it takes them, a promise,
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
  const go = (n: number) => {
    const to = Math.max(0, Math.min(STEP_IDS.length - 1, n));
    setI(to);
    // So the address always says which screen this is, and a reload stays on it.
    window.history.replaceState(null, "", `/welcome?step=${STEP_IDS[to]}`);
  };
  const next = () => (last ? finish() : go(i + 1));
  const back = () => go(i - 1);

  /* The end of the run is the library. What was picked is already saved; the
     answers are reported once (only the choices), and the first screen is marked
     seen so the front door stops sending this device here. */
  const finish = () => {
    reportFirstRun(a, minutes);
    markOnboarded();
    router.replace(AFTER_ONBOARDING);
  };

  // The first screen is its own layout: the wall of covers and the way in, with no
  // progress bar and no footer.
  if (step === "intro") {
    const account = STEP_IDS.indexOf("account");
    return <FirstScreen onStart={next} onSignIn={accountAvailable() ? () => go(account) : undefined} />;
  }

  const nav = { at: i, of: STEP_IDS.length, onBack: back, onContinue: next };
  if (step === "tongues") {
    return (
      <TonguesScreen {...nav} speak={a.language} learn={a.learn} />
    );
  }
  if (step === "hello") return <HelloScreen {...nav} />;
  if (step === "focus") {
    return <FocusScreen {...nav} value={a.focus} onToggle={(f) => saveAnswers({ focus: toggleIn(FOCUS_IDS, a.focus, f) })} />;
  }
  if (step === "heard") {
    return (
      <HeardScreen {...nav} value={a.heard} other={a.heardOther}
                   onPick={(heard) => saveAnswers({ heard })} onOther={(heardOther) => saveAnswers({ heardOther })} />
    );
  }
  if (step === "scroll") return <ScrollScreen {...nav} value={a.scroll} onPick={(scroll) => saveAnswers({ scroll })} />;
  if (step === "mirror") return <MirrorScreen {...nav} scroll={a.scroll} />;
  if (isShowStep(step)) return <TourScreen key={step} id={step} {...nav} />;
  if (step === "daily") return <DailyScreen {...nav} value={a.daily} onPick={(daily) => saveAnswers({ daily })} />;
  if (step === "future") return <FutureScreen {...nav} minutes={minutes} focus={a.focus} />;
  if (step === "pledge") {
    return <PledgeScreen {...nav} minutes={minutes} done={a.pledged} onDone={() => saveAnswers({ pledged: true })} />;
  }
  if (step === "account") return <AccountScreen at={i} of={STEP_IDS.length} onBack={back} error={authError} onNext={next} />;
  if (step === "interests") return <InterestsScreen {...nav} value={a.interests} onChange={(interests) => saveAnswers({ interests })} />;
  return <ReadyScreen {...nav} interests={a.interests} minutes={minutes} />;
}
