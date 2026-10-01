import { Suspense } from "react";
import { LibraryHeader } from "@/components/library/Header";
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
      <LibraryHeader />
      <Suspense fallback={null}>
        <SignInNotice />
      </Suspense>
      <div className="mt-6">
        <Library books={PREVIEW_BOOKS} />
      </div>
    </main>
  );
}
