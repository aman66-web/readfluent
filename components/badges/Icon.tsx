import type { BadgeId } from "@/lib/badges";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** One picture per badge, in the app's line style. */
const ICONS: Record<BadgeId, React.ReactNode> = {
  firstPage: <><path d="M12 6.5C10.2 5 7.6 4.5 4 4.8V18c3.6-.3 6.2.2 8 1.7 1.8-1.5 4.4-2 8-1.7V4.8c-3.6-.3-6.2.2-8 1.7z" /><path d="M12 6.5v13.2" /></>,
  streak3: <path d="M12 3c.5 3-2.5 4.5-2.5 7.5A2.5 2.5 0 0 0 12 13c0-1.2.8-2 1.5-2.7C15 11.5 17 13 17 15.5a5 5 0 0 1-10 0C7 10 11 8 12 3z" />,
  streak7: <><path d="M12 3c.5 3-2.5 4.5-2.5 7.5A2.5 2.5 0 0 0 12 13c0-1.2.8-2 1.5-2.7C15 11.5 17 13 17 15.5a5 5 0 0 1-10 0C7 10 11 8 12 3z" /><path d="M9 21h6" /></>,
  streak30: <><circle cx="12" cy="9" r="5.5" /><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5" /></>,
  pages100: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  pages1000: <><path d="M4 19V6.5L12 4l8 2.5V19" /><path d="M4 19l8-2.5 8 2.5M12 4v12.5" /></>,
  finished: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  words25: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" />,
  cards50: <><rect x="3" y="7" width="14" height="11" rx="2.5" /><path d="M7 7V6a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H17" /></>,
  friend: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18 8v6M15 11h6" /></>,
};

export function BadgeIcon({ id, className = "size-6" }: { id: BadgeId; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden>{ICONS[id]}</svg>;
}
