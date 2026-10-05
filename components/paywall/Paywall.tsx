"use client";

import "./offer.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mascot } from "@/components/mascot/Mascot";
import { Modal } from "@/components/Modal";
import { APP_NAME } from "@/lib/brand";
import { isNative } from "@/lib/auth/native";
import { useLocale, useT } from "@/lib/i18n/react";
import { refreshPlan } from "@/lib/pro/state";
import { hasProEntitlement, purchasePackage, purchasesAvailable, restorePurchases } from "@/lib/purchases/native";
import { SHORT_PAGES, compareRows, loadPlanRows, money, savingOf, type PlanRow } from "@/lib/purchases/offer";

export { savingPercent } from "@/lib/purchases/offer";

/**
 * The subscription screen: a whole screen on a dark ground (the layout follows the one in the app this
 * one's engineering came from: close at the top right, the guide wearing a badge, why it is not all free in
 * three plain points, Free beside Pro, the plans, and the way in kept in reach at the bottom).
 *
 * Every number on it is the store's. On the phone the plans, what they come to a week and a month, the saving
 * and the trial are worked out from the products RevenueCat reads from the App Store / Google Play
 * (lib/purchases/offer.ts), so another country shows its own currency; nothing is typed in. In a browser
 * there is no store, so it shows the same pitch and says where to subscribe. What Apple asks of a screen that
 * sells a subscription is all here: the price and length of each plan, the trial's terms beside the button that
 * starts it, Restore, and the Terms and Privacy links. Nothing a reader has already earned depends on it
 * (lib/plan.ts). "Continue free" only closes it: it is shown once before the tour (OfferGate) and from Profile.
 *
 * `preview` (a currency code) feeds fake store prices to look at the screen in a browser; it exists only
 * outside a production build.
 */
export function Paywall({ onClose, rows: given = null, preview }: {
  onClose: () => void;
  /** Plans already read from the store (the screen before the tour reads them first, to know it has something to show). */
  rows?: PlanRow[] | null;
  /** Development only: a currency to show fake store prices in. Ignored in a production build. */
  preview?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [native, setNative] = useState(false);
  const [rows, setRows] = useState<PlanRow[] | null>(given);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "buying" | "restoring">("idle");
  const [note, setNote] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNative(isNative() && purchasesAvailable());
  }, []);

  // The store's plans (or, in development, the fake ones for `preview`).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && preview) {
      let live = true;
      void import("./preview").then((m) => { if (live) setRows(m.previewRows(preview)); });
      return () => { live = false; };
    }
    if (given || !mounted) return;
    if (!native) { setRows([]); return; }
    let live = true;
    void loadPlanRows().then((r) => { if (live) setRows(r); }).catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [mounted, native, given, preview]);

  const canBuy = native || (process.env.NODE_ENV !== "production" && Boolean(preview));
  const chosen = rows?.find((r) => r.id === pick) ?? rows?.find((r) => r.kind === "annual") ?? rows?.[0] ?? null;
  const save = savingOf(rows);
  const per = (r: PlanRow) => t(r.kind === "annual" ? "paywall.priceYear" : "paywall.priceMonth", { price: r.price });

  const close = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onClose, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 320);
  };

  async function buy() {
    if (!chosen?.pkg || busy !== "idle") return;
    setBusy("buying");
    setNote(null);
    const r = await purchasePackage(chosen.pkg);
    if (r.ok && hasProEntitlement(r.customerInfo)) {
      await refreshPlan();
      setDone(true);
    } else if (!r.ok && !r.cancelled) {
      setNote(t("paywall.failed"));
    }
    setBusy("idle");
  }
  async function restore() {
    if (busy !== "idle") return;
    setBusy("restoring");
    setNote(null);
    const r = await restorePurchases();
    if (r.ok && hasProEntitlement(r.customerInfo)) { await refreshPlan(); setNote(t("paywall.restored")); setDone(true); }
    else setNote(r.ok ? t("paywall.nothing") : t("paywall.failed"));
    setBusy("idle");
  }

  if (!mounted) return null;

  return createPortal(
    <div className={`offer fixed inset-0 z-[70] overflow-y-auto overscroll-contain ${leaving ? "offer-out" : ""}`}>
      <Modal label={t("paywall.hero")} onClose={close} className="min-h-full">
        <div aria-hidden className="offer-glow" />
        <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          {/* The way out, said plainly: the free plan is the app. */}
          <div className="flex justify-end">
            <button type="button" onClick={close}
                    className="-me-1 inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold text-foreground/90 ring-1 ring-inset ring-white/35 transition-transform active:scale-95">
              {t("paywall.continueFree")}
            </button>
          </div>

          {/* The guide, wearing the badge, with sparks around it. */}
          <div className="offer-in relative mx-auto mt-1 w-fit" style={{ animationDelay: "60ms" }}>
            {SPARKS.map((s, i) => (
              <span key={i} aria-hidden className="offer-spark absolute rounded-full" style={{ left: s.x, top: s.y, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
            ))}
            <Mascot mood={done ? "cheer" : "ready"} talking={!done} className="block w-[132px]" />
            <span className="offer-badge absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em]">PRO</span>
          </div>

          {done ? (
            <div className="offer-in mt-6 text-center" style={{ animationDelay: "60ms" }}>
              <h1 className="offer-headline mx-auto max-w-[21rem] text-[31px] font-semibold leading-[1.08] tracking-[-0.03em]">{t("paywall.thanks")}</h1>
              <button type="button" onClick={close} className="offer-cta mt-8 flex h-[56px] w-full items-center justify-center rounded-full text-[16.5px] font-bold">{t("ui.continue")}</button>
            </div>
          ) : (
            <>
              <h1 className="offer-in offer-headline mx-auto mt-6 max-w-[21rem] text-center text-[31px] font-semibold leading-[1.08] tracking-[-0.03em]" style={{ animationDelay: "140ms" }}>
                {t("paywall.hero")}
              </h1>
              <p className="offer-in mx-auto mt-2.5 max-w-[21rem] text-center text-[15px] leading-snug text-foreground/70" style={{ animationDelay: "200ms" }}>
                {t("paywall.heroSub")}
              </p>

              {/* Why it is not all free, in three plain points, so nobody feels tricked. */}
              <div className="offer-in offer-card mt-6 rounded-[22px] p-5" style={{ animationDelay: "260ms" }}>
                <p className="flex items-center gap-2 text-[16px] font-semibold">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] shrink-0 text-accent-bright" aria-hidden>
                    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.7 1.2 5.2 3 1.5-1.8 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />
                  </svg>
                  {t("paywall.whyTitle")}
                </p>
                <ol className="mt-3 space-y-2.5">
                  {WHY.map((k, i) => (
                    <li key={k} className="flex gap-3 text-[14px] leading-snug text-foreground/80">
                      <span className="offer-num tabular mt-px grid size-[22px] shrink-0 place-items-center rounded-full text-[12px] font-bold">{i + 1}</span>
                      <span className="min-w-0">{t(k, { pages: SHORT_PAGES })}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <Compare />

              {/* The plans, from the store. */}
              <h2 className="mt-8 text-[19px] font-semibold tracking-[-0.01em]">{t("paywall.plansTitle")}</h2>
              <div className="mt-3.5 space-y-3" role="radiogroup" aria-label={t("paywall.plansTitle")}>
                {rows === null ? (
                  <p className="py-6 text-center text-[13px] text-foreground/60">{t("paywall.loading")}</p>
                ) : !canBuy ? (
                  <p className="offer-card rounded-2xl px-4 py-3.5 text-center text-[14.5px] font-semibold leading-snug">{t("paywall.webOnly", { app: APP_NAME })}</p>
                ) : rows.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-foreground/60">{t("paywall.unavailable")}</p>
                ) : rows.map((r) => {
                  const on = chosen?.id === r.id;
                  const yearly = r.kind === "annual";
                  const week = yearly ? money(r.amount / 52, r.currency, locale) : null;
                  const month = yearly ? money(r.amount / 12, r.currency, locale) : null;
                  return (
                    <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => setPick(r.id)}
                            className={`offer-plan relative flex w-full items-center gap-3 rounded-[20px] px-4 py-4 text-start ${on ? "offer-plan-on" : ""}`}>
                      {yearly && (
                        <span className="offer-save absolute -top-2.5 end-4 rounded-full px-2.5 py-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.08em]">
                          {save >= 5 ? t("paywall.save", { pct: save }) : t("paywall.best")}
                        </span>
                      )}
                      <span className={`grid size-5 shrink-0 place-items-center rounded-full ring-2 ${on ? "offer-radio-on" : "ring-white/30"}`} aria-hidden>
                        {on && <span className="size-2 rounded-full bg-[var(--on-cyan)]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold">{t(yearly ? "paywall.yearly" : "paywall.monthly")}</span>
                        {week && <span className="offer-week mt-0.5 block text-[13px] font-bold leading-snug">{t("paywall.perWeek", { price: week })}</span>}
                        {(r.trial || month) && (
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-foreground/60">
                            {r.trial ? t("paywall.trialDays", { n: r.trial }) : null}
                            {r.trial && month ? " · " : null}
                            {month ? t("paywall.monthBilledYearly", { price: month }) : null}
                          </span>
                        )}
                      </span>
                      <span className="tabular shrink-0 text-end text-[16px] font-bold" dir="auto">{per(r)}</span>
                    </button>
                  );
                })}
              </div>
              {note && <p role="alert" className="mt-3 text-center text-[12.5px] font-medium text-error">{note}</p>}

              {/* What Apple asks of a subscription screen, in full. */}
              <div className="mt-6 text-center">
                <p className="text-[11px] leading-snug text-foreground/55">{t("paywall.autoRenew")}</p>
                <p className="mt-2 flex flex-wrap justify-center gap-x-4 text-[12px] font-semibold text-foreground/70">
                  {canBuy && (
                    <button type="button" onClick={() => void restore()} disabled={busy !== "idle"} className="inline-flex min-h-9 items-center underline underline-offset-2">
                      {busy === "restoring" ? t("paywall.working") : t("paywall.restore")}
                    </button>
                  )}
                  <Link href="/terms" className="inline-flex min-h-9 items-center underline underline-offset-2">{t("me.terms")}</Link>
                  <Link href="/privacy" className="inline-flex min-h-9 items-center underline underline-offset-2">{t("me.privacy")}</Link>
                </p>
              </div>

              {/* The way in stays in reach however far down somebody has read, with what it costs said right under it. */}
              <div className="offer-foot sticky bottom-0 -mx-5 mt-auto px-5 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-7">
                {canBuy && chosen && (
                  <>
                    <button type="button" onClick={() => void buy()} disabled={!chosen.pkg || busy !== "idle"} data-busy={busy === "buying" ? "1" : undefined}
                            className="offer-cta flex h-[56px] w-full items-center justify-center gap-2 rounded-full text-[16.5px] font-bold transition-transform active:scale-[0.98]">
                      {busy === "buying" ? t("paywall.working") : chosen.trial ? t("paywall.ctaTrial", { n: chosen.trial }) : t("paywall.cta")}
                    </button>
                    <p className="mt-2 text-center text-[12px] font-medium text-foreground/70">
                      {chosen.trial ? t("paywall.footTrial", { n: chosen.trial, price: per(chosen) }) : t("paywall.footPlain", { price: per(chosen) })}
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>,
    document.body,
  );
}

const WHY = ["paywall.why1", "paywall.why2", "paywall.why3"] as const;

/** Free and Pro, side by side. A row is here only if the rules lock it (lib/purchases/offer.ts reads them from lib/plan.ts). */
function Compare() {
  const t = useT();
  return (
    <div className="offer-in mt-8" style={{ animationDelay: "320ms" }}>
      <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{t("paywall.vsTitle")}</h2>
      <div className="offer-card mt-3 overflow-hidden rounded-[22px]">
        <div className="flex items-center px-4 pb-2 pt-3.5 text-[11.5px] font-bold uppercase tracking-[0.1em]">
          <span className="flex-1" />
          <span className="w-12 text-center text-foreground/65">{t("paywall.colFree")}</span>
          <span className="offer-pro-col w-12 text-center">PRO</span>
        </div>
        {compareRows().map((r, i) => (
          <div key={r.id} className={`flex items-center gap-2 px-4 py-3 ${i ? "border-t border-white/[0.07]" : ""}`}>
            <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug">{t(r.key, { pages: r.pages ?? 0 })}</span>
            <span className="grid w-12 shrink-0 place-items-center">{r.free ? <Tick dim /> : <span className="h-[2px] w-3 rounded-full bg-white/25" aria-label="–" role="img" />}</span>
            <span className="grid w-12 shrink-0 place-items-center">{r.pro ? <Tick /> : <span className="h-[2px] w-3 rounded-full bg-white/25" aria-hidden />}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tick({ dim = false }: { dim?: boolean }) {
  return (
    <span className={`grid size-[22px] place-items-center rounded-full ${dim ? "bg-white/15 text-foreground/80" : "offer-tick"}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="size-3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
}

/** Where the guide's sparks sit round it, in px from its box, their size and when each twinkles. */
const SPARKS = [
  { x: -26, y: 14, s: 6, d: 0 }, { x: 140, y: 6, s: 5, d: 0.7 }, { x: 152, y: 78, s: 7, d: 1.4 },
  { x: -34, y: 84, s: 4, d: 2.1 }, { x: 10, y: -10, s: 4, d: 1 }, { x: 116, y: 128, s: 5, d: 1.8 },
];
