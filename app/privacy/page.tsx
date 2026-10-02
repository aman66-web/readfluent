import { PrivacyPolicy } from "@/components/PrivacyPolicy";
import { PrivacyView } from "@/components/PrivacyView";

export const metadata = { title: "Privacy · ReadFluent" };

/** The short, translated note on top (what the app keeps on the device), then the full English policy the stores require. */
export default function Privacy() {
  return (
    <>
      <PrivacyView />
      <PrivacyPolicy />
    </>
  );
}
