"use client";

import { CATEGORIES, type CategoryId } from "@/lib/content/limits";
import { LANGUAGES, type LanguageCode } from "@/lib/onboarding/languages";
import { GuideFrame, GuideHead, useGuide } from "./Guide";
import { SignIn } from "./SignIn";

interface Nav { at: number; of: number; onBack: () => void; onContinue: () => void }

/**
 * The last steps of the first run, asked by the guide like the rest: your language,
 * signing in, and what you are curious about.
 */

/** "Pick your language" — the languages with the most speakers; the pick is kept for translation. */
export function LanguageScreen({ at, of, value, onPick, onBack, onContinue }: Nav & {
  value: LanguageCode;
  onPick: (l: LanguageCode) => void;
}) {
  const line = "Pick your language";
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col pt-5">
        <GuideHead guide={guide} line={line} sub="ReadFluent is in English for now. Tell us yours, and we'll translate into it." />
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          {/* The list scrolls behind the footer: the last 28px fade so a cut row reads as "more below". */}
          <ul className="-mx-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-1 pb-7 pt-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)]">
            {LANGUAGES.map((l, n) => {
              const on = value === l.code;
              return (
                <li key={l.code} className="wel-in" style={{ animationDelay: `${700 + n * 22}ms` }}>
                  <button type="button" onClick={() => onPick(l.code)} aria-pressed={on}
                          className={`guide-card relative flex h-14 w-full flex-col justify-center rounded-[16px] px-3.5 text-start ${on ? "guide-card-on" : ""}`}>
                    <span lang={l.code} className="block truncate text-[13px] font-semibold">{l.native}</span>
                    {/* English's English name is English: a caption that repeats the title reads as a mistake. */}
                    {l.label !== l.native && <span className="ob-muted block truncate text-[11px]">{l.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </GuideFrame>
  );
}

/** "Sign in or sign up" — the sign-in's own buttons are the way on, so there is no Continue. */
export function AccountScreen({ at, of, error, onBack, onNext }: Omit<Nav, "onContinue"> & { error: boolean; onNext: () => void }) {
  const line = "Sign in or sign up";
  const guide = useGuide(line);
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onNext} showContinue={false}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto pb-4 pt-5">
        <GuideHead guide={guide} line={line} sub="Your reading and your words, on every device." />
        <div className="wel-in mt-7" style={{ animationDelay: "800ms" }}>
          <SignIn error={error} onNext={onNext} />
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
  const line = "What are you curious about?";
  const guide = useGuide(line);
  const toggle = (id: CategoryId) => onChange(value.includes(id) ? value.filter((c) => c !== id) : CATEGORIES.map((c) => c.id).filter((c) => c === id || value.includes(c)));
  return (
    <GuideFrame at={at} of={of} onBack={onBack} onContinue={onContinue}>
      <div className="relative flex min-h-0 flex-1 flex-col pt-5">
        <GuideHead guide={guide} line={line} sub="Pick a few. It decides which shelf the library opens on. Nothing is hidden, and you can change it whenever you like." />
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <ul className="-mx-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-1 pb-7 pt-1 [mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)]">
            {CATEGORIES.map(({ id, label }, n) => {
              const on = value.includes(id);
              return (
                <li key={id} className="wel-in" style={{ animationDelay: `${900 + n * 30}ms` }}>
                  <button type="button" onClick={() => toggle(id)} aria-pressed={on}
                          className={`guide-card relative flex h-14 w-full items-center justify-between gap-2 rounded-[16px] px-3.5 text-start ${on ? "guide-card-on" : ""}`}>
                    <span className="min-w-0 text-[13px] font-semibold leading-[1.15]">{label}</span>
                    <span className={`guide-tick grid size-5 shrink-0 place-items-center rounded-full ${on ? "guide-tick-on" : ""}`} aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {/* One line, whichever it says, so the grid does not move under a thumb the moment the first tile is tapped. */}
          <p className="tabular ob-muted shrink-0 pb-3 text-[12px] font-medium">{value.length ? `${value.length} chosen` : "Pick a few, or skip"}</p>
        </div>
      </div>
    </GuideFrame>
  );
}
