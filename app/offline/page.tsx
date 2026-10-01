import Link from "next/link";

/**
 * What a page that was not downloaded opens on with no connection. Plain on
 * purpose: it is served from the shell cache, so it must need nothing else.
 */
export default function Offline() {
  return (
    <main className="safe-top flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[22px] font-semibold">You&apos;re offline</h1>
      <p className="mt-2 max-w-[28ch] text-[15px] leading-snug text-muted">
        This isn&apos;t downloaded, so it needs a connection. Anything you&apos;ve downloaded still opens.
      </p>
      <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-foreground px-6 text-[14px] font-semibold text-background">
        Back to the app
      </Link>
    </main>
  );
}
