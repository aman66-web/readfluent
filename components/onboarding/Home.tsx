"use client";

import { useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/lib/i18n/react";
import { installKind, promptInstall } from "@/lib/pwa/install";
import { stageCode } from "@/lib/xp/levels";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import { PrimaryButton } from "./ui";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * "Add me to your home screen!" — Pluto asks, a phone's home screen shows a Pluto tile sitting among
 * the icons (two looks, taking turns), Continue puts the app there and "Not now" moves on.
 *
 * What Continue does depends on the phone (lib/pwa/install.ts): where the browser has its own
 * install prompt it opens it; on an iPhone, which has none, it opens a screen that walks through
 * the three taps (and a phone browser with no prompt gets the Android menu steps); on a computer
 * the run goes on. The tile is a picture of what the native app's widget will be (M11), not a widget.
 */
export function HomeScreen({ at, of, onBack, onContinue }: Nav) {
  const t = useT();
  const line = t("home.bubble");
  const guide = useGuide(line);
  const [howTo, setHowTo] = useState<HowKind | null>(null);

  const add = async () => {
    const kind = installKind();
    if (kind === "prompt") { await promptInstall(); onContinue(); }
    else if (kind === "ios") setHowTo("ios");
    else if (kind === "manual" && navigator.maxTouchPoints > 0) setHowTo("android");
    else onContinue();
  };

  if (howTo) return <HowTo kind={howTo} at={at} of={of} onBack={() => setHowTo(null)} onContinue={onContinue} />;

  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} showContinue={false}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-5">
        <GuideHead guide={guide} line={line} sub={t("home.sub")} mood="cheer" />
        <div className="wel-in relative mt-5 min-h-0 flex-1" style={{ animationDelay: "700ms" }} aria-hidden>
          <Phone />
        </div>
      </div>
      <div data-guide-nav className="relative shrink-0">
        <PrimaryButton onClick={add}>{t("ui.continue")}</PrimaryButton>
        <button type="button" onClick={onContinue} className="mt-1 block h-11 w-full text-[15px] font-semibold text-[var(--ob-deep)] active:opacity-60">
          {t("ui.notNow")}
        </button>
      </div>
    </GuideFrame>
  );
}

/* ── how to add it ───────────────────────────────────────────────────────── */

type HowKind = "ios" | "android";

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** The little picture beside each step: the button the reader is about to look for. */
function StepIcon({ name }: { name: "share" | "plus" | "dots" | "add" | "install" }) {
  return (
    <svg viewBox="0 0 24 24" {...ICON} className="size-6" aria-hidden>
      {name === "share" && <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />}
      {name === "plus" && <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>}
      {name === "add" && <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.8" /></>}
      {name === "install" && <><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 19h14" /></>}
      {name === "dots" && <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>}
    </svg>
  );
}

/**
 * After Continue on a phone that cannot be asked in one tap (an iPhone, or a browser with no install
 * prompt): the taps, one card each, in the order the reader will meet them. "I've added it" moves on.
 * The widget is for the store build (M11), and the screen says so rather than promising it.
 */
function HowTo({ kind, at, of, onBack, onContinue }: Nav & { kind: HowKind }) {
  const t = useT();
  const title = t("home.how.title");
  const guide = useGuide(title);
  const steps = kind === "ios"
    ? [
        { icon: "share", head: t("home.how.ios1"), sub: t("home.how.ios1b") },
        { icon: "plus", head: t("home.how.ios2"), sub: t("home.how.ios2b") },
        { icon: "add", head: t("home.how.ios3"), sub: t("home.how.last") },
      ] as const
    : [
        { icon: "dots", head: t("home.how.and1"), sub: t("home.how.and1b") },
        { icon: "plus", head: t("home.how.and2"), sub: undefined },
        { icon: "install", head: t("home.how.and3"), sub: t("home.how.last") },
      ] as const;
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} showContinue={false}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pt-5">
        <GuideHead guide={guide} line={title} mood="hello" />
        <ol className="mt-5 flex flex-col gap-3">
          {steps.map((s, n) => (
            <li key={n} className="wel-in guide-card flex items-center gap-3.5 rounded-2xl px-4 py-3.5" style={{ animationDelay: `${guide.totalMs + 150 + n * 220}ms` }}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ob-cyan)] text-[15px] font-bold text-[var(--ob-ink)]" aria-hidden>{n + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-tight">{s.head}</span>
                {s.sub && <span className="ob-muted mt-0.5 block text-[13.5px] leading-snug">{s.sub}</span>}
              </span>
              <span className="grid min-w-9 shrink-0 place-items-center text-[var(--ob-deep)]"><StepIcon name={s.icon} /></span>
            </li>
          ))}
        </ol>
        <p className="wel-in ob-muted mt-4 text-[13px] leading-snug" style={{ animationDelay: `${guide.totalMs + 900}ms` }}>{t("home.how.widget")}</p>
      </div>
      <div data-guide-nav className="relative shrink-0 pt-3">
        <PrimaryButton onClick={onContinue}>{t("home.how.done")}</PrimaryButton>
        <button type="button" onClick={onContinue} className="mt-1 block h-11 w-full text-[15px] font-semibold text-[var(--ob-deep)] active:opacity-60">
          {t("ui.notNow")}
        </button>
      </div>
    </GuideFrame>
  );
}

/** The top of a phone's home screen: the Pluto tile (two looks, taking turns) among empty icons. */
function Phone() {
  return (
    <div className="home-phone mx-auto h-full w-full max-w-[17rem]">
      <span className="home-notch" />
      <div className="home-grid">
        <div className="home-tile">
          <div className="home-look home-look-a">
            <span className="home-level">{stageCode("A2", 1)}</span>
            <Mascot mood="ready" crop="head" className="home-lex" />
          </div>
          <div className="home-look home-look-b">
            <span className="home-level">{stageCode("B1", 2)}</span>
            <Mascot mood="sleepy" crop="head" className="home-lex" />
          </div>
        </div>
        {Array.from({ length: 12 }, (_, n) => <span key={n} className="home-icon" />)}
      </div>
    </div>
  );
}
