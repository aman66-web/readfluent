import { LegalDoc } from "@/components/LegalDoc";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Terms · ReadFluent" };

export default function Terms() {
  return (
    <main className="safe-top safe-bottom [--pb:3rem] [--pt:2rem]">
      <LegalDoc title={`${APP_NAME} terms of use`} updated="6 October 2026">
        <p>By using {APP_NAME} you agree to these terms. They are short on purpose.</p>
        <h2>Using the app</h2>
        <ul>
          <li>{APP_NAME} is for learning languages by reading. Use it for yourself and do not copy, resell or scrape its books, pictures or translations.</li>
          <li>Do not misuse the Talk, friends or league features: no harassment, no illegal content, no attempts to break the service.</li>
        </ul>
        <h2>The books</h2>
        <p>Books are retellings written for learners. Classics are retold from works in the public domain; other books are new stories inspired by a title, with credit given. They are simplified, so they are not a replacement for the original, and may contain mistakes. Machine translations may too.</p>
        <h2>Accounts</h2>
        <p>You need an account to use {APP_NAME}, and you are responsible for it. Keep your sign-in to yourself.</p>
        <h2>Subscriptions</h2>
        <ul>
          <li>{APP_NAME} Pro is an auto-renewing subscription, monthly or yearly. The price and any free trial are shown on the subscription screen before you buy, in your own currency.</li>
          <li>You buy it from Apple (the App Store) or Google (Google Play), not from us. They take the payment when you confirm the purchase, or when a free trial ends. It renews automatically for the same period unless you cancel at least 24 hours before the current period ends, and your account is charged for the renewal in the 24 hours before.</li>
          <li>To cancel, open your Apple or Google account&rsquo;s subscription settings. You keep Pro until the end of the period you have paid for. Deleting the app or your {APP_NAME} account does not cancel a subscription.</li>
          <li>Refunds are decided by Apple or Google under their own rules. We cannot refund a store purchase ourselves.</li>
          <li>Books you have already started stay open, and your progress, word cards and flashcards stay yours, whatever plan you are on.</li>
        </ul>
        <p>On iPhone, Apple&rsquo;s standard <a className="underline" href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">licence agreement</a> also applies to the app.</p>
        <h2>No guarantee</h2>
        <p>The app is provided &ldquo;as is&rdquo;. We try to keep it working and correct, but we cannot promise it will be uninterrupted or error-free, or that you will reach a particular level. Nothing in the app is professional advice, including anything about health.</p>
        <h2>Ending things</h2>
        <p>You can stop using the app and delete your account at any time. We may suspend accounts that break these terms.</p>
        <h2>Changes and contact</h2>
        <p>We may update these terms and will change the date above. Questions: see the <a className="underline" href="/support">Support page</a>. These terms follow the laws of England and Wales.</p>
      </LegalDoc>
    </main>
  );
}
