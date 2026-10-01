"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/react";
import type { MessageId } from "@/lib/i18n/en";

/**
 * The menu: four tabs in a floating bar along the foot of the screen, the same four as
 * the app this one's engineering came from — Today, the Library, a place to review, and
 * the reader's own shelf — named for reading:
 *
 *   Home · Library · Recall · My books
 *
 * Home is the dashboard (level, XP, the graph). Library is every book, by category.
 * Recall is where the words met while reading come back before they are forgotten
 * (flashcards, M7). My books is what is theirs: what they are reading, have finished,
 * and have downloaded (M9). A glass pill slides to the tab they are on.
 */
type Tab = { href: string; key: MessageId; icon: React.ReactNode };

const TABS: readonly Tab[] = [
  // A house with a door.
  { href: "/", key: "tab.home", icon: <><path d="M4 11.2 12 4l8 7.2" /><path d="M6.2 9.8V20h11.6V9.8" /><path d="M10 20v-5.2h4V20" /></> },
  // An open book.
  { href: "/library", key: "tab.library", icon: <><path d="M12 6.5C10.2 5 7.6 4.5 4 4.8V18c3.6-.3 6.2.2 8 1.7 1.8-1.5 4.4-2 8-1.7V4.8c-3.6-.3-6.2.2-8 1.7z" /><path d="M12 6.5v13.2" /></> },
  // Two flashcards, one lifting off the other.
  { href: "/recall", key: "tab.recall",
    icon: <><rect x="3.5" y="8" width="12.5" height="12" rx="2" /><path d="M8 4.5h10.5a2 2 0 0 1 2 2V16" /><path d="M7.5 14l1.8 1.8 3.2-3.6" /></> },
  // Three books standing on a shelf, one leaning.
  { href: "/mine", key: "tab.mine",
    icon: <><path d="M4.5 4.5h3v15h-3zM9.5 4.5h3v15h-3z" /><path d="M14.6 5.6l2.9-.8 3.3 14-2.9.8z" /></> },
];

/** Screens that own the phone, with their own way out: the first run, the placement test, reading. */
const HIDDEN = [/^\/welcome/, /^\/placement/, /^\/read\//, /^\/offline/, /^\/privacy/];

export function TabBar() {
  const path = usePathname();
  const t = useT();
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  const isActive = (href: string) =>
    href === "/" ? path === "/"
      : href === "/library" ? path.startsWith("/library") || path.startsWith("/book/")
      : path.startsWith(href);
  const activeIndex = TABS.findIndex((tab) => isActive(tab.href));
  const hidden = HIDDEN.some((re) => re.test(path));

  // Measured, not derived from a fraction: a translated label makes the tabs different widths.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || activeIndex < 0) return;
    const move = () => {
      const item = nav.querySelectorAll<HTMLElement>("[data-tab]")[activeIndex];
      if (item) setPill({ x: item.offsetLeft, w: item.offsetWidth });
    };
    move();
    const ro = new ResizeObserver(move);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activeIndex, t, hidden]);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <nav ref={navRef} aria-label={t("tab.menu")}
           className="pointer-events-auto relative flex h-[64px] items-center rounded-full bg-white/85 px-1.5 shadow-[0_14px_40px_-14px_rgba(8,47,62,.45)] ring-1 ring-black/[0.06] backdrop-blur-xl">
        {pill && activeIndex >= 0 && (
          <span aria-hidden className="tab-ind absolute bottom-1.5 left-0 top-1.5 rounded-full bg-[#22D3EE]/20 ring-1 ring-inset ring-[#22D3EE]/35"
                style={{ transform: `translateX(${pill.x}px)`, width: pill.w }} />
        )}
        {TABS.map(({ href, key, icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} data-tab aria-current={active ? "page" : undefined}
                  className={`relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors duration-300 ${active ? "text-accent" : "text-faint"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                   className={`size-[22px] shrink-0 transition-transform duration-300 ${active ? "-translate-y-px scale-110" : ""}`} aria-hidden>
                {icon}
              </svg>
              <span className="max-w-full truncate px-0.5">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
