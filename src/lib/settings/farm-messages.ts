import prisma from '@/lib/db'

export type DashboardMessage = { id: string; title: string; body: string; tone: 'info' | 'warning' | 'success'; createdAt: Date }

/**
 * Admin messages for this farm (or every farm) that are still showing, for
 * this user: owner-only messages are skipped for staff. Newest first.
 */
export async function getDashboardMessages(farmId: string, isOwner: boolean, now = new Date(), take = 5): Promise<DashboardMessage[]> {
  const messages = await prisma.farmMessage
    .findMany({
      where: {
        OR: [{ farmId }, { farmId: null }],
        withdrawnAt: null,
        AND: [{ OR: [{ showUntil: null }, { showUntil: { gt: now } }] }],
        ...(isOwner ? {} : { audience: 'EVERYONE' }),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, title: true, body: true, tone: true, createdAt: true },
    })
    .catch(() => [])

  return messages.map((message) => ({
    ...message,
    tone: message.tone === 'warning' || message.tone === 'success' ? message.tone : 'info',
  }))
}
