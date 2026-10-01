"use client";

import { useState } from "react";
import { Lex } from "@/components/mascot/Lex";
import { useT } from "@/lib/i18n/react";
import { installKind, promptInstall } from "@/lib/pwa/install";
import { stageCode } from "@/lib/xp/levels";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import { PrimaryButton } from "./ui";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * "Add me to your home screen!" — Lex asks, a phone's home screen shows a Lex tile sitting among
 * the icons (two looks, taking turns), Continue puts the app there and "Not now" moves on.
 *
 * What Continue does depends on the phone (lib/pwa/install.ts): where the browser has its own
 * install prompt it opens it; on an iPhone, which has none, the screen shows the two taps to
 * make; anywhere else there is nothing to offer and the run goes on. The tile is a picture of
 * what the native app's widget will be (M11), not a widget.
 */
export function HomeScreen({ at, of, onBack, onContinue }: Nav) {
  const t = useT();
  const line = t("home.bubble");
  const guide = useGuide(line);
  const [howTo, setHowTo] = useState(false);

  const add = async () => {
    const kind = installKind();
    if (kind === "prompt") { await promptInstall(); onContinue(); }
    else if (kind === "ios" && !howTo) setHowTo(true);
    else onContinue();
  };

  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} showContinue={false}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-5">
        <GuideHead guide={guide} line={line} sub={t("home.sub")} mood="cheer" />
        <div className="wel-in relative mt-5 min-h-0 flex-1" style={{ animationDelay: "700ms" }} aria-hidden>
          <Phone />
        </div>
      </div>
      <div data-guide-nav className="relative shrink-0">
        {howTo && (
          <p role="status" className="wel-in guide-card mb-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] leading-snug">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6 shrink-0" aria-hidden>
              <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
            </svg>
            {t("home.ios")}
          </p>
        )}
        <PrimaryButton onClick={add}>{t("ui.continue")}</PrimaryButton>
        <button type="button" onClick={onContinue} className="mt-1 block h-11 w-full text-[15px] font-semibold text-[var(--ob-deep)] active:opacity-60">
          {t("ui.notNow")}
        </button>
      </div>
    </GuideFrame>
  );
}

/** The top of a phone's home screen: the Lex tile (two looks, taking turns) among empty icons. */
function Phone() {
  return (
    <div className="home-phone mx-auto h-full w-full max-w-[17rem]">
      <span className="home-notch" />
      <div className="home-grid">
        <div className="home-tile">
          <div className="home-look home-look-a">
            <span className="home-level">{stageCode("A2", 1)}</span>
            <Lex mood="ready" crop="head" className="home-lex" />
          </div>
          <div className="home-look home-look-b">
            <span className="home-level">{stageCode("B1", 2)}</span>
            <Lex mood="sleepy" crop="head" className="home-lex" />
          </div>
        </div>
        {Array.from({ length: 12 }, (_, n) => <span key={n} className="home-icon" />)}
      </div>
    </div>
  );
}
