import { LegalDoc } from "@/components/LegalDoc";
import { APP_NAME, COMPANY_NAME, MASCOT_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata = { title: "Support · ReadFluent" };

export default function Support() {
  return (
    <main className="safe-top safe-bottom [--pb:3rem] [--pt:2rem]">
      <LegalDoc title={`${APP_NAME} support`} updated="9 October 2026">
        <p>Need help with {APP_NAME}? Start here.</p>
        <h2>Common questions</h2>
        <ul>
          <li><strong>My progress is missing.</strong> You need an account to use {APP_NAME}, and your progress is tied to it. Make sure you are signed in with the same account (Google, Apple or email) you used before. If you changed phone, sign in with that account on the new one.</li>
          <li><strong>A book is not in my learning language.</strong> Your phone translates each book itself, for free. The first time, it may ask to download the language: tap Download and wait a moment. On a computer, use Chrome; in other browsers a book stays in English, apart from the first chapter of some books.</li>
          <li><strong>Delete my data.</strong> Profile, then Delete account. This removes your account and synced data. It does not cancel a subscription: cancel that in your phone&apos;s subscription settings first.</li>
          <li><strong>Subscriptions.</strong> {APP_NAME} Pro is bought, managed and cancelled through your phone&apos;s app store, in its subscription settings. If you have bought Pro and it is not showing, open Profile, then Premium, and tap Restore purchases. To report a person in a league, or a reply from {MASCOT_NAME}, use Report next to it, or write to us below.</li>
          <li><strong>Sign-in problems.</strong> You need to sign in to use {APP_NAME}. Try Google or Apple sign-in. If you still cannot get in, write to us below and we will help.</li>
        </ul>
        <h2>Contact us</h2>
        <p>{APP_NAME} is made by {COMPANY_NAME}. {SUPPORT_EMAIL ? <>Write to <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</> : <>Reach the developer through the contact details on the {APP_NAME} page in the App Store or Google Play.</>} Please include what you were doing and what you saw.</p>
        <h2>Legal</h2>
        <p><a className="underline" href="/privacy">Privacy policy</a> · <a className="underline" href="/terms">Terms of use</a></p>
      </LegalDoc>
    </main>
  );
}
