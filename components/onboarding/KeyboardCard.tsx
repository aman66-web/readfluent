"use client";

import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";

const noSubscribe = () => () => {};

type Kind = "ios" | "android" | "other";

/** Which kind of phone this is: the installed app knows; a browser is guessed from what it says it is. The server draws the generic text. */
function kindNow(): Kind {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch { /* not in the app */ }
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other";
}

/**
 * Under the language pickers, whatever language is chosen: add its keyboard, and how to switch to it while typing.
 * Typing in the language happens in Talk with Dewey and in some answers; a keyboard is the phone's, so all the app can do is say how.
 */
export function KeyboardCard({ learn }: { learn: LanguageCode | null }) {
  const t = useT();
  const locale = useLocale();
  const kind = useSyncExternalStore(noSubscribe, kindNow, (): Kind => "other");
  if (!learn) return null;
  const language = languageName(learn, locale);
  return (
    <div className="guide-card wel-in relative mt-3 rounded-[22px] p-4" style={{ animationDelay: "480ms" }}>
      <p className="text-[15px] font-semibold leading-snug">{t("lang.kb.title", { language })}</p>
      <p className="ob-muted mt-1.5 text-[13px] leading-snug">{t("lang.kb.why", { language })}</p>
      <p className="ob-muted mt-1.5 text-[13px] leading-snug">{t(kind === "ios" ? "lang.kb.ios" : kind === "android" ? "lang.kb.android" : "lang.kb.other", { language })}</p>
    </div>
  );
}
