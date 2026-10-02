"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { coverAuthor } from "@/lib/preview/catalog";
import { BookCover } from "@/components/BookCover";
import { categoryById } from "@/lib/content/limits";
import { useBookText, useT } from "@/lib/i18n/react";
import { finished, readHref, reading, type MineEntry } from "@/lib/mine";
import { PROGRESS_KEY, parseProgress } from "@/lib/progress";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { LEDGER_KEY, parseLedger } from "@/lib/xp/ledger";

const subProgress = subscribeTo(PROGRESS_KEY);
const subLedger = subscribeTo(LEDGER_KEY);
const readProgress = () => readRaw(PROGRESS_KEY);
const readLedger = () => readRaw(LEDGER_KEY);
const server = () => "";

function Row({ e, done }: { e: MineEntry; done: boolean }) {
  const t = useT();
  const text = useBookText();
  const title = text(e.book.slug, "title", e.book.title);
  return (
    <li>
      <Link href={readHref(e)} className="flex items-center gap-4 rounded-[20px] border border-border bg-surface p-3 active:opacity-80">
        <BookCover slug={e.book.slug} title={title} author={coverAuthor(e.book)} hue={categoryById(e.book.category)?.hue ?? 30} className="w-[52px] shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold" dir="auto">{title}</span>
          <span className="mt-0.5 block text-[12px] text-faint">{e.levelLabel} · {e.length}</span>
          <span className="mt-2 flex items-center gap-2" dir="ltr">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${done ? 100 : (e.page / e.total) * 100}%` }} />
            </span>
            <span className="tabular shrink-0 text-[11px] font-semibold text-muted">{done ? t("mine.done") : t("mine.page", { n: e.page, total: e.total })}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] | null }) {
  return (
    <section className="mt-7">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-faint">{title}</h2>
      {children && children.length > 0 ? <ul className="mt-3 space-y-2.5">{children}</ul> : <p className="mt-3 rounded-[18px] border border-dashed border-border px-4 py-4 text-[13.5px] leading-snug text-muted">{empty}</p>}
    </section>
  );
}

export function MineView() {
  const t = useT();
  const progressRaw = useSyncExternalStore(subProgress, readProgress, server);
  const ledgerRaw = useSyncExternalStore(subLedger, readLedger, server);
  const done = useMemo(() => parseLedger(ledgerRaw).done, [ledgerRaw]);
  const readingNow = useMemo(() => reading(parseProgress(progressRaw), done), [progressRaw, done]);
  const finishedList = useMemo(() => finished(done), [done]);
  return (
    <main className="safe-top px-5 pb-32 [--pt:1.5rem]">
      <h1 className="title-display">{t("tab.mine")}</h1>
      <Section title={t("mine.reading")} empty={t("mine.emptyReading")}>{readingNow.map((e) => <Row key={e.key} e={e} done={false} />)}</Section>
      <Section title={t("mine.finished")} empty={t("mine.emptyFinished")}>{finishedList.map((e) => <Row key={e.key} e={e} done />)}</Section>
      <Section title={t("mine.downloaded")} empty={t("mine.downloadedSoon")}>{[]}</Section>
    </main>
  );
}
