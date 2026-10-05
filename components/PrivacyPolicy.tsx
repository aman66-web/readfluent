import { LegalDoc } from "@/components/LegalDoc";
import { APP_NAME, COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/brand";

/** The full policy. English only. Keep it true to what the code does; change it when the code changes. */
export function PrivacyPolicy() {
  return (
    <LegalDoc title={`${APP_NAME} privacy policy`} updated="6 October 2026">
      <p>{APP_NAME} is a language-learning app: real books retold at your level, read one page at a time. You need an account to use it. This page says what we keep, why, and who else sees it. It is written for people, not lawyers.</p>

      <h2>What is kept on your phone</h2>
      <ul>
        <li>The answers you give when you start (the language you speak, the language you are learning, your goals, how much you know, your name if you give one).</li>
        <li>Where you are in each book, your points (XP), streaks, saved words, flashcards and test results.</li>
      </ul>
      <p>This is stored on your device, so reading keeps working without a connection. It belongs to your account: what is on your phone when you first sign in becomes yours, and nothing is thrown away.</p>

      <h2>Your account</h2>
      <p>You need an account to use {APP_NAME}. You sign in with Google, Apple, or an emailed code. We keep:</p>
      <ul>
        <li>Your email address (and the name your Google or Apple account shares, if any).</li>
        <li>A copy of your progress, words and settings so they follow you to another phone.</li>
        <li>Friends, requests and your league score, if you use those features.</li>
      </ul>
      <p>The account database is run for us by Supabase and is hosted in London, United Kingdom. The website is served by Vercel.</p>

      <h2>Before you sign in</h2>
      <p>While you set the app up, it makes a temporary anonymous session with no email, so the first screens can work. It is not linked to who you are, and it does not open the app: you must sign in to read.</p>

      <h2>Talking with Pluto</h2>
      <p>If you use the Talk feature, the messages you type are sent to Anthropic, which runs the AI model that replies, so that it can answer. Talk is for signed-in readers only and has a daily limit. Please do not share private details in it. We do not use your messages for advertising.</p>

      <h2>Reading in your learning language</h2>
      <p>When you open a book in the language you are learning, your phone translates it itself, with the translator built into the phone (Apple&rsquo;s or Google&rsquo;s) or into your browser. Nothing about you, and nothing you read, is sent anywhere for this. The first chapter of some books comes already translated from our website.</p>

      <h2>Payments</h2>
      <p>Subscriptions are bought through Apple (the App Store) or Google (Google Play), never through us. They take the payment, handle renewals and refunds, and keep your payment details under their own privacy policies. We do not see your card. You can cancel or manage a subscription at any time in your Apple or Google account settings.</p>
      <p>We receive only whether your subscription is active (and a purchase record), through RevenueCat, a service that checks purchases for us.</p>

      <h2>What we do not do</h2>
      <ul>
        <li>No advertising and no ad trackers.</li>
        <li>We do not sell your data.</li>
        <li>No tracking across other companies&rsquo; apps or websites.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>You can delete your account and the data we hold about it at any time from your Profile in the app. If you cannot, contact us (see Support) and we will do it. Deleting it ends your access to {APP_NAME}.</li>
        <li>You can also delete what {APP_NAME} has stored on your phone from your Profile, without deleting your account.</li>
        <li>Under UK and EU data law you can ask to see, correct or delete your data, and you can complain to the Information Commissioner&rsquo;s Office (ico.org.uk).</li>
      </ul>

      <h2>Children</h2>
      <p>{APP_NAME} is not aimed at children under 13. If you are under 16, please use it with a parent or guardian.</p>

      <h2>Changes</h2>
      <p>If this changes in a way that matters, we will update this page and the date above.</p>

      <h2>Contact</h2>
      <p>{APP_NAME} is run by {COMPANY_NAME}, which decides how your data is used (the data controller).{" "}
        {SUPPORT_EMAIL ? <>Write to <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or see</> : "See"} the <a className="underline" href="/support">Support page</a>.</p>
    </LegalDoc>
  );
}
