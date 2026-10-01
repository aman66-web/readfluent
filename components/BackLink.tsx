"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A back link that goes back to wherever the reader came from, when that was a page of this app,
 * and to `fallback` when they arrived some other way (a shared link, a fresh tab). Plain `Link`
 * semantics otherwise, so it still works without a script and opens in a new tab on request.
 */
export function BackLink({ fallback, className, label, children }: { fallback: string; className?: string; label?: string; children: ReactNode }) {
  return (
    <Link href={fallback} aria-label={label} className={className}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            let fromHere = false;
            try { fromHere = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch { /* no referrer */ }
            if (fromHere && window.history.length > 1) { e.preventDefault(); window.history.back(); }
          }}>
      {children}
    </Link>
  );
}
