"use client";

import { useId } from "react";
import { useT } from "@/lib/i18n/react";
import { SceneArt } from "@/components/art/SceneArt";

/**
 * The picture for a page, drawn from the page's scene caption (components/art/SceneArt.tsx): where it is, the
 * time of day and what the caption names. Nothing is fetched, stored or paid for. `seed` (book and page) keeps two
 * pages with alike captions from looking alike. The caption is also the picture's description for screen readers.
 * The real photographs (one pool of 200 per book, SPEC.md §7) replace these when they are made.
 *
 * `pill` is the "Photo placeholder" caption; off where the picture is small (the first-run tour's phone).
 */
export function ScenePhoto({ caption, seed = "", className = "", pill = true }: { caption: string; seed?: string; className?: string; pill?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const t = useT();
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={caption}>
      <SceneArt caption={caption} seed={seed || caption} id={id} />
      {pill && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {t("photo.placeholder")} · {caption}
        </span>
      )}
    </div>
  );
}
