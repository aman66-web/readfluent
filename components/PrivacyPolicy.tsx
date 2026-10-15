import { LegalDoc } from "@/components/LegalDoc";
import { APP_NAME, COMPANY_NAME, MASCOT_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { appleRevokeConfigured } from "@/lib/auth/apple-revoke";
import { talkReady } from "@/lib/talk/ready";
import { translatorConfigured } from "@/lib/translate/google";

/**
 * The full policy (App Store 5.1.1(i): what is collected, how, every use, who else gets it and that they protect it as
 * well, how long it is kept, and how to withdraw consent or have it deleted). English only. Keep it true to what the
 * code does and change it when the code changes:
 *   - on the phone: lib/store (every `readfluent.` key), the translated books (lib/translate/cache.ts), the sign-in cookies;
 *   - on the server: supabase/migrations (users, events "first_run", profiles + xp_days + friendships + leagues, talk_usage),
 *     the RevenueCat webhook (users.plan…), /api/account (delete: cascades through all of it, events keep no user id).
 * It is opened from the iPhone subscription screen, so it names no other platform or its store (App Review 2.3.10).
 * Talk, the server's translator and Apple sign-in revocation are described only when this server has them switched on.
 */
export function PrivacyPolicy({ talk = talkReady(), translator = translatorConfigured(), appleRevoke = appleRevokeConfigured() }: {
  /** Talk with the mascot can run here (a model key and a database). */
  talk?: boolean;
  /** The server's machine translator is switched on (a fallback for a device with no translator of its own). */
  translator?: boolean;
  /** Deleting an account can tell Apple to end the Sign in with Apple link (the APPLE_* server keys are set). */
  appleRevoke?: boolean;
}) {
  return (
    <LegalDoc title={`${APP_NAME} privacy policy`} updated="15 October 2026">
      <p>{APP_NAME} is a language-learning app: classic books and new stories retold at your level, read one page at a time. You need an account to use it. This policy says what we collect, how and why, who else handles it, how long we keep it, and how to have it deleted. It is written for people, not lawyers.</p>
      <p>{APP_NAME} is run by {COMPANY_NAME}, which is responsible for your data (the data controller). In this policy, &ldquo;we&rdquo; means {COMPANY_NAME}.</p>

      <h2>In short</h2>
      <ul>
        <li>Most of what you do in {APP_NAME} stays on your phone.</li>
        <li>Our servers hold your account (your email address), whether you have a subscription, the answers you gave when you started, and, if you use Friends, what your friends and your league see.</li>
        <li>No advertising, no selling your data, and no tracking you across other companies&rsquo; apps or websites.</li>
        <li>You can delete your account, and the data we hold with it, at any time in the app: Profile, then Delete account.</li>
      </ul>

      <h2>What stays on your phone</h2>
      <p>These are kept in the app&rsquo;s own storage on your device, and they do not move to another phone. They are not sent to us, apart from what the next section lists: your first answers, sent once, and, if you use Friends, your name, level, streak and XP. Deleting your account erases them from the phone, and so does deleting the app.</p>
      <ul>
        <li>The answers you give when you start: the language you speak, the language you are learning, why you are learning, how much you know, your daily goal, the kinds of books you like, and your name if you give one.</li>
        <li>Where you are in each book, your points (XP), streaks, coins, badges, saved words, flashcards and test results.</li>
        <li>Your settings, and any readers you have blocked.</li>
        <li>Books your phone has translated, so they open at once next time.</li>
        <li>Your sign-in, so you stay signed in.</li>
      </ul>

      <h2>What we collect and keep</h2>
      <ul>
        <li><strong>Your account.</strong> You sign in with Google, with Apple, or with a code sent to your email. We receive and keep your email address, the name (and, from Google, the profile picture link) your Google or Apple account shares with us, the id that account uses for you, a random account number of our own, and when you signed up and last signed in. If you use Apple&rsquo;s Hide My Email, we only ever see the address Apple gives us.</li>
        <li><strong>Your first answers.</strong> When you finish setting up, the app sends us, once, the choices you made: why you are learning, how you heard about {APP_NAME} (and the few words you typed, if you chose &ldquo;somewhere else&rdquo;), your daily goal, your two languages, your level and whether a test placed you there, and the kinds of books you like. Your name is not sent.</li>
        <li><strong>Friends and leagues, if you use them.</strong> When you open Friends, you join a league of up to 30 readers. So that your friends and your league can see you, we keep the name you gave the app, the username you choose (if any), your friend code, your level, your streak, your total XP and your XP for each day, who your friends are and the requests you send and receive, and which league you are in. The app updates these from time to time while you use it. Other readers see your name or username, your friend code, level, streak and XP; never your email address.</li>
        <li><strong>Your subscription.</strong> Whether {APP_NAME} Pro is active, until when, which plan (monthly or yearly) and whether it is a free trial. See Payments below.</li>
        {talk && <li><strong>Talk.</strong> How many messages you have sent today, for the daily limit. We do not keep your messages: see Talking with {MASCOT_NAME} below.</li>}
        <li><strong>What you send us.</strong> If you write to us or use Report, we receive your email address and what you write. A report includes the name and friend code of the reader{talk ? ", or the reply," : ""} you are reporting.</li>
        <li><strong>Technical logs.</strong> Like any online service, the servers that run {APP_NAME} record each request for a short time, including your IP address, your device and browser type, and the time, to keep the service working and secure. The sign-in service also records each sign-in (the time, your email address and IP address) for the same reason.</li>
      </ul>

      <h2>Used on your phone, not kept by us</h2>
      <ul>
        <li><strong>Reading in your learning language.</strong> Your phone translates books itself, with the translator built into the phone (on iPhone, Apple&rsquo;s) or into your browser. The text is translated on your device, and nothing about you is sent to us or to anyone else for this. The first time, the phone may download the language from its maker. The first chapter of some books comes from our server already translated.{translator && " If your device has no translator of its own, our server may ask Google’s translation service to translate the book: only the book’s text is sent, never anything about you."}</li>
        <li><strong>Speaking.</strong> When you answer a speaking question in a level test{talk ? `, or speak to ${MASCOT_NAME} in Talk` : ""}, the app uses your microphone and the speech recognition built into your browser or phone (in Safari, Apple&rsquo;s) to turn your voice into text. Depending on the device, its maker may process the audio on its own servers, under its own privacy policy. {APP_NAME} does not record, receive or keep your voice. The level tests ask speaking questions only where speech can be recognised: in a web browser that has it, such as Chrome or Safari, and not inside the app on a phone. Before the speaking part the app listens for a moment to check that the room is quiet enough; that is measured on your device and not kept. Your browser or phone asks before the app can use the microphone or speech recognition.</li>
        <li><strong>Listening.</strong> Listen reads pages aloud with the voice built into your phone or browser. Nothing about you is sent to us for this.</li>
      </ul>

      <h2>Before you sign in</h2>
      <p>While you set the app up, it makes an anonymous session, with no email address or name, so the first screens can work. It is not linked to who you are, and it does not open the app: you must sign in to read.</p>

      {talk && (
        <>
          <h2>Talking with {MASCOT_NAME}</h2>
          <p>Talk lets signed-in readers practise conversation, with a daily limit. Before your first message it tells you where your messages go and asks whether you agree. Each message you send goes to Anthropic, the AI company that runs the model that writes {MASCOT_NAME}&rsquo;s replies, only so that it can answer. It goes with the rest of that conversation, your two languages, your level and the name you gave the app (if any), so that the reply suits you. Under its commercial terms with us, Anthropic does not use it to train its models and deletes it after a limited period. We do not store your conversations: a conversation stays on your screen until you leave it. Please do not share private details in it. Replies are written by AI and can be wrong.</p>
        </>
      )}

      <h2>Payments</h2>
      <p>Subscriptions are bought through the app store you downloaded {APP_NAME} from (on iPhone, Apple&rsquo;s App Store), never through us. The store takes the payment, handles renewals and refunds, and keeps your payment details under its own privacy policy. We never see your card or bank details. You can manage or cancel a subscription at any time in your app store&rsquo;s subscription settings.</p>
      <p>To unlock Pro we use RevenueCat, a service that checks purchases for us. It receives our random account number for you (not your name or email address), the store&rsquo;s record of your purchase, and basic details such as the app version and your country, and tells our server whether your subscription is active.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To give you the app you signed up for: your account and sign-in, Pro, and friends and leagues. We need this to provide the service (our contract with you).</li>
        <li>To keep {APP_NAME} secure and working, and to fix problems (our legitimate interest in running a safe service).</li>
        <li>To learn, from the first answers, who {APP_NAME} reaches and which languages and books to add first. We look at these as totals (our legitimate interest in improving the app).</li>
        <li>To answer your messages and deal with reports.</li>
        <li>The microphone and speech recognition{talk ? ", and Talk," : ""} are used only when you choose to use them, and only with your permission (consent).</li>
        <li>We do not use your data for advertising, we do not sell it or share it for advertising, and we make no automated decisions about you that have legal or similar effects.</li>
      </ul>

      <h2>Who else handles it</h2>
      <p>We share data only with the service providers below, and only for the purposes above. Each one handles it for us under a written agreement that allows it to use the data only to provide its service to us, and requires it to protect the data at least as well as this policy does.</p>
      <ul>
        <li><strong>Supabase</strong>: our account database and sign-in, including the emails that carry your sign-in code or link. The database is hosted in London, United Kingdom.</li>
        <li><strong>Vercel</strong>: hosts the app and the servers it talks to.</li>
        <li><strong>RevenueCat</strong>: checks subscriptions (see Payments).</li>
        {talk && <li><strong>Anthropic</strong>: writes {MASCOT_NAME}&rsquo;s replies, only if you use Talk.</li>}
      </ul>
      <p>When you sign in with Google or Apple, that company confirms who you are under its own privacy policy, and the app store handles your payments under its own. They decide for themselves how they use data, so they are not on this list.</p>
      <p>Some of these providers process data outside the UK, for example in the United States. Where they do, it is protected by the safeguards UK data protection law requires, such as standard contractual clauses or the UK&rsquo;s International Data Transfer Addendum. We may also disclose data when the law requires it.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li><strong>Your account, friends and league data, subscription status{talk ? ", Talk message counts" : ""}:</strong> for as long as you have an account. When you delete your account they are deleted from our database straight away. Copies in routine backups are deleted as the backups are replaced, within 30 days.</li>
        <li><strong>Your first answers:</strong> with your account; when you delete it, they are kept only as anonymous statistics, no longer linked to you.</li>
        <li><strong>Technical logs and sign-in records:</strong> a short time, no more than 30 days.</li>
        <li><strong>Messages and reports you send us:</strong> as long as we need them to help you or deal with the report, then deleted.</li>
        <li><strong>Purchase records:</strong> RevenueCat and the app store keep them for as long as tax and accounting law requires. Once your account is deleted, RevenueCat&rsquo;s record is linked only to a random number that no longer leads to you.</li>
        <li><strong>What is on your phone:</strong> until you delete your account or the app.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Delete your account.</strong> In the app, open Profile (the round button at the top right of Home), tap Delete account and confirm. This deletes your account, and everything linked to it in our database, straight away, and erases what the app kept on that phone{appleRevoke ? <>. If you signed in with Apple on an iPhone, it also tells Apple to remove {APP_NAME}&rsquo;s access</> : null}. If you cannot get into the app, contact us (see Contact below) from the email address on your account and we will delete it for you. Deleting your account does not cancel a subscription: cancel it first in your app store&rsquo;s subscription settings.</li>
        <li><strong>Withdraw your consent.</strong> You can turn off {APP_NAME}&rsquo;s access to the microphone and speech recognition at any time in your browser&rsquo;s or phone&rsquo;s settings{talk ? ", and you can simply stop using Talk" : ""}. You can also remove {APP_NAME} from the apps that use your Google or Apple sign-in, in that account&rsquo;s settings. Withdrawing consent does not affect what was done before.</li>
        <li><strong>Your rights.</strong> Under UK and EU data protection law you can ask us for a copy of your data, ask us to correct or delete it, object to or restrict how we use it, and ask for it in a form you can take elsewhere. To use any of these rights, contact us (see Contact below); we will answer within one month. You can also complain to the Information Commissioner&rsquo;s Office (ico.org.uk) or to the data protection authority where you live.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>No advertising and no ad trackers.</li>
        <li>We do not sell your data.</li>
        <li>No tracking across other companies&rsquo; apps or websites.</li>
      </ul>

      <h2>Security</h2>
      <p>Your data travels encrypted (HTTPS). Our database lets each reader reach only their own records (other readers see only what Friends and leagues show them), and only our server can change a subscription. No system is perfectly secure, but we work to protect your data, and if a breach puts you at risk we will tell you and the regulator as the law requires.</p>

      <h2>Cookies and storage</h2>
      <p>{APP_NAME} uses only what it needs to work: a sign-in cookie that keeps you signed in, a cookie that remembers you have finished the first screens, and the storage on your phone described above. No advertising or analytics cookies.</p>

      <h2>Children</h2>
      <p>{APP_NAME} is not aimed at children under 13, and we do not knowingly collect their data. If you are under 16, please use it with a parent or guardian. If you think a child under 13 has given us data, write to us and we will delete it.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we will update this page and the date above.</p>

      <h2>Contact</h2>
      <p>{APP_NAME} is run by {COMPANY_NAME}, the data controller.{" "}
        {SUPPORT_EMAIL ? <>Write to <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or see</> : "See"} the <a className="underline" href="/support">Support page</a>.</p>
    </LegalDoc>
  );
}
