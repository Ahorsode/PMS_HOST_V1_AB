import { unstable_cache } from 'next/cache'
import prisma from '@/lib/db'

export type DashboardMessage = { id: string; title: string; body: string; tone: 'info' | 'warning' | 'success'; createdAt: Date }

/** Cleared whenever an admin sends or withdraws a message (admin-message-actions). */
export const FARM_MESSAGES_TAG = 'farm-messages'

function findMessages(farmId: string, isOwner: boolean, take: number) {
  return prisma.farmMessage.findMany({
    where: {
      OR: [{ farmId }, { farmId: null }],
      withdrawnAt: null,
      AND: [{ OR: [{ showUntil: null }, { showUntil: { gt: new Date() } }] }],
      ...(isOwner ? {} : { audience: 'EVERYONE' }),
    },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, title: true, body: true, tone: true, createdAt: true, showUntil: true },
  })
}

// Messages change only when an admin sends or withdraws one, which clears the
// tag; the short lifetime covers anything else. Keyed by farm, audience and size.
const findMessagesCached = unstable_cache(findMessages, ['farm-messages'], { revalidate: 60, tags: [FARM_MESSAGES_TAG] })

/**
 * Admin messages for this farm (or every farm) that are still showing, for
 * this user: owner-only messages are skipped for staff. Newest first.
 */
export async function getDashboardMessages(farmId: string, isOwner: boolean, now = new Date(), take = 5): Promise<DashboardMessage[]> {
  const messages = await findMessagesCached(farmId, isOwner, take)
    // Outside a Next request (tests, scripts) unstable_cache is unavailable.
    .catch(() => findMessages(farmId, isOwner, take))
    .catch(() => [])

  return messages
    // A cached list can hold a message whose end time has since passed.
    .filter((message) => !message.showUntil || new Date(message.showUntil) > now)
    .map(({ showUntil: _showUntil, ...message }) => ({
      ...message,
      // Dates come back as text from the cache.
      createdAt: new Date(message.createdAt),
      tone: message.tone === 'warning' || message.tone === 'success' ? message.tone : 'info',
    }))
}
