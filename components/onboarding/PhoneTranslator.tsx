"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect, useState, useSyncExternalStore } from "react";
import { languageName } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/react";
import type { LanguageCode } from "@/lib/onboarding/languages";
import { willAskToDownload } from "@/lib/translate/prepare";

const noSubscribe = () => () => {};

/**
 * Under the language pickers, in the installed app: why the phone needs the language downloaded (the app translates
 * every book on the phone, free and private), how to do it, and whether it is done. The download is Apple's and Google's,
 * shared by every app, so it cannot ship inside this one (lib/translate/prepare.ts). Nothing on the web, where there is no
 * phone translator to switch on.
 */
export function PhoneTranslatorCard({ learn }: { learn: LanguageCode | null }) {
  const t = useT();
  const locale = useLocale();
  const applies = useSyncExternalStore(noSubscribe, () => willAskToDownload(learn), () => false);
  const ios = useSyncExternalStore(noSubscribe, () => Capacitor.getPlatform() === "ios", () => false);
  const [state, setState] = useState<{ lang: string; status: "download" | "working" | "ready" } | null>(null);

  useEffect(() => {
    if (!applies || !learn) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const { deviceStatus } = await import("@/lib/translate/device");
      const s = await deviceStatus("en", learn);
      if (!live) return;
      setState((prev) => ({ lang: learn, status: s === "ready" ? "ready" : prev?.lang === learn && prev.status === "working" ? "working" : "download" }));
      if (s !== "ready" && s !== "unsupported") timer = setTimeout(check, 3000);
    };
    void check();
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, [applies, learn]);

  if (!applies || !learn) return null;
  const language = languageName(learn, locale);
  const status = state?.lang === learn ? state.status : "download";

  async function download() {
    if (!learn) return;
    setState({ lang: learn, status: "working" });
    const { devicePrepare } = await import("@/lib/translate/device");
    await devicePrepare("en", learn);
  }

  return (
    <div className="guide-card wel-in relative mt-4 rounded-[22px] p-4" style={{ animationDelay: "420ms" }} role="status">
      <p className="text-[15px] font-semibold leading-snug">{status === "ready" ? t("lang.prep.done", { language }) : t("lang.prep.title", { language })}</p>
      {status !== "ready" && (
        <>
          <p className="ob-muted mt-1.5 text-[13px] leading-snug">{t("lang.prep.why", { language })}</p>
          {ios && <p className="ob-muted mt-1.5 text-[13px] leading-snug">{t("lang.prep.how")}</p>}
          {status === "working" ? (
            <p className="mt-2.5 text-[13px] font-semibold leading-snug text-[var(--ob-deep)]">{t("lang.prep.working")}</p>
          ) : (
            <button type="button" onClick={() => void download()} className="btn-cyan mt-3 inline-flex h-11 items-center rounded-full px-5 text-[14px] font-bold">
              {t("lang.prep.button", { language })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
