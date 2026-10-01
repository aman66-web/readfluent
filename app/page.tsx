import { Suspense } from "react";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import { SignInNotice } from "@/components/SignInNotice";

/**
 * The home screen — a stub until M3 builds the library. It exists so the app
 * boots, the shell is installable and the native wrappers have something to
 * load; SPEC.md §10 has the milestones that fill it in.
 */
export default function Home() {
  return (
    <main className="safe-top safe-bottom flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[34px] font-bold tracking-[-0.02em]">{APP_NAME}</h1>
      <p className="font-reading mt-2 text-[19px] text-muted">{TAGLINE}</p>
      <p className="mt-10 max-w-[30ch] text-[14px] leading-snug text-faint">
        The library is on its way.
      </p>
      <Suspense fallback={null}>
        <SignInNotice />
      </Suspense>
    </main>
  );
}
