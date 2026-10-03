"use client";

import { useEffect, useRef } from "react";
import { languageName, loadCatalog } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import { ANSWERS_KEY, saveAnswers } from "@/lib/onboarding/answers";
import { LANGUAGES, isLanguage, type LanguageCode } from "@/lib/onboarding/languages";
import { readRaw } from "@/lib/store/local";
import { PrimaryButton } from "./ui";

/**
 * The very first screen: "Choose the language of the app". It says, in the language it is
 * showing, that this is the language the app speaks to the reader in and not the one they
 * are going to learn, with an example, because that is the easiest thing in the whole run to
 * get backwards. Tapping a language changes the app to it on the spot (its words are fetched
 * first, so the screen changes once), and Continue goes on to the welcome.
 *
 * The first time it is shown, the reader's own language is pre-selected from the browser's
 * (`navigator.languages`) when it is one of ours, so most people only have to press Continue.
 */

/** The first of the browser's languages that the app is written in, or null. */
export function detectLanguage(preferred: readonly string[]): LanguageCode | null {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isLanguage(primary)) return primary;
  }
  return null;
}

/** True once the reader (or the detection) has put a language in their answers. */
const hasChosen = (): boolean => {
  try { return "language" in (JSON.parse(readRaw(ANSWERS_KEY) || "{}") as object); } catch { return false; }
};

/** A language's name in the app's language, unless that is just the same word again. */
function caption(code: LanguageCode, native: string, locale: LanguageCode): string | null {
  const name = languageName(code, locale);
  return name.toLocaleLowerCase(locale) === native.toLocaleLowerCase(locale) ? null : name;
}

export function AppLanguageScreen({ onContinue }: { onContinue: () => void }) {
  const t = useT();
  const locale = useLocale();
  const list = useRef<HTMLUListElement>(null);
  // The language the reader last tapped, so a slower earlier request (or the browser's guess) can never overwrite it.
  const wanted = useRef<LanguageCode | null>(null);

  // The chosen language is kept in view: a browser in Turkish or Vietnamese starts far down the list.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.scrollIntoView({ block: "center" });
  }, [locale]);

  useEffect(() => {
    if (hasChosen()) return;
    const found = detectLanguage(typeof navigator !== "undefined" ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : []);
    const pick = found ?? "en";
    void loadCatalog(pick).then(() => { if (wanted.current === null) saveAnswers({ language: pick }); });
  }, []);

  const choose = (code: LanguageCode) => {
    if (code === (wanted.current ?? locale)) return;
    wanted.current = code;
    // Its words arrive before it is chosen, so the screen goes from one language to the other in one step.
    void loadCatalog(code).then(() => { if (wanted.current === code) saveAnswers({ language: code }); });
  };

  return (
    <main className="ob relative flex h-[100dvh] flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="shrink-0">
        <span className="grid size-11 place-items-center rounded-full bg-[var(--ob-cyan)]/20 text-[var(--ob-deep)]" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></svg>
        </span>
        <h1 className="mt-4 text-[28px] font-light leading-[1.12] tracking-[-0.025em]">{t("app.line")}</h1>

        {/* What this is, and what it is not. */}
        <div className="mt-3 rounded-[18px] bg-[var(--ob-cyan)]/15 p-4">
          <p className="text-[13.5px] leading-snug text-[var(--ob-ink)]/85">{t("app.sub")}</p>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-[var(--ob-deep)]">{t("app.example", { speak: languageName("en", locale), learn: languageName("es", locale) })}</p>
        </div>
      </div>

      <ul ref={list} className="-mx-1 mt-4 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-1 pb-4 pt-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)]">
        {LANGUAGES.map((l) => {
          const on = locale === l.code;
          const sub = caption(l.code, l.native, locale);
          return (
            <li key={l.code}>
              <button type="button" onClick={() => choose(l.code)} aria-pressed={on}
                      className={`guide-card relative flex h-14 w-full flex-col justify-center rounded-[16px] px-3.5 text-start ${on ? "guide-card-on" : ""}`}>
                <span lang={l.code} className="block truncate text-[14px] font-semibold">{l.native}</span>
                {sub && <span className="ob-muted block truncate text-[11px]">{sub}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="shrink-0"><PrimaryButton onClick={onContinue}>{t("ui.continue")}</PrimaryButton></div>
    </main>
  );
}
