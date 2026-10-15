import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { PrivacyView } from "@/components/PrivacyView";
import { appleRevokeConfigured } from "@/lib/auth/apple-revoke";
import { talkReady } from "@/lib/talk/ready";
import { translatorConfigured } from "@/lib/translate/google";

export const metadata = { title: "Privacy · ReadFluent" };
// What the policy describes depends on what this server has switched on (Talk, the server's translator, Apple sign-in revocation), so it is worked out per request.
export const dynamic = "force-dynamic";

/** The short, translated note on top (what the app keeps on the device), then the full English policy the stores require. */
export default function Privacy() {
  return (
    <>
      <PrivacyView />
      <PrivacyPolicy talk={talkReady()} translator={translatorConfigured()} appleRevoke={appleRevokeConfigured()} />
    </>
  );
}
