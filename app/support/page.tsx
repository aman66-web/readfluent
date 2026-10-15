import { LegalDoc } from "@/components/LegalDoc";
import { LegalBack } from "@/components/PrivacyView";
import { APP_NAME, COMPANY_NAME, MASCOT_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { talkReady } from "@/lib/talk/ready";

export const metadata = { title: "Support · ReadFluent" };
// Talk is mentioned only when this server has it switched on, so the page is worked out per request.
export const dynamic = "force-dynamic";

/**
 * The store's support address and the in-app help. Only what the app really does: progress lives on the phone (no
 * cloud copy), Pro follows the account, deleting is Profile → Delete account. Names no other platform or its store
 * (App Review 2.3.10). The contact is NEXT_PUBLIC_SUPPORT_EMAIL (lib/brand SUPPORT_EMAIL).
 */
export default function Support() {
  const talk = talkReady();
  return (
    <main className="safe-top safe-bottom [--pb:3rem] [--pt:2rem]">
      <div className="px-6 pb-4"><LegalBack /></div>
      <LegalDoc title={`${APP_NAME} support`} updated="15 October 2026">
        <p>Need help with {APP_NAME}? Start here.</p>
        <h2>Common questions</h2>
        <ul>
          <li><strong>Where is my progress?</strong> Where you are in each book, your points, words and flashcards are kept on the phone you read on. They are not copied to our servers (apart from your level, streak and points if you use Friends, so your friends and league can see them), so they do not move to another phone, and deleting the app erases them. Your account and your Pro subscription are not tied to one phone: sign in with the same account (Google, Apple or email) you used before, and Pro is there again.</li>
          <li><strong>A book is not in my learning language.</strong> Your phone translates each book itself, for free. On iPhone this needs iOS 18 or later. The first time, the phone may ask to download the language: tap Download and wait a moment. On a computer, it needs a browser with a built-in translator; without one a book stays in English, apart from the first chapter of some books.</li>
          <li><strong>Speaking questions.</strong> The level tests ask them only in a web browser that can recognise speech. Inside the app on a phone they are left out, and your score counts only the other questions. If a speaking question cannot hear you, allow the microphone when your browser asks (or in its settings for {APP_NAME}), and check that you are online.</li>
          <li><strong>Subscriptions.</strong> {APP_NAME} Pro is bought, managed and cancelled through the app store you downloaded {APP_NAME} from, in its subscription settings. On iPhone: open Settings, tap your name, then Subscriptions, then {APP_NAME}. You keep Pro until the end of the period you have paid for. If you have bought Pro and it is not showing, open Profile, tap Premium, then Restore purchases. Refunds are decided by the app store (on iPhone, ask Apple at reportaproblem.apple.com); we cannot refund a store purchase ourselves.</li>
          <li><strong>Delete your account.</strong> Open Profile (the round button at the top right of Home), tap Delete account and confirm. This deletes your account, and everything linked to it in our database, straight away, and erases what the app kept on that phone. It cannot be undone. It does not cancel a subscription: cancel that first in your app store&rsquo;s subscription settings. If you cannot get into the app, write to us below from the email address on your account and we will delete it for you.</li>
          {/* Report writes an email to SUPPORT_EMAIL when it is set; without it, Report opens this page, so the line points to the contact below. */}
          <li><strong>Report a reader{talk ? " or a reply" : ""}.</strong> {SUPPORT_EMAIL
            ? <>Use Report next to a reader&rsquo;s name in Friends or a league{talk ? `, or next to a reply from ${MASCOT_NAME} in Talk` : ""}, or write to us below.</>
            : <>Write to us below with the reader&rsquo;s name and friend code{talk ? `, or the reply from ${MASCOT_NAME}` : ""}.</>} Block, next to a reader&rsquo;s name, hides them on your phone.</li>
          <li><strong>Sign-in problems.</strong> You need to sign in to use {APP_NAME}. Sign in the same way you did before (Google, Apple or email). If you still cannot get in, write to us below and we will help.</li>
        </ul>
        <h2>Contact us</h2>
        <p>{APP_NAME} is made by {COMPANY_NAME}. {SUPPORT_EMAIL ? <>Write to <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</> : <>Reach us through the contact details on the {APP_NAME} page in the app store you downloaded it from.</>} Please include what you were doing, what you saw, and which phone you use.</p>
        <h2>Legal</h2>
        <p><a className="underline" href="/privacy">Privacy policy</a> · <a className="underline" href="/terms">Terms of use</a></p>
      </LegalDoc>
    </main>
  );
}
