import { LegalDoc } from "@/components/LegalDoc";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Support · ReadFluent" };

export default function Support() {
  return (
    <main className="safe-top safe-bottom [--pb:3rem] [--pt:2rem]">
      <LegalDoc title={`${APP_NAME} support`} updated="2 October 2026">
        <p>Need help with {APP_NAME}? Start here.</p>
        <h2>Common questions</h2>
        <ul>
          <li><strong>My progress is missing.</strong> Without an account, progress lives on that one phone. Sign in (Profile) so it follows you to another device.</li>
          <li><strong>A book is not in my learning language.</strong> Books are translated when you open them. If it does not appear, check your connection and try again.</li>
          <li><strong>Delete my data.</strong> Profile, then Delete account. This removes your account and synced data.</li>
          <li><strong>Sign-in problems.</strong> Try Google or Apple sign-in. Emailed codes may be unavailable while email sending is being set up.</li>
        </ul>
        <h2>Contact us</h2>
        <p>Reach the developer through the contact details on the {APP_NAME} page in the App Store or Google Play. Please include what you were doing and what you saw.</p>
        <h2>Legal</h2>
        <p><a className="underline" href="/privacy">Privacy policy</a> · <a className="underline" href="/terms">Terms of use</a></p>
      </LegalDoc>
    </main>
  );
}
