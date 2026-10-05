"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Modal } from "@/components/Modal";
import { APP_NAME } from "@/lib/brand";
import { isNative } from "@/lib/auth/native";
import { useLocale, useT } from "@/lib/i18n/react";
import { PRICE, TRIAL_DAYS, pounds } from "@/lib/plan";
import { refreshPlan } from "@/lib/pro/state";
import { orderedPackages } from "@/lib/purchases/packages";
import { getOfferings, hasProEntitlement, purchasePackage, purchasesAvailable, restorePurchases, trialEligibility } from "@/lib/purchases/native";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";

type Kind = "yearly" | "monthly";
interface Option { kind: Kind; price: string; perMonth: string; pkg?: PurchasesPackage; /** The free trial is on offer to this reader (the store says so; false once the Apple ID has had it). Unset until known. */ trial?: boolean }

/** What a year costs against twelve months, as a whole percentage off. */
export const savingPercent = (monthly: number, yearly: number): number => (monthly > 0 && yearly > 0 ? Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)) : 0);

const PERKS = ["paywall.b1", "paywall.b2", "paywall.b3"] as const;

/**
 * The subscription sheet: what a paid plan opens, the two prices, and a button. On the phone it sells
 * through the store (RevenueCat); on the web it shows the same offer and points to the app, since nothing is
 * bought in a browser. Nothing a reader has already earned depends on it (lib/plan.ts).
 */
export function Paywall({ onClose }: { onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const native = isNative() && purchasesAvailable();
  const [store, setOptions] = useState<Option[] | null>(null);
  const [trial, setTrial] = useState<Record<string, boolean> | null>(null);
  // On the phone the trial is shown only once the store has said this reader can have it; on the web it is the general offer.
  const options = useMemo(() => (store ?? fallbackOptions(t)).map((o) => ({ ...o, trial: o.pkg ? (trial?.[o.pkg.product.identifier] ?? false) : !native })), [store, t, trial, native]);
  const [pick, setPick] = useState<Kind>("yearly");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // On the phone the store's own prices replace the placeholders.
  useEffect(() => {
    if (!native) return;
    let live = true;
    void getOfferings().then((offering) => {
      if (!live) return;
      const found = orderedPackages(offering);
      if (found.length === 0) return;
      const money = (n: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
      const ids = found.map(({ pkg }) => pkg.product.identifier);
      void trialEligibility(ids).then((eligible) => {
        if (!live) return;
        // iOS says yes or no for each Apple ID; where the store cannot say (Android), a free first phase on the product counts.
        setTrial(Object.fromEntries(found.map(({ pkg }) => [pkg.product.identifier, eligible[pkg.product.identifier] ?? (pkg.product.introPrice?.price === 0)])));
      });
      setOptions(found.map(({ pkg, kind }) => {
        const p = pkg.product;
        const yearly = kind === "annual";
        return {
          kind: yearly ? "yearly" : "monthly",
          price: p.priceString,
          perMonth: yearly ? t("paywall.perMonth", { price: money(p.price / 12, p.currencyCode) }) : t("paywall.perMonth", { price: p.priceString }),
          pkg,
        } satisfies Option;
      }));
    });
    return () => { live = false; };
  }, [native, locale, t]);

  const saving = savingPercent(PRICE.monthlyPence, PRICE.yearlyPence);
  const chosen = options.find((o) => o.kind === pick) ?? options[0];

  const buy = async () => {
    if (!chosen?.pkg || busy) return;
    setBusy(true);
    setNote(null);
    const r = await purchasePackage(chosen.pkg);
    if (r.ok && hasProEntitlement(r.customerInfo)) {
      await refreshPlan();
      setDone(true);
    } else if (!r.ok && !r.cancelled) {
      setNote(t("paywall.failed"));
    }
    setBusy(false);
  };
  const restore = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const r = await restorePurchases();
    if (r.ok && hasProEntitlement(r.customerInfo)) { await refreshPlan(); setNote(t("paywall.restored")); setDone(true); }
    else setNote(r.ok ? t("paywall.nothing") : t("paywall.failed"));
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Modal label={t("paywall.title")} onClose={onClose} className="sheet-up relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-[440px] flex-col overflow-y-auto rounded-t-[32px] bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="sticky top-0 z-10 h-0 shrink-0">
          <button type="button" onClick={onClose} aria-label={t("ui.close")} className="absolute end-3 top-3 grid size-11 place-items-center rounded-full text-on-cyan active:bg-black/10">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="relative shrink-0 overflow-hidden rounded-t-[32px] bg-accent-bright px-6 pb-7 pt-5 text-center text-on-cyan">
          <span className="mx-auto grid size-[104px] place-items-center rounded-full bg-white/95 shadow-[0_10px_30px_-10px_rgba(0,0,0,.45)]">
            <Mascot mood={done ? "cheer" : "ready"} crop="head" className="block h-[92px] w-auto" />
          </span>
          <h2 className="mt-4 text-[27px] font-bold leading-tight tracking-[-0.02em]">{done ? t("paywall.thanks") : t("paywall.title")}</h2>
          {done ? null : <p className="mx-auto mt-1.5 max-w-[19rem] text-[15px] leading-snug text-on-cyan/80">{t("paywall.sub")}</p>}
        </div>

        {done ? (
          <div className="shrink-0 px-6 pt-6">
            <button type="button" onClick={onClose} className="btn-cyan h-14 w-full rounded-full text-[16.5px] font-bold">{t("ui.continue")}</button>
          </div>
        ) : (
          <div className="shrink-0 px-6 pt-5">
            <ul className="space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15px] leading-snug">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-bright/25 text-accent">
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </span>
                  {t(p)}
                </li>
              ))}
            </ul>

            <div role="radiogroup" aria-label={t("paywall.title")} className="mt-6 space-y-3">
              {options.map((o) => {
                const on = (chosen?.kind ?? pick) === o.kind;
                return (
                  <button key={o.kind} type="button" role="radio" aria-checked={on} onClick={() => setPick(o.kind)}
                          className={`relative flex w-full items-center gap-3.5 rounded-[20px] border-2 p-4 text-start transition-colors ${on ? "border-accent-bright bg-accent-bright/10" : "border-border bg-surface"}`}>
                    <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-accent bg-accent-bright text-on-cyan" : "border-border"}`}>
                      {on ? <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16.5px] font-bold">{t(o.kind === "yearly" ? "paywall.yearly" : "paywall.monthly")}</span>
                      {o.trial && <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[12px] font-bold text-emerald-800">{t("paywall.trialBadge", { n: TRIAL_DAYS })}</span>}
                      <span className="mt-0.5 block text-[13px] text-muted">{o.kind === "yearly" ? t("paywall.perYear", { price: o.price }) : t("paywall.perMonth", { price: o.price })}</span>
                    </span>
                    <span className="text-end">
                      {o.kind === "yearly" ? <span className="mb-0.5 inline-block rounded-full bg-accent-bright px-2.5 py-0.5 text-[11px] font-bold text-foreground">{saving > 0 ? t("paywall.save", { pct: saving }) : t("paywall.best")}</span> : null}
                      {o.kind === "yearly" ? <span className="block text-[13px] font-semibold text-accent">{o.perMonth}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {native ? (
              <button type="button" onClick={() => void buy()} disabled={busy || !chosen?.pkg} className="btn-cyan mt-5 h-14 w-full rounded-full text-[16.5px] font-bold disabled:opacity-60">{chosen?.trial ? t("paywall.ctaTrial", { n: TRIAL_DAYS }) : t("paywall.cta")}</button>
            ) : (
              <p className="mt-5 rounded-2xl bg-accent-bright/15 px-4 py-3.5 text-center text-[14.5px] font-semibold leading-snug">{t("paywall.webOnly", { app: APP_NAME })}</p>
            )}
            <p role="status" className="mt-2 min-h-5 text-center text-[13px] text-muted">{note}</p>
            <div className="mt-1 flex items-center justify-center gap-5">
              {native ? <button type="button" onClick={() => void restore()} disabled={busy} className="h-11 text-[14px] font-semibold text-accent">{t("paywall.restore")}</button> : null}
              <button type="button" onClick={onClose} className="h-11 text-[14px] font-semibold text-muted">{t("paywall.notNow")}</button>
            </div>
            <p className="mt-1 text-center text-[12px] leading-snug text-faint">{chosen?.trial ? `${t("paywall.trial", { n: TRIAL_DAYS })} ` : ""}{t("paywall.cancelAnytime")}</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-[12px] text-faint">
              <Link href="/terms" className="inline-flex h-9 items-center underline underline-offset-2">{t("me.terms")}</Link>
              <span aria-hidden>·</span>
              <Link href="/privacy" className="inline-flex h-9 items-center underline underline-offset-2">{t("me.privacy")}</Link>
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** The placeholder prices (lib/plan.ts), shown on the web and while the store's own are on their way. */
function fallbackOptions(t: ReturnType<typeof useT>): Option[] {
  return [
    { kind: "yearly", price: pounds(PRICE.yearlyPence), perMonth: t("paywall.perMonth", { price: pounds(Math.round(PRICE.yearlyPence / 12)) }) },
    { kind: "monthly", price: pounds(PRICE.monthlyPence), perMonth: t("paywall.perMonth", { price: pounds(PRICE.monthlyPence) }) },
  ];
}
