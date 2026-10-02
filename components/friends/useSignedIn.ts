"use client";

import { useEffect, useState } from "react";
import { accountAvailable } from "@/components/onboarding/SignIn";
import { createClient } from "@/lib/db/client";

/** Whether a real account (not an anonymous reading session) is signed in here. `ready` is false until it is known. */
export function useSignedIn(): { signedIn: boolean; ready: boolean; available: boolean } {
  const available = accountAvailable();
  const [state, setState] = useState<{ signedIn: boolean; ready: boolean }>({ signedIn: false, ready: !available });
  useEffect(() => {
    if (!available) return;
    let live = true;
    createClient().auth.getUser()
      .then(({ data }) => { if (live) setState({ signedIn: !!data.user && !data.user.is_anonymous, ready: true }); })
      .catch(() => { if (live) setState({ signedIn: false, ready: true }); });
    return () => { live = false; };
  }, [available]);
  return { ...state, available };
}
