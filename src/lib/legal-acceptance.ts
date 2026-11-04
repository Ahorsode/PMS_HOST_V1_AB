import prisma from '@/lib/db';
import { LEGAL_DOCUMENT, LEGAL_VERSION } from '@/lib/legal';

export type LegalAcceptanceMethod = 'SIGNUP_CHECKBOX' | 'IN_APP_PROMPT';

// The shared client and its transaction clients (both carry the db extensions).
type LegalAcceptanceClient = { legalAcceptance: Pick<typeof prisma.legalAcceptance, 'upsert'> };

/** Records that the user accepted the current Terms and Privacy Policy. */
export async function recordLegalAcceptance(
  userId: string,
  method: LegalAcceptanceMethod,
  client: LegalAcceptanceClient = prisma,
) {
  await client.legalAcceptance.upsert({
    where: { userId_document_version: { userId, document: LEGAL_DOCUMENT, version: LEGAL_VERSION } },
    create: { userId, document: LEGAL_DOCUMENT, version: LEGAL_VERSION, method },
    update: {},
  });
}

/**
 * Whether the user has accepted the current version. Fails open: if the
 * lookup errors (for example a preview database without the migration), the
 * user is not locked out of their farm.
 */
export async function hasAcceptedCurrentTerms(userId: string) {
  try {
    const acceptance = await prisma.legalAcceptance.findUnique({
      where: { userId_document_version: { userId, document: LEGAL_DOCUMENT, version: LEGAL_VERSION } },
      select: { id: true },
    });
    return !!acceptance;
  } catch (error) {
    console.error('[legal] Terms acceptance lookup failed:', error);
    return true;
  }
}
