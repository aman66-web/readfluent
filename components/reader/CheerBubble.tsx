"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Mascot } from "@/components/mascot/Mascot";

/**
 * Pluto, saying something now and then while the reader reads: a small bubble above the page buttons that goes by itself. Where it is
 * an invitation to chat (`href`) it is a link to Talk. It never covers the page's text and never blocks a swipe.
 */
export function CheerBubble({ text, href, onGone }: { text: string; href?: string; onGone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onGone, href ? 6500 : 4200);
    return () => window.clearTimeout(id);
  }, [text, href, onGone]);
  const inner = (
    <>
      <span className="reader-hop block w-[42px] shrink-0"><Mascot mood="cheer" className="w-full" /></span>
      <span className="min-w-0 text-[13.5px] font-semibold leading-snug">{text}</span>
    </>
  );
  const cls = "fade-in absolute left-1/2 bottom-[5.25rem] z-10 flex max-w-[88%] -translate-x-1/2 items-center gap-2 rounded-[22px] bg-foreground/95 py-1.5 pe-4 ps-2 text-background shadow-lg";
  return href
    ? <Link href={href} data-cheer className={cls}>{inner}</Link>
    : <p role="status" data-cheer className={`${cls} pointer-events-none`}>{inner}</p>;
}
