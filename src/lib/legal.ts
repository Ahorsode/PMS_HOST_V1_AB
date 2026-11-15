import { BRAND_NAME } from '@/lib/brand';

/**
 * Business and policy details shown on the Privacy, Terms and Refund pages.
 * Review these with a lawyer before relying on them.
 */

// Bump this when the Terms or Privacy Policy change in a way users must
// accept again. Every signed-in user is asked to accept the new version.
export const LEGAL_VERSION = '2026-11-03';
export const LEGAL_DOCUMENT = 'TERMS_AND_PRIVACY';
export const LEGAL_UPDATED_LABEL = '3 November 2026';

// Registered business name and address. Leave the address null until it is
// confirmed; the pages omit it rather than show a placeholder.
export const BUSINESS_NAME = BRAND_NAME;
export const BUSINESS_ADDRESS: string | null = null;

export const CONTACT_EMAIL = 'info@poultryledger.com';
export const CONTACT_PHONE_DISPLAY = '0554101675';
export const CONTACT_PHONE_E164 = '+233554101675';
export const CONTACT_WHATSAPP_URL = 'https://wa.me/233554101675';

// Days after payment within which a first paid term can be refunded in full.
export const REFUND_WINDOW_DAYS = 7;
// Working days within which we reply to a refund request.
export const REFUND_PROCESSING_DAYS = 5;
// Days within which an account deletion request is completed.
export const DELETION_COMPLETION_DAYS = 30;

export const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/refunds', label: 'Refund Policy' },
] as const;

export function accountDeletionMailto(accountId: string) {
  const subject = `Account deletion request - ${BRAND_NAME}`;
  const body = [
    'Please delete my account and personal data.',
    '',
    `Account ID: ${accountId}`,
    '',
    'I understand that farm records I own will be deleted, and that payment records are kept where the law requires.',
  ].join('\n');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
