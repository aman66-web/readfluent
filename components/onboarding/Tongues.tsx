"use client";

import { useState } from "react";
import { languageName, loadCatalog } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import { LANGUAGES, type LanguageCode } from "@/lib/onboarding/languages";
import { saveAnswers } from "@/lib/onboarding/answers";
import { choicesFor, tonguesNote, tonguesSummary } from "@/lib/onboarding/tongues";
import { GuideFrame, GuideHead, useGuide } from "./Guide";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * Which language the reader speaks (the one the app and its word meanings are in) and
 * which they want to learn (the one the books are in). Two cards, one sentence that
 * says what the pair means, and a full list that opens over the screen when a card is
 * tapped. The same picker is the Languages page, so the answer can be changed later.
 *
 * Choosing the language they speak changes the whole app straight away: the new
 * language's messages are fetched first and saved after, so the screen goes from one
 * language to the other in one step, never through a blank.
 */

type Which = "speak" | "learn";

/** The list's caption under a language's own name: its name in the app's language, unless that is the same word. */
function caption(code: LanguageCode, native: string, locale: LanguageCode) {
  const name = languageName(code, locale);
  return name.toLocaleLowerCase(locale) === native.toLocaleLowerCase(locale) ? null : name;
}

function Card({ kicker, code, onOpen, delay }: { kicker: string; code: LanguageCode | null; onOpen: () => void; delay: number }) {
  const t = useT();
  const locale = useLocale();
  const lang = LANGUAGES.find((l) => l.code === code);
  const sub = lang ? caption(lang.code, lang.native, locale) : null;
  return (
    <button type="button" onClick={onOpen}
            className="guide-card wel-in relative flex w-full items-center gap-3 rounded-[20px] px-5 py-3.5 text-start"
            style={{ animationDelay: `${delay}ms` }}>
      <span className="min-w-0 flex-1">
        <span className="ob-muted block text-[12px] font-semibold uppercase tracking-[.08em]">{kicker}</span>
        <span lang={lang?.code} className={`mt-0.5 block truncate text-[22px] font-semibold leading-tight ${lang ? "" : "ob-muted"}`}>
          {lang ? lang.native : t("tongues.choose")}
        </span>
        {sub && <span className="ob-muted block truncate text-[13px]">{sub}</span>}
      </span>
      <span className="ob-muted shrink-0 text-[13px] font-semibold" aria-hidden="true">{lang ? t("tongues.change") : t("tongues.choose2")}</span>
    </button>
  );
}

/** The full list, over the screen. Choosing closes it. */
function Sheet({ title, value, choices, onPick, onClose }: {
  title: string; value: LanguageCode | null; choices: readonly (typeof LANGUAGES)[number][]; onPick: (l: LanguageCode) => void; onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="ob fixed inset-0 z-30 flex flex-col bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="flex shrink-0 items-center justify-between pb-3">
        <h2 className="text-[20px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="-me-2 grid h-11 place-items-center rounded-full px-3 text-[15px] font-semibold active:bg-black/5">{t("ui.close")}</button>
      </div>
      <ul className="-mx-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-1 pb-4 pt-1">
        {choices.map((l) => {
          const on = value === l.code;
          const sub = caption(l.code, l.native, locale);
          return (
            <li key={l.code}>
              <button type="button" onClick={() => onPick(l.code)} aria-pressed={on}
                      className={`guide-card relative flex h-14 w-full flex-col justify-center rounded-[16px] px-3.5 text-start ${on ? "guide-card-on" : ""}`}>
                <span lang={l.code} className="block truncate text-[13px] font-semibold">{l.native}</span>
                {sub && <span className="ob-muted block truncate text-[11px]">{sub}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The two cards, what the pair means, and what can be changed later. Used by the
 * first-run step and by the Languages page; both save to the same place.
 */
export function LanguagePicker({ speak, learn, delay = 0 }: { speak: LanguageCode; learn: LanguageCode | null; delay?: number }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState<Which | null>(null);
  const note = tonguesNote(t, locale, speak, learn);

  const pick = (which: Which, code: LanguageCode) => {
    setOpen(null);
    // The sheet does not offer the other card's language, so this cannot happen from it; the guard is for anything else.
    if (code === (which === "speak" ? learn : speak)) return;
    if (which === "learn") { saveAnswers({ learn: code }); return; }
    // The new language's words arrive before it is chosen, so the screen changes once.
    void loadCatalog(code).then(() => saveAnswers({ language: code }));
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <Card kicker={t("tongues.speak")} code={speak} onOpen={() => setOpen("speak")} delay={delay} />
        <Card kicker={t("tongues.learn")} code={learn} onOpen={() => setOpen("learn")} delay={delay + 120} />
      </div>
      <p className="ob-muted wel-in mt-3 text-center text-[13px] leading-snug" style={{ animationDelay: `${delay + 200}ms` }}>{t("tongues.later")}</p>
      <p className="wel-in mt-4 text-center text-[15px] font-semibold leading-snug" style={{ animationDelay: `${delay + 240}ms` }} aria-live="polite">
        {tonguesSummary(t, locale, speak, learn)}
      </p>
      {note && <p className="ob-muted wel-in mt-1.5 text-center text-[13px] leading-snug" style={{ animationDelay: `${delay + 320}ms` }}>{note}</p>}
      {open && (
        <Sheet title={open === "speak" ? t("tongues.sheetSpeak") : t("tongues.sheetLearn")} value={open === "speak" ? speak : learn}
               choices={choicesFor(open, speak, learn, LANGUAGES)}
               onPick={(l) => pick(open, l)} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

export function TonguesScreen({ at, of, speak, learn, onBack, onContinue }: Nav & {
  speak: LanguageCode;
  learn: LanguageCode | null;
}) {
  const t = useT();
  const line = t("tongues.line");
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue} canContinue={learn !== null && learn !== speak}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-3 pt-5">
        <GuideHead key={line} guide={guide} line={line} sub={t("tongues.sub")} />
        <div className="mt-6">
          <LanguagePicker speak={speak} learn={learn} delay={700} />
        </div>
      </div>
    </GuideFrame>
  );
}
