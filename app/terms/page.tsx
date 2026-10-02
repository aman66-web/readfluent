import { LegalDoc } from "@/components/LegalDoc";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Terms · ReadFluent" };

export default function Terms() {
  return (
    <main className="safe-top safe-bottom [--pb:3rem] [--pt:2rem]">
      <LegalDoc title={`${APP_NAME} terms of use`} updated="2 October 2026">
        <p>By using {APP_NAME} you agree to these terms. They are short on purpose.</p>
        <h2>Using the app</h2>
        <ul>
          <li>{APP_NAME} is for learning languages by reading. Use it for yourself and do not copy, resell or scrape its books, pictures or translations.</li>
          <li>Do not misuse the Talk, friends or league features: no harassment, no illegal content, no attempts to break the service.</li>
        </ul>
        <h2>The books</h2>
        <p>Books are retellings written for learners. Classics are retold from works in the public domain; other books are new stories inspired by a title, with credit given. They are simplified, so they are not a replacement for the original, and may contain mistakes. Machine translations may too.</p>
        <h2>Accounts and purchases</h2>
        <p>You are responsible for your account. Paid editions, if offered, are bought through Apple or Google and follow their rules for billing and refunds.</p>
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
