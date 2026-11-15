import { unstable_cache } from 'next/cache';
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
    return await loadAcceptance(userId, LEGAL_VERSION);
  } catch (error) {
    if (error instanceof Error && error.message === NOT_ACCEPTED) return false;
    // Outside a Next request (tests, scripts) unstable_cache is unavailable.
    if (error instanceof Error && error.message.includes('incrementalCache')) {
      return findAcceptance(userId, LEGAL_VERSION).then(Boolean, (lookupError) => {
        console.error('[legal] Terms acceptance lookup failed:', lookupError);
        return true;
      });
    }
    console.error('[legal] Terms acceptance lookup failed:', error);
    return true;
  }
}

const NOT_ACCEPTED = 'TERMS_NOT_ACCEPTED';

function findAcceptance(userId: string, version: string) {
  return prisma.legalAcceptance.findUnique({
    where: { userId_document_version: { userId, document: LEGAL_DOCUMENT, version } },
    select: { id: true },
  });
}

/**
 * An acceptance never goes away, so once found it is remembered and later
 * requests skip the lookup. "Not accepted yet" is thrown rather than returned,
 * which keeps it out of the cache: the next request after the user accepts
 * sees the new row straight away.
 */
const loadAcceptance = unstable_cache(
  async (userId: string, version: string) => {
    if (!(await findAcceptance(userId, version))) throw new Error(NOT_ACCEPTED);
    return true;
  },
  ['legal-acceptance', LEGAL_DOCUMENT],
  { revalidate: 3600 },
);
