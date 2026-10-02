"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { previousPath, stepsBackTo } from "@/lib/nav";

/**
 * A back arrow that goes back instead of forward. Two ways to say where it goes:
 *
 *   - `fallback` alone: the page it means (a book's reader goes back to its book). If that page is earlier in
 *     this tab's history the arrow steps back to it, so the history does not grow into Book → Reader → Book →
 *     Reader; if it is not, it goes there.
 *   - `previous`: wherever the reader came from, when that was a page of this app and not one of `avoid`
 *     (a book's page goes back to the shelf, the home screen or the profile it was opened from, never into
 *     the reader that sent it there); otherwise to `fallback`.
 *
 * Plain `Link` semantics otherwise, so it still works without a script and opens in a new tab on request.
 */
export function BackLink({ fallback, previous = false, avoid, className, label, children }: {
  fallback: string;
  previous?: boolean;
  avoid?: RegExp;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <Link href={fallback} aria-label={label} className={className}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            if (previous) {
              const prev = previousPath();
              if (prev !== null && !(avoid?.test(prev) ?? false)) { e.preventDefault(); window.history.back(); }
              return;
            }
            const steps = stepsBackTo(fallback);
            if (steps !== null) { e.preventDefault(); window.history.go(-steps); }
          }}>
      {children}
    </Link>
  );
}
