"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/react";
import { XP } from "@/lib/xp/levels";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * "Level up faster": what each way of practising pays, side by side, so a reader knows flashcards and tests are
 * where the XP is. Reading pays a little for every page; a flashcard pays only when it was known; a test pays for
 * every right answer and again for a pass. The numbers come from the XP rules (lib/xp/levels.ts).
 */
export function Boost() {
  const t = useT();
  const rows = [
    { key: "reading", icon: <path d="M3 6.5C5 5 8 5 12 7c4-2 7-2 9-.5V18c-2-1.5-5-1.5-9 .5-4-2-7-2-9-.5z M12 7v11.5" />, rate: t("home.boost.rate.reading", { xp: XP.page }), href: "/library", bar: 0.2 },
    { key: "cards", icon: <><rect x="3" y="7" width="14" height="11" rx="2.5" /><path d="M7 7V6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H17" /></>, rate: t("home.boost.rate.cards", { xp: XP.card.easy }), href: "/recall/flashcards", bar: 0.6 },
    { key: "tests", icon: <><path d="M9 11l2.5 2.5L16 9" /><rect x="4" y="4" width="16" height="16" rx="3.5" /></>, rate: t("home.boost.rate.tests", { xp: XP.test.correct }), href: "/recall/tests", bar: 1 },
  ] as const;
  return (
    <section aria-labelledby="boost-title" className="mt-3 rounded-[26px] bg-gradient-to-br from-[#E3F8FC] to-[#C9F1FA] p-4 shadow-[inset_0_0_0_1px_rgba(8,145,178,.18)]">
      <h2 id="boost-title" className="flex items-center gap-2 text-[17px] font-bold tracking-[-0.01em]">
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent-bright text-on-cyan"><svg viewBox="0 0 24 24" className="size-[18px]" {...stroke} strokeWidth={2.2}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg></span>
        {t("home.boost.title")}
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-snug text-foreground/75">{t("home.boost.sub")}</p>
      <ul className="mt-3 grid gap-2">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="block rounded-2xl bg-white/80 px-3.5 py-2.5 active:bg-white">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-[var(--ob-deep)]" {...stroke} aria-hidden>{r.icon}</svg>
                <span className="min-w-[5.5rem] flex-1 break-words text-[14.5px] font-bold leading-tight [hyphens:auto]">{t(`home.boost.${r.key}` as "home.boost.reading")}</span>
                <span className="tabular ms-auto min-w-0 text-end text-[12.5px] font-bold text-[var(--ob-deep)]">{r.rate}</span>
              </span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-accent-bright/20" aria-hidden><span className="block h-full rounded-full bg-accent-bright" style={{ width: `${r.bar * 100}%` }} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
