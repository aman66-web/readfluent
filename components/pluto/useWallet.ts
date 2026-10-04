"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAnswers } from "@/lib/onboarding/use-answers";
import { boardSeed } from "@/lib/social/seed";
import { readRaw, subscribeTo } from "@/lib/store/local";
import { WALLET_KEY, balance, mintFromXp, parseWallet, payPrizes, readWallet, saveWallet, subscribeWallet, type Wallet } from "@/lib/pluto/wallet";
import { levelFromXp } from "@/lib/xp/levels";
import { LEDGER_KEY, parseLedger, totalXp } from "@/lib/xp/ledger";

const subLedger = subscribeTo(LEDGER_KEY);
const server = () => "";

export interface Gains { xp: number; prizes: { key: string; kind: "week" | "month"; rank: number; coins: number }[] }

/**
 * The wallet, kept up to date: whenever the reader's XP moves (or the screen opens), new XP and level-ups become coins and
 * finished boards pay their prizes. `gains` is what this visit added, for the screen to celebrate.
 */
export function useWallet(): { wallet: Wallet; coins: number; gains: Gains } {
  const a = useAnswers();
  const raw = useSyncExternalStore(subscribeWallet, () => readRaw(WALLET_KEY), server);
  const ledgerRaw = useSyncExternalStore(subLedger, () => readRaw(LEDGER_KEY), server);
  const [gains, setGains] = useState<Gains>({ xp: 0, prizes: [] });
  useEffect(() => {
    const ledger = parseLedger(ledgerRaw);
    const total = totalXp(ledger);
    let w = readWallet();
    const minted = mintFromXp(w, a.learn ?? "none", ledger.earned, total);
    w = minted.wallet;
    const paid = payPrizes(w, new Date(), ledger.days, boardSeed(), levelFromXp(total).code);
    w = paid.wallet;
    if (minted.coins > 0 || paid.won.length || JSON.stringify(w) !== readRaw(WALLET_KEY)) saveWallet(w);
    // What this visit added is only known once the wallet has been brought up to date with the device's XP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (minted.coins > 0 || paid.won.length) setGains((g) => ({ xp: g.xp + minted.coins, prizes: [...paid.won, ...g.prizes] }));
  }, [ledgerRaw, a.learn]);
  const wallet = useMemo(() => parseWallet(raw), [raw]);
  return { wallet, coins: balance(wallet), gains };
}
