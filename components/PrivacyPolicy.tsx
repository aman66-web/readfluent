import { LegalDoc } from "@/components/LegalDoc";
import { APP_NAME, COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/brand";

/** The full policy. English only. Keep it true to what the code does; change it when the code changes. */
export function PrivacyPolicy() {
  return (
    <LegalDoc title={`${APP_NAME} privacy policy`} updated="2 October 2026">
      <p>{APP_NAME} is a language-learning app: real books retold at your level, read one page at a time. This page says what we keep, why, and who else sees it. It is written for people, not lawyers.</p>

      <h2>What stays on your phone</h2>
      <ul>
        <li>The answers you give when you start (the language you speak, the language you are learning, your goals, how much you know, your name if you give one).</li>
        <li>Where you are in each book, your points (XP), streaks, saved words, flashcards and test results.</li>
      </ul>
      <p>If you never create an account, this stays on your device. We do not receive it.</p>

      <h2>If you sign in</h2>
      <p>You can sign in with Google, Apple, or an emailed code. When you do, we keep:</p>
      <ul>
        <li>Your email address (and the name your Google or Apple account shares, if any).</li>
        <li>A copy of your progress, words and settings so they follow you to another phone.</li>
        <li>Friends, requests and your league score, if you use those features.</li>
      </ul>
      <p>The account database is run for us by Supabase and is hosted in London, United Kingdom. The website is served by Vercel.</p>

      <h2>Anonymous use</h2>
      <p>The app may create an anonymous account with no email so your progress can be saved safely. It is not linked to who you are until you choose to sign in.</p>

      <h2>Talking with Dewey</h2>
      <p>If you use the Talk feature, the messages you type are sent to Anthropic, which runs the AI model that replies, so that it can answer. Talk is for signed-in readers only and has a daily limit. Please do not share private details in it. We do not use your messages for advertising.</p>

      <h2>Reading in your learning language</h2>
      <p>When you open a book in the language you are learning, your phone translates it itself, with the translator built into the phone (Apple&rsquo;s or Google&rsquo;s) or into your browser. Nothing about you, and nothing you read, is sent anywhere for this. The first chapter of some books comes already translated from our website.</p>

      <h2>Payments</h2>
      <p>Subscriptions are bought through Apple or Google, who handle the payment. We do not see your card. We receive only whether your subscription is active (and a purchase record), through RevenueCat, a service that checks purchases for us.</p>

      <h2>What we do not do</h2>
      <ul>
        <li>No advertising and no ad trackers.</li>
        <li>We do not sell your data.</li>
        <li>No tracking across other companies&rsquo; apps or websites.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>You can use {APP_NAME} without an account.</li>
        <li>You can delete your account and the data we hold about it from your Profile in the app. If you cannot, contact us (see Support) and we will do it.</li>
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
