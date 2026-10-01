"use client";

import type { ReactNode } from "react";
import { useDialog } from "@/lib/a11y/use-dialog";

/** A modal dialog's container: named, focused when it opens, Tab kept inside, Escape to close (lib/a11y/use-dialog). */
export function Modal({ label, onClose, className = "", role = "dialog", children }: {
  label: string;
  onClose: () => void;
  className?: string;
  role?: "dialog" | "alertdialog";
  children: ReactNode;
}) {
  const ref = useDialog(onClose);
  return (
    <div ref={ref} tabIndex={-1} role={role} aria-modal="true" aria-label={label} className={`outline-none ${className}`}>
      {children}
    </div>
  );
}
