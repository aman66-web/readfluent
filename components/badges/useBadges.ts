"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { BADGES_KEY, parseBadges, recordBadges, statsFrom, type BadgeState } from "@/lib/badges";
import { SOCIAL_KEY, parseSocial } from "@/lib/social/cache";
import { EMPTY_SRS, SRS_KEY, parseSrs } from "@/lib/srs/store";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { SAVED_KEY, parseSaved } from "@/lib/words/saved";
import { LEDGER_KEY, parseLedger } from "@/lib/xp/ledger";
import { useToday } from "@/lib/xp/today";

const subs = {
  ledger: subscribeTo(LEDGER_KEY), saved: subscribeTo(SAVED_KEY), srs: subscribeTo(SRS_KEY), social: subscribeTo(SOCIAL_KEY), badges: subscribeTo(BADGES_KEY),
};
const server = () => "";

/** The badges the reader has earned (the device's record), and whatever they have reached since is added to it as it happens. */
export function useBadges(): BadgeState {
  const today = useToday();
  const ledgerRaw = useSyncExternalStore(subs.ledger, () => readRaw(LEDGER_KEY), server);
  const savedRaw = useSyncExternalStore(subs.saved, () => readRaw(SAVED_KEY), server);
  const srsRaw = useSyncExternalStore(subs.srs, () => readRaw(SRS_KEY), server);
  const socialRaw = useSyncExternalStore(subs.social, () => readRaw(SOCIAL_KEY), server);
  const badgesRaw = useSyncExternalStore(subs.badges, () => readRaw(BADGES_KEY), server);

  useEffect(() => {
    if (!today) return; // not on the device yet
    const srs = srsRaw ? parseSrs(srsRaw) : EMPTY_SRS;
    const cards = Object.values(srs.log).reduce((n, c) => n + c, 0);
    recordBadges(statsFrom(parseLedger(ledgerRaw), Object.keys(parseSaved(savedRaw)).length, cards, parseSocial(socialRaw).friends));
  }, [today, ledgerRaw, savedRaw, srsRaw, socialRaw]);

  return useMemo(() => parseBadges(badgesRaw), [badgesRaw]);
}
