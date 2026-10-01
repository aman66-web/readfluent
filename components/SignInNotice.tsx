"use client";

import { useSearchParams } from "next/navigation";

/** Says so when a provider sign-in came back failed (/auth/callback → `/?error=auth`). */
export function SignInNotice() {
  const params = useSearchParams();
  if (params.get("error") !== "auth") return null;
  return (
    <p role="alert" className="mt-6 max-w-[30ch] text-[13px] font-medium text-error">
      Signing in didn&apos;t work. You can keep reading without an account and try again later.
    </p>
  );
}
