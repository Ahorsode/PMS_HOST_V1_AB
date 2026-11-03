import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/legal/LegalPage';
import { BUSINESS_NAME } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of Service | Poultry Ledger',
  description: 'The terms that apply when you use Poultry Ledger.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms are an agreement between you and ${BUSINESS_NAME} ("we", "us"). By creating an account or using the web or desktop app, you agree to them and to our Privacy Policy.`}
    >
      <LegalSection title="Who can use the service">
        <p>
          You must be 18 or older and use the service for running a farm or farm business. If you create an account for
          a business, you confirm you are allowed to accept these terms on its behalf.
        </p>
      </LegalSection>

      <LegalSection title="Your account and your team">
        <ul>
          <li>Keep your password and invite codes private. You are responsible for activity on your account.</li>
          <li>
            Farm owners decide who joins their farm and what each person can see or change. Owners are responsible for
            having permission to add staff, customer and supplier details to the app.
          </li>
          <li>Tell us straight away if you think someone else has used your account.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your data">
        <p>
          The records you enter belong to you. You give us permission to store and process them only so we can provide
          the service. You can download a copy from your Profile at any time. Our <Link href="/privacy">Privacy Policy</Link>{' '}
          explains how we handle personal data.
        </p>
      </LegalSection>

      <LegalSection title="Plans and payment">
        <ul>
          <li>The Basic plan is free.</li>
          <li>
            Paid plans are paid in advance for the term you choose (1, 3, 6 or 12 months). The full price in Ghana cedis is
            shown before you pay. Payments are processed by Paystack.
          </li>
          <li>
            Paid plans do <strong>not</strong> renew automatically. When the term ends, your farm moves back to Basic and
            your records are kept.
          </li>
          <li>
            We may change prices for future terms. A change never affects a term you have already paid for.
          </li>
          <li>
            Refunds are covered by our <Link href="/refunds">Refund Policy</Link>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>Do not:</p>
        <ul>
          <li>try to access another farm&apos;s data or another person&apos;s account;</li>
          <li>attack, overload, or reverse engineer the service, or get around licence limits;</li>
          <li>use the service for anything illegal.</li>
        </ul>
        <p>We may suspend accounts that break these rules. We will tell you why unless the law prevents it.</p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          We work to keep the service available and your data safe, but we cannot promise it will always be available or
          free of errors. Planned maintenance and outages can happen. Download a copy of important records regularly.
        </p>
      </LegalSection>

      <LegalSection title="Reports and figures">
        <p>
          Reports, costs and analytics are calculated from the records you enter. They help you run your farm but are
          not veterinary, financial, tax, or legal advice. Check important decisions with a qualified professional.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          As far as the law allows, we are not liable for indirect losses such as lost profit or lost stock. Our total
          liability to you is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms
          limits rights you have under consumer protection law.
        </p>
      </LegalSection>

      <LegalSection title="Ending your account">
        <p>
          You can stop using the service at any time and ask us to delete your account from your Profile. We may close
          accounts that break these terms.
        </p>
      </LegalSection>

      <LegalSection title="Changes and governing law">
        <p>
          If we change these terms, we will update the date above and ask you to accept the new version the next time you
          sign in. These terms are governed by the laws of the Republic of Ghana.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
