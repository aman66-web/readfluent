import type { ReactNode } from "react";

/** Plain long-form text for the store-required pages (English). Server-rendered, no script. */
export function LegalDoc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article lang="en" dir="ltr" className="px-6 pb-12 pt-2 text-[15px] leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-foreground [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:ms-5 [&_ul]:mt-3 [&_ul]:list-disc">
      <h1 className="text-[26px] font-bold tracking-[-0.015em] text-foreground">{title}</h1>
      <p className="mt-1 text-[13px] text-muted">Last updated {updated}</p>
      {children}
    </article>
  );
}
