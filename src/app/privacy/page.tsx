import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/legal/LegalPage';
import { BUSINESS_NAME, CONTACT_EMAIL, DELETION_COMPLETION_DAYS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy | Poultry Ledger',
  description: 'What personal data Poultry Ledger collects, why, who we share it with and your rights.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This policy explains what personal data ${BUSINESS_NAME} collects when you use the web app and desktop app, why we collect it, who we share it with, and the choices you have. ${BUSINESS_NAME} is the data controller for your account data.`}
    >
      <LegalSection title="What we collect">
        <ul>
          <li>
            <strong>Account details:</strong> your first name, surname, phone number, and email address if you give one.
            Passwords are stored only as a one-way hash.
          </li>
          <li>
            <strong>Google sign-in:</strong> if you sign in with Google, we receive your name, email address and profile
            picture from Google.
          </li>
          <li>
            <strong>Farm records:</strong> everything you or your team enter, such as farm name, country, location and capacity,
            flocks, houses, egg production, feed, health and mortality logs, inventory, expenses, sales, orders, and the
            names and phone numbers of your customers and suppliers.
          </li>
          <li>
            <strong>Team members:</strong>{' '}
            when a farm owner adds staff, we store the staff member&apos;s name, phone number or email, role and
            permissions.
          </li>
          <li>
            <strong>Payments:</strong> the plan, amount, currency, date and Paystack reference of each payment. Card and mobile money
            details are handled by Paystack. We never receive or store them.
          </li>
          <li>
            <strong>Desktop app:</strong> an identifier for each computer you activate, so we can manage your licence.
          </li>
          <li>
            <strong>Security and usage records:</strong> sign-in times, device type, and a log of changes made to farm
            records, so owners can see who changed what.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Why we use it">
        <ul>
          <li>To run the service: store your records, calculate reports, and let your team work together.</li>
          <li>To take payments and apply the plan you paid for.</li>
          <li>
            To show your money in your farm&apos;s currency, and to price your plan: farms in Ghana pay in Ghana cedis,
            farms in other countries pay in US dollars. We only use the country you choose for your farm. We do not look
            up your location from your phone or internet connection.
          </li>
          <li>To keep accounts secure, for example by limiting repeated sign-in attempts.</li>
          <li>To find and fix errors and keep the app fast.</li>
          <li>To reply when you contact us.</li>
        </ul>
        <p>
          We use your data because it is needed to provide the service you signed up for, because you agreed to it, or
          because the law requires us to keep it (for example payment records).
        </p>
      </LegalSection>

      <LegalSection title="What we don't do">
        <ul>
          <li>We do not sell your data.</li>
          <li>We do not use advertising trackers or show ads.</li>
          <li>We do not use your farm records to train artificial intelligence models.</li>
          <li>
            We do not send marketing messages. If we ever offer product news, it will be a separate, optional choice and
            every message will include a way to stop them.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies and monitoring">
        <p>
          We only use cookies that are needed to keep you signed in and secure. We do not use advertising or
          cross-site tracking cookies, so there is nothing to opt in to.
        </p>
        <p>
          To find errors we use Sentry. When an error happens, and for a small sample of visits, Sentry records how the
          page behaved. Text and images on the screen are masked in these recordings, so your farm records are not
          captured. We also use Vercel Speed Insights to measure page speed. It does not use cookies.
        </p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <p>These companies process data on our behalf, only to provide the service:</p>
        <ul>
          <li><strong>Supabase:</strong> database hosting.</li>
          <li><strong>Vercel:</strong> web hosting and page speed measurement.</li>
          <li><strong>Sentry:</strong> error monitoring.</li>
          <li><strong>Paystack:</strong> payment processing.</li>
          <li><strong>Upstash:</strong> short-lived counters used to block repeated sign-in attempts.</li>
          <li><strong>Google:</strong> sign-in, if you choose it.</li>
        </ul>
        <p>
          Some of these providers store data on servers outside Ghana. We only use providers that protect personal data
          under their own data processing terms. We may also share data if the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <ul>
          <li>Your account and farm records are kept while your account is open.</li>
          <li>
            Records you delete in the app go to the Trash in Settings and are kept there until the account is deleted.
          </li>
          <li>
            When you ask us to delete your account, we delete your personal data within {DELETION_COMPLETION_DAYS} days.
            If you own a farm, its records are deleted too.
          </li>
          <li>Payment records are kept for as long as tax and accounting law requires.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>Under Ghana&apos;s Data Protection Act, 2012 (Act 843) you can:</p>
        <ul>
          <li>ask for a copy of your data. You can download it yourself from your Profile in the app;</li>
          <li>correct your details. You can edit them in your profile;</li>
          <li>ask us to delete your account. Use the button in your Profile or email us;</li>
          <li>object to how we use your data;</li>
          <li>complain to the Data Protection Commission of Ghana.</li>
        </ul>
        <p>
          To use any of these rights, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>The service is for people aged 18 and over. We do not knowingly collect data from children.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If we change this policy in a way that affects you, we will update the date above and ask you to accept the new
          version the next time you sign in. Read it together with our <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
