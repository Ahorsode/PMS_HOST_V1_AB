import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal/LegalPage';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_URL,
  REFUND_PROCESSING_DAYS,
  REFUND_WINDOW_DAYS,
} from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Refund Policy | Poultry Ledger',
  description: 'When you can get a refund for a Poultry Ledger plan and how to ask for one.',
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="Paid plans are prepaid for a fixed term and never renew automatically, so you are only charged when you choose to pay."
    >
      <LegalSection title="When you get a full refund">
        <ul>
          <li>You were charged more than once for the same plan.</li>
          <li>You paid, but your plan was not applied and we could not fix it.</li>
          <li>
            You change your mind within {REFUND_WINDOW_DAYS} days of paying for your <strong>first</strong> paid term.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="When refunds are not given">
        <p>
          After {REFUND_WINDOW_DAYS} days, or for renewals and upgrades after your first paid term, we do not refund unused
          months unless the law requires it. Your plan stays active until the end of the term you paid for.
        </p>
      </LegalSection>

      <LegalSection title="How to ask">
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,{' '}
          <a href={CONTACT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a> or call{' '}
          {CONTACT_PHONE_DISPLAY}. Include your phone number and the Paystack reference or receipt.
        </p>
        <p>
          We reply within {REFUND_PROCESSING_DAYS} working days. Approved refunds go back to the card, mobile money wallet
          or bank account you paid with. How long the money takes to arrive depends on your bank or mobile money provider.
          When a refund is made, the plan it paid for ends.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
