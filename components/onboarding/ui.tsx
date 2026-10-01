import type { ButtonHTMLAttributes, ReactNode } from "react";

/** The arrow carried by the disc on the primary button. */
export const ArrowIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 rtl:-scale-x-100" aria-hidden>
    <path d="M5 12h13M12 5l7 7-7 7" />
  </svg>
);

/** A tick, for a chosen card or a finished task. */
export const TickIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** The one primary button: bright cyan, dark ink, the arrow in a disc. */
export function PrimaryButton({ children, className = "", withArrow = true, ...rest }: {
  children: ReactNode;
  className?: string;
  withArrow?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`ob-primary wel-in inline-flex h-14 w-full select-none items-center justify-center gap-2.5 rounded-full px-6 text-[16px] font-semibold tracking-[-0.01em] transition-[transform,filter,background-color,color] duration-[140ms] ease-[cubic-bezier(.22,1,.36,1)] active:scale-[0.98] disabled:active:scale-100 ${className}`}
    >
      {children}
      {withArrow && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/10">{ArrowIcon}</span>}
    </button>
  );
}
