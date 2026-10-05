"use client";

import { useEffect, useState } from "react";
import { dbConfigured } from "@/lib/db/env";
import { createClient } from "@/lib/db/client";
import { ONBOARDED_COOKIE } from "@/lib/onboarding";
import { markOfferSeen, offerSeen, release } from "@/lib/pro/offer";
import { getCustomerInfo, hasProEntitlement, purchasesAvailable } from "@/lib/purchases/native";
import { loadPlanRows, type PlanRow } from "@/lib/purchases/offer";
import { readTour } from "@/lib/tour/state";
import { Paywall } from "./Paywall";

const onboarded = (): boolean => document.cookie.split("; ").some((c) => c.startsWith(`${ONBOARDED_COOKIE}=`));
const within = <T,>(work: Promise<T>, ms: number): Promise<T | null> => new Promise((resolve) => {
  const id = window.setTimeout(() => resolve(null), ms);
  work.then((v) => { window.clearTimeout(id); resolve(v); }, () => { window.clearTimeout(id); resolve(null); });
});

/**
 * Shows the subscription screen once, right before the guided tour: on the phone, to somebody signed in who has
 * finished the first run, who is not already Pro, and only when the store has plans to show (a price that
 * has not loaded is not shown as a guess). "Continue free", or buying, starts the tour. Everywhere else it does
 * nothing, and lets the tour start straight away (lib/pro/offer.ts holds the tour while the offer may still come).
 * Mounted once, in the root layout. Renders nothing until it has a screen to show.
 */
export function OfferGate() {
  const [rows, setRows] = useState<PlanRow[] | null>(null);

  useEffect(() => {
    if (!purchasesAvailable() || offerSeen()) { release(); return; }
    // The first run is not over yet (it sets this cookie when it ends): nothing to do on its screens.
    if (!onboarded()) return;
    let live = true;
    const safety = window.setTimeout(release, 15000);
    (async () => {
      // A reader who has already done or skipped the tour does not get the offer in front of it ever after.
      if (readTour().done) { markOfferSeen(); return; }
      // Somebody who can't be told from Pro is not shown it (and it is not used up).
      const info = await within(getCustomerInfo(), 6000);
      if (!live) return;
      if (info && hasProEntitlement(info)) { markOfferSeen(); return; }
      if (dbConfigured()) {
        const user = await within(createClient().auth.getUser().then((r) => r.data.user), 6000);
        if (!live) return;
        if (!user || user.is_anonymous) { release(); return; }
      }
      const plans = await within(loadPlanRows(), 8000);
      if (!live) return;
      if (!plans || plans.length === 0) { release(); return; }
      window.clearTimeout(safety);
      setRows(plans);
    })().catch(() => release());
    return () => { live = false; window.clearTimeout(safety); };
  }, []);

  if (!rows) return null;
  return <Paywall rows={rows} onClose={() => { setRows(null); markOfferSeen(); }} />;
}
