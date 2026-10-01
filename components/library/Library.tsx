"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { CATEGORIES, categoryById, type CategoryId } from "@/lib/content/limits";
import { useT } from "@/lib/i18n/react";
import type { PreviewBook } from "@/lib/preview/catalog";

/** Categories shown as "coming soon" in the all-books view, so the shape of the full library is visible. */
const SOON_IN_ALL: CategoryId[] = ["crime", "fantasy-scifi", "self-help", "history", "science"];

export function Library({ books }: { books: PreviewBook[] }) {
  const t = useT();
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const shown = category === "all" ? books : books.filter((b) => b.category === category);
  const soon: CategoryId[] =
    category === "all" ? SOON_IN_ALL : shown.length === 0 ? [category] : [];

  return (
    <div>
      <div role="group" aria-label={t("library.categories")} className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {[{ id: "all" as const }, ...CATEGORIES].map((c) => {
          const on = category === c.id;
          return (
            <button
              key={c.id}
              aria-pressed={on}
              onClick={() => setCategory(c.id)}
              className={`h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${
                on ? "bg-foreground text-background" : "border border-border bg-surface text-muted"
              }`}
            >
              {c.id === "all" ? t("library.all") : t(`cat.${c.id}`)}
            </button>
          );
        })}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6">
        {shown.map((b) => (
          <li key={b.slug}>
            <Link href={`/book/${b.slug}`} className="block active:opacity-80">
              <BookCover title={b.title} author={b.author} hue={categoryById(b.category)?.hue ?? 30} />
              <p className="mt-2 text-[14px] font-semibold leading-tight">{b.title}</p>
              <p className="text-[12px] text-faint">{t("library.versions", { category: t(`cat.${b.category}`) })}</p>
            </Link>
          </li>
        ))}
        {soon.map((id) => {
          const label = t(`cat.${id}`);
          return (
            <li key={id} aria-label={t("library.soonLabel", { category: label })}>
              <div className="flex aspect-[2/3] flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-border px-3 text-center">
                <span className="text-[13px] font-semibold text-muted">{label}</span>
                <span className="mt-1 text-[12px] text-faint">{t("library.soon")}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-[12px] leading-snug text-faint">
        {t("library.preview")}
      </p>
    </div>
  );
}
