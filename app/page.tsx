import { Suspense } from "react";
import { Dashboard } from "@/components/home/Dashboard";
import { SignInNotice } from "@/components/SignInNotice";

/**
 * The home screen: the reader's level and XP, their reading graph, where to carry on,
 * and a way to the library (its own tab). Preview content only until the content
 * pipeline exists (lib/preview/catalog.ts, DECISIONS.md).
 */
export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <div className="px-5 pt-3 empty:hidden"><SignInNotice /></div>
      </Suspense>
      <Dashboard />
    </>
  );
}
