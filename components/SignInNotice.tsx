"use client";

import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/react";

/** Says so when a provider sign-in came back failed (/auth/callback → `/?error=auth`). */
export function SignInNotice() {
  const params = useSearchParams();
  const t = useT();
  if (params.get("error") !== "auth") return null;
  return (
    <p role="alert" className="mt-6 max-w-[30ch] text-[13px] font-medium text-error">
      {t("notice.signInFailed")}
    </p>
  );
}
