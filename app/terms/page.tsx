import { LegalDoc } from "@/components/LegalDoc";
import { LegalBack } from "@/components/PrivacyView";
import { APP_NAME, MASCOT_NAME } from "@/lib/brand";
import { talkReady } from "@/lib/talk/ready";

export const metadata = { title: "Terms · ReadFluent" };
// Talk is mentioned only when this server has it switched on, so the page is worked out per request.
export const dynamic = "force-dynamic";

/**
 * Opened from the iPhone subscription screen, so it names no other platform or its store (App Review 2.3.10): "the app
 * store you downloaded it from", with Apple's own words where they apply. Prices and plans live in lib/plan.ts and on
 * the subscription screen, never here.
 */
export default function Terms() {
  const talk = talkReady();
  return (
    <main className="safe-top safe-bottom [--pb:3rem] [--pt:2rem]">
      <div className="px-6 pb-4"><LegalBack /></div>
      <LegalDoc title={`${APP_NAME} terms of use`} updated="15 October 2026">
        <p>By using {APP_NAME} you agree to these terms. They are short on purpose.</p>
        <h2>Using the app</h2>
        <ul>
          <li>{APP_NAME} is for learning languages by reading. Use it for yourself and do not copy, resell or scrape its books, pictures or translations.</li>
          <li>Do not misuse the friends and league features{talk ? " or Talk" : ""}: no harassment, no illegal content, no attempts to break the service.</li>
          <li>There is no tolerance for objectionable content or abusive users. A name or behaviour that is offensive, hateful, sexual, threatening or harassing is not allowed. Use Report next to a reader&rsquo;s name to tell us, and Block to hide them. We look at every report within 24 hours, remove what breaks these rules, and may close the account responsible.</li>
        </ul>
        <h2>The books</h2>
        <p>Books are retellings written for learners. Classics are retold in our own words from the original works; other books are original stories written for {APP_NAME}. They are simplified, so they are not a replacement for the original, and may contain mistakes. Machine translations may too.{talk ? ` ${MASCOT_NAME}’s replies in Talk are written by AI and can be wrong.` : ""}</p>
        <h2>Accounts</h2>
        <p>You need an account to use {APP_NAME}, and you are responsible for it. Keep your sign-in to yourself.</p>
        <h2>Subscriptions</h2>
        <ul>
          <li>{APP_NAME} Pro is an auto-renewing subscription, monthly or yearly. What it includes, its price and any free trial are shown on the subscription screen before you buy, in your own currency.</li>
          <li>You buy it through the app store you downloaded {APP_NAME} from (on iPhone, Apple&rsquo;s App Store), not from us. Payment is charged to your app store account (on iPhone, your Apple Account) when you confirm the purchase, or when a free trial ends. The subscription renews automatically for the same period unless you cancel it at least 24 hours before the end of the current period, and your account is charged for the renewal within the 24 hours before the period ends.</li>
          <li>To manage or cancel it, open your app store&rsquo;s subscription settings (on iPhone: Settings, tap your name, then Subscriptions). You keep Pro until the end of the period you have paid for. Deleting the app or your {APP_NAME} account does not cancel a subscription.</li>
          <li>If you buy a subscription during a free trial, any unused part of the trial ends.</li>
          <li>Refunds are decided by the app store under its own rules (on iPhone, ask Apple at reportaproblem.apple.com). We cannot refund a store purchase ourselves.</li>
          <li>Books you have already started stay open, and your progress, word cards and flashcards stay yours, whatever plan you are on.</li>
        </ul>
        <p>On iPhone, Apple&rsquo;s standard <a className="underline" href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">licence agreement</a> also applies to the app.</p>
        <h2>No guarantee</h2>
        <p>The app is provided &ldquo;as is&rdquo;. We try to keep it working and correct, but we cannot promise it will be uninterrupted or error-free, or that you will reach a particular level. Nothing in the app is professional advice, including anything about health. Nothing in these terms takes away the rights you have by law as a consumer.</p>
        <h2>Ending things</h2>
        <p>You can stop using the app and delete your account at any time: in Profile, tap Delete account. We may suspend accounts that break these terms.</p>
        <h2>Privacy</h2>
        <p>How we handle your data is set out in the <a className="underline" href="/privacy">privacy policy</a>.</p>
        <h2>Changes and contact</h2>
        <p>We may update these terms and will change the date above. Questions: see the <a className="underline" href="/support">Support page</a>. These terms follow the laws of England and Wales.</p>
      </LegalDoc>
    </main>
  );
}
