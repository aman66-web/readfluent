import Link from "next/link";

export const metadata = { title: "Privacy · ReadFluent" };

/**
 * A placeholder, said plainly. The full policy is written before the app is
 * released (M11, SPEC.md §10); the first screen links here so the link works.
 */
export default function Privacy() {
  return (
    <main className="safe-top safe-bottom px-6 pb-12 pt-8">
      <Link href="/welcome" className="text-[14px] font-semibold text-muted">← Back</Link>
      <h1 className="mt-6 text-[26px] font-bold tracking-[-0.015em]">Privacy</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        ReadFluent keeps where you are in each book, and your last level and length, on your own device. Nothing about your reading is
        sent anywhere while you use it without an account.
      </p>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        This is a short placeholder. A complete privacy policy will be published here before the app is released.
      </p>
    </main>
  );
}
