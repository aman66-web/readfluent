import { Suspense } from "react";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import { Library } from "@/components/library/Library";
import { SignInNotice } from "@/components/SignInNotice";
import { PREVIEW_BOOKS } from "@/lib/preview/catalog";

/**
 * The library: pick a category, pick a book. Preview content only until the
 * content pipeline exists (lib/preview/catalog.ts, DECISIONS.md).
 */
export default function Home() {
  return (
    <main className="safe-top safe-bottom px-5 pb-10 pt-6">
      <header>
        <h1 className="text-[30px] font-bold tracking-[-0.02em]">{APP_NAME}</h1>
        <p className="font-reading mt-0.5 text-[17px] text-muted">{TAGLINE}</p>
      </header>
      <Suspense fallback={null}>
        <SignInNotice />
      </Suspense>
      <div className="mt-6">
        <Library books={PREVIEW_BOOKS} />
      </div>
    </main>
  );
}
