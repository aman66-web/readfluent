"use client";

import { CATEGORIES, type CategoryId } from "@/lib/content/limits";
import { useT } from "@/lib/i18n/react";
import { CategoryPicture, CategoryPictureDefs } from "./pictures";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import { SignIn } from "./SignIn";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * The last steps of the first run, asked by the guide like the rest: signing in
 * and what you are curious about.
 */

/** "Sign in or sign up" — the sign-in's own buttons are the only way on (an account is required), so there is no Continue and no "Not now". */
export function AccountScreen({ at, of, error, onBack, onNext, next }: Omit<Nav, "onContinue" | "onBack"> & {
  error: boolean;
  onNext: () => void;
  /** Absent when this is the screen a reopened or signed-out app lands on: there is nothing before it to go back to. */
  onBack?: () => void;
  /** Where a Google or Apple sign-in comes back to (the first run's next screen unless said). */
  next?: string;
}) {
  const t = useT();
  const line = t("account.line");
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onNext} showContinue={false}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-5">
        <GuideHead guide={guide} line={line} sub={t("account.sub")} />
        <div className="wel-in mt-7" style={{ animationDelay: "800ms" }}>
          <SignIn error={error} onNext={onNext} next={next} />
        </div>
      </div>
    </GuideFrame>
  );
}

/**
 * "What are you curious about?" — tiles rather than a list, because this is the one
 * screen of the run with something to do on it. Nothing here is a gate: picking none
 * is a real answer, so the line under the grid asks rather than blocks.
 */
export function InterestsScreen({ at, of, value, onChange, onBack, onContinue }: Nav & {
  value: readonly CategoryId[];
  onChange: (next: CategoryId[]) => void;
}) {
  const t = useT();
  const line = t("interests.line");
  const guide = useGuide(line);
  const toggle = (id: CategoryId) => onChange(value.includes(id) ? value.filter((c) => c !== id) : CATEGORIES.map((c) => c.id).filter((c) => c === id || value.includes(c)));
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col pt-5">
        <GuideHead guide={guide} line={line} sub={t("interests.sub")} mood="ready" />
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <CategoryPictureDefs />
          <ul className="focus-scroll -mx-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto px-1 pb-7 pt-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)]">
            {CATEGORIES.map(({ id }, n) => {
              const on = value.includes(id);
              return (
                <li key={id} className="wel-in" style={{ animationDelay: `${900 + n * 50}ms` }}>
                  <button type="button" onClick={() => toggle(id)} aria-pressed={on}
                          className={`guide-card relative flex w-full flex-col overflow-hidden rounded-[20px] text-start ${on ? "guide-card-on" : ""}`}>
                    <CategoryPicture id={id} />
                    <span className="flex min-h-[54px] items-center gap-2 px-3 py-2 text-[14px] font-semibold leading-[1.2]">
                      <span className="min-w-0 flex-1 break-words [hyphens:auto]">{t(`cat.${id}`)}</span>
                      <span className={`guide-tick grid size-5 shrink-0 place-items-center rounded-full ${on ? "guide-tick-on" : ""}`} aria-hidden>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {/* One line, whichever it says, so the grid does not move under a thumb the moment the first card is tapped. */}
          <p className="tabular ob-muted shrink-0 pb-3 text-[12px] font-medium">{value.length ? t("interests.chosen", { n: value.length }) : t("interests.pickFew")}</p>
        </div>
      </div>
    </GuideFrame>
  );
}
