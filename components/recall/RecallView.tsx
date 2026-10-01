"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";

const ICON = "size-6";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The ways to practise what was met while reading. Flashcards are M7. Talk — a conversation in
 * the language being learned, with a partner that helps when the reader is stuck — is the one
 * place the app would call a model at read time, which the owner asked for by name (1 Oct 2026);
 * it is not built yet, so both say so.
 */
const WAYS: readonly { id: string; title: MessageId; desc: MessageId; icon: ReactNode }[] = [
  {
    id: "flashcards", title: "recall.flash.title", desc: "recall.flash.desc",
    icon: <svg viewBox="0 0 24 24" className={ICON} {...stroke} aria-hidden><rect x="3" y="7" width="14" height="11" rx="2.5" /><path d="M7 7V6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H17" /></svg>,
  },
  {
    id: "talk", title: "recall.talk.title", desc: "recall.talk.desc",
    icon: <svg viewBox="0 0 24 24" className={ICON} {...stroke} aria-hidden><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z" /><path d="M8.5 9h7M8.5 12h4" /></svg>,
  },
];

export function RecallView() {
  const t = useT();
  return (
    <main className="safe-top px-5 pb-32 [--pt:1.5rem]">
      <h1 className="text-[30px] font-bold tracking-[-0.02em]">{t("recall.title")}</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">{t("recall.sub")}</p>

      <h2 className="mt-7 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">{t("recall.ways")}</h2>
      <ul className="mt-3 space-y-3">
        {WAYS.map((w) => (
          <li key={w.id} data-way={w.id} className="flex items-start gap-4 rounded-[22px] border border-border bg-surface p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-bright/25 text-accent">{w.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{t(w.title)}</h3>
                <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-accent-bright/25 px-2.5 text-[11px] font-bold text-accent">{t("recall.soon")}</span>
              </div>
              <p className="mt-1 text-[14px] leading-snug text-muted">{t(w.desc)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center gap-4 rounded-[22px] border border-border bg-surface px-4 py-4">
        {/* Dewey dozing off: nothing to review yet. */}
        <Mascot mood="sleepy" className="block h-[84px] w-auto shrink-0" />
        <p className="text-[14px] leading-snug text-muted">{t("recall.empty")}</p>
      </div>

      <Link href="/library" className="mt-4 flex h-14 items-center justify-center rounded-full bg-foreground text-[16px] font-semibold text-background active:opacity-85">
        {t("home.browse")}
      </Link>
    </main>
  );
}
