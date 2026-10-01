"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LENGTHS, LEVELS, levelById, type LevelId, type Length } from "@/lib/content/limits";
import { CHOICE_KEY, parseChoice, saveChoice } from "@/lib/progress";
import { readRaw, subscribeTo } from "@/lib/store/local";

const subscribeChoice = subscribeTo(CHOICE_KEY);
const readChoiceRaw = () => readRaw(CHOICE_KEY);
// On the server there is no device storage: "" is what the first client render also shows.
const serverChoiceRaw = () => "";

/**
 * "Read" → choose a level → choose a length → read (SPEC.md §2). The last choice
 * for each book is remembered on the device and offered again.
 */
export function ReadSheet({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  // The level picked in this sheet, before it is saved; null until a tap.
  const [picked, setPicked] = useState<LevelId | null>(null);

  // The last choice for this book, from the device. A store subscription rather
  // than an effect, so the first render matches the server's and the stored
  // value arrives without a second render pass.
  const raw = useSyncExternalStore(subscribeChoice, readChoiceRaw, serverChoiceRaw);
  const last = useMemo(() => parseChoice(raw)[slug], [raw, slug]);
  const lastLevel = last ? levelById(last.level)?.id ?? null : null;
  const lastLength = last && LENGTHS.some((x) => x.pages === last.length) ? (last.length as Length) : null;
  const level = picked ?? lastLevel;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const start = (lv: LevelId, len: Length) => {
    saveChoice(slug, lv, len);
    const slugOf = LEVELS.find((l) => l.id === lv)!.slug;
    router.push(`/read/${slug}/${slugOf}/${len}`);
  };

  const begin = () => { setStep(1); setOpen(true); };

  return (
    <>
      <button
        onClick={begin}
        className="h-14 w-full rounded-full bg-foreground text-[17px] font-semibold text-background active:opacity-85"
      >
        Read
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Read ${title}`}>
          <button aria-label="Close" className="fade-in absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <div className="sheet-up safe-bottom relative w-full max-w-[440px] rounded-t-[22px] bg-background px-5 pb-6 pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
            {step === 1 ? (
              <>
                <h2 className="text-[20px] font-bold tracking-[-0.01em]">Choose your level</h2>
                <p className="mt-0.5 text-[13px] text-muted">Pick the one that feels comfortable. You can change it later.</p>
                <ul className="mt-4 space-y-2.5">
                  {LEVELS.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => { setPicked(l.id); setStep(2); }}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left active:opacity-80 ${
                          lastLevel === l.id ? "border-foreground bg-surface" : "border-border bg-surface"
                        }`}
                      >
                        <span>
                          <span className="block text-[16px] font-semibold">{l.label} <span className="font-normal text-muted">· {l.name}</span></span>
                          <span className="mt-0.5 block text-[13px] text-muted">{l.blurb}</span>
                        </span>
                        {lastLevel === l.id && <span className="ml-3 text-[12px] font-semibold text-accent">Last time</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <button onClick={() => setStep(1)} className="-ml-1 mb-1 h-9 text-[13px] font-semibold text-muted">← Level {level && levelById(level)?.label}</button>
                <h2 className="text-[20px] font-bold tracking-[-0.01em]">Choose your length</h2>
                <p className="mt-0.5 text-[13px] text-muted">Every page takes a few seconds to read.</p>
                <ul className="mt-4 space-y-2.5">
                  {LENGTHS.map((l) => (
                    <li key={l.pages}>
                      <button
                        onClick={() => level && start(level, l.pages)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left active:opacity-80 ${
                          lastLength === l.pages ? "border-foreground bg-surface" : "border-border bg-surface"
                        }`}
                      >
                        <span>
                          <span className="block text-[16px] font-semibold">{l.pages} pages <span className="font-normal text-muted">· {l.name}</span></span>
                          <span className="mt-0.5 block text-[13px] text-muted">{l.time}</span>
                        </span>
                        {lastLength === l.pages && <span className="ml-3 text-[12px] font-semibold text-accent">Last time</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
