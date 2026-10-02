"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { accountAvailable } from "@/components/onboarding/SignIn";
import { useT } from "@/lib/i18n/react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { syncProfile } from "@/lib/social/api";
import { SOCIAL_KEY, parseSocial, saveSocial } from "@/lib/social/cache";
import { profilePayload } from "@/lib/social/model";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { LEDGER_KEY, parseLedger } from "@/lib/xp/ledger";

const subSocial = subscribeTo(SOCIAL_KEY);
const server = () => "";
/** How often the device reports itself while the home screen is opened. */
const EVERY_MS = 15 * 60_000;

/**
 * The way into friends and the league, on the home screen. A reader who has joined (opened it once)
 * is also reported to the server now and then from here, so the league follows what they read.
 */
export function FriendsCard() {
  const t = useT();
  const a = useAnswers();
  const raw = useSyncExternalStore(subSocial, () => readRaw(SOCIAL_KEY), server);
  const social = parseSocial(raw);
  const joined = social.friendCode !== "";

  useEffect(() => {
    if (!accountAvailable() || !joined || Date.now() - social.syncedAt < EVERY_MS) return;
    // Quiet: a failure (offline, signed out) just means the next visit tries again.
    void syncProfile(profilePayload(parseLedger(readRaw(LEDGER_KEY)), a.name, new Date()))
      .then(() => saveSocial({ syncedAt: Date.now() }))
      .catch(() => {});
  }, [joined, social.syncedAt, a.name]);

  if (!accountAvailable()) return null;
  return (
    <Link href="/friends" className="mt-3 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4 active:bg-border/40">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-bright/25 text-accent">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold tracking-[-0.01em]">{t("home.friends")}</span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">{t("home.friendsSub")}</span>
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-faint rtl:-scale-x-100" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
    </Link>
  );
}
