"use client";

import { useState, useSyncExternalStore } from "react";
import { BackLink } from "@/components/BackLink";
import { Mascot } from "@/components/mascot/Mascot";
import { useLocale, useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";
import { EARN, ITEMS, type Item, type Look, type Slot } from "@/lib/pluto/shop";
import { buy, equip, readWallet, saveWallet } from "@/lib/pluto/wallet";
import { Coin } from "./Coin";
import { useWallet } from "./useWallet";

const SLOTS: Slot[] = ["colour", "head", "face", "pet"];
const SLOT_LABEL: Record<Slot, MessageId> = { colour: "shop.tab.colour", head: "shop.tab.head", face: "shop.tab.face", pet: "shop.tab.pet" };
const SWATCH: Record<string, string> = { cyan: "#22D3EE", mint: "#34D8A8", violet: "#9B7BFF", rose: "#FF7FB2", gold: "#F5B82E", galaxy: "conic-gradient(#22D3EE, #9B7BFF, #FF7FB2, #F5B82E, #34D8A8, #22D3EE)" };
const noSubscribe = () => () => {};

const wearing = (look: Look, item: Item): boolean => look[item.slot] === item.id;
const tryOn = (look: Look, item: Item): Look => ({ ...look, [item.slot]: item.id });

/**
 * Pluto's wardrobe (owner, 4 Oct 2026): colours, hats, shades and pets, bought with the coins the reader earns from XP,
 * level-ups and the leaderboards. Tapping something tries it on Pluto at the top; then Buy, Wear or Take off.
 */
export function Wardrobe() {
  const t = useT();
  const locale = useLocale();
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
  const { wallet, coins } = useWallet();
  const [slot, setSlot] = useState<Slot>("colour");
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cheer, setCheer] = useState(0);
  const item = ITEMS.find((i) => i.id === picked && i.slot === slot) ?? null;
  const preview = item ? tryOn(wallet.look, item) : wallet.look;
  const owned = (id: string) => wallet.owned.includes(id);
  const name = (id: string) => t(`item.${id}` as MessageId);

  const doBuy = () => {
    if (!item) return;
    const r = buy(readWallet(), item.id);
    if (r.result === "bought") { saveWallet(r.wallet); setNote(t("shop.bought", { item: name(item.id) })); setCheer((n) => n + 1); }
  };
  const doWear = (on: boolean) => {
    if (!item) return;
    saveWallet(equip(readWallet(), item.slot, on ? item.id : null));
    setNote(null);
    if (on) setCheer((n) => n + 1);
  };

  return (
    <main className="safe-top px-5 pb-40 [--pt:.5rem]">
      <div className="flex items-center justify-between">
        <BackLink fallback="/" previous label={t("ui.back")} className="-ms-2 flex size-11 items-center justify-center rounded-full active:bg-border/60">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </BackLink>
        <span className="tabular inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[16px] font-extrabold ring-1 ring-inset ring-border" data-coins={coins}>
          <Coin className="size-5" />{client ? coins.toLocaleString(locale) : "…"}
        </span>
      </div>
      <h1 className="title-display mt-1">{t("shop.title")}</h1>

      <div className="relative mt-3 flex justify-center overflow-hidden rounded-[28px] bg-gradient-to-b from-[#E6FAFE] to-[#BDEFF8] pb-3 pt-7">
        <span aria-hidden className="pointer-events-none absolute inset-x-10 bottom-4 h-6 rounded-full bg-[#0B1B22]/5 blur-md" />
        <Mascot key={cheer} mood={cheer ? "cheer" : "hello"} look={preview} className="w-[min(64vw,240px)]" />
      </div>

      <div role="tablist" aria-label={t("shop.title")} className="mt-4 grid grid-cols-4 gap-1.5">
        {SLOTS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={slot === s} onClick={() => { setSlot(s); setPicked(null); setNote(null); }}
                  className={`opt h-11 rounded-2xl text-[13.5px] font-bold ${slot === s ? "opt-on" : ""}`}>{t(SLOT_LABEL[s])}</button>
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2.5" role="listbox" aria-label={t(SLOT_LABEL[slot])}>
        {ITEMS.filter((i) => i.slot === slot).map((i) => {
          const on = picked === i.id;
          const have = owned(i.id);
          const worn = wearing(wallet.look, i);
          return (
            <li key={i.id}>
              <button type="button" role="option" aria-selected={on} onClick={() => { setPicked(i.id); setNote(null); }} data-item={i.id}
                      className={`opt flex w-full flex-col items-center rounded-[20px] px-2 pb-2.5 pt-2 ${on ? "opt-on" : ""}`}>
                <span className="grid h-[76px] w-full place-items-center" aria-hidden>
                  {i.slot === "colour" ? (
                    <span className="block size-14 rounded-full shadow-inner ring-4 ring-white" style={{ background: SWATCH[i.id] }} />
                  ) : i.slot === "pet" ? (
                    <Mascot mood="hello" look={{ ...wallet.look, pet: i.id }} className="h-[76px] w-auto" />
                  ) : (
                    <Mascot mood="hello" crop="head" look={{ ...wallet.look, [i.slot]: i.id }} className="h-[70px] w-auto" />
                  )}
                </span>
                <span className="mt-1 block w-full truncate text-center text-[13px] font-semibold">{name(i.id)}</span>
                <span className={`tabular mt-0.5 inline-flex items-center gap-1 text-[12px] font-bold ${worn ? "text-emerald-600" : have ? "text-[var(--ob-deep)]" : coins >= i.price ? "text-foreground" : "text-faint"}`}>
                  {worn ? `✓ ${t("shop.wearing")}` : have ? t("shop.owned") : i.price === 0 ? t("shop.free") : <><Coin className="size-3.5" />{i.price.toLocaleString(locale)}</>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="mt-6 rounded-[22px] border border-border bg-surface p-4">
        <h2 className="text-[15px] font-bold">{t("shop.how")}</h2>
        <ul className="mt-2 space-y-1.5 text-[13.5px] leading-snug text-muted">
          <li>• {t("shop.how.xp", { n: EARN.xpPerCoin })}</li>
          <li>• {t("shop.how.level", { stage: EARN.stage, level: EARN.level })}</li>
          <li>• {t("shop.how.board", { week: EARN.week[0], month: EARN.month[0] })}</li>
        </ul>
      </section>

      {/* What to do with the item tapped: it stays on screen above the menu. */}
      {item && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-20 mx-auto max-w-[440px] px-5">
          <div className="sheet-card rounded-[22px] bg-background/95 p-3 shadow-[0_14px_40px_rgba(0,0,0,.18)] backdrop-blur">
            <p className="px-1 text-[14.5px] font-bold">{name(item.id)}{note ? <span className="ms-2 font-semibold text-emerald-600">{note}</span> : null}</p>
            <div className="mt-2 flex gap-2">
              {owned(item.id) ? (
                wearing(wallet.look, item) ? (
                  item.slot === "colour" && item.id === "cyan" ? null : <button type="button" onClick={() => doWear(false)} className="h-12 flex-1 rounded-full border-2 border-border text-[15px] font-bold active:bg-border/60">{t("shop.takeOff")}</button>
                ) : (
                  <button type="button" onClick={() => doWear(true)} className="btn-cyan h-12 flex-1 rounded-full text-[15px] font-bold">{t("shop.wear")}</button>
                )
              ) : coins >= item.price ? (
                <button type="button" onClick={doBuy} className="btn-cyan inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full text-[15px] font-bold">{t("shop.buy")} <Coin className="size-5" />{item.price.toLocaleString(locale)}</button>
              ) : (
                <p className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-border/50 text-[14px] font-semibold text-muted"><Coin className="size-4" />{t("shop.need", { n: (item.price - coins).toLocaleString(locale) })}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
