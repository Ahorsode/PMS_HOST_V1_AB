import { Wrench } from 'lucide-react'
import prisma from '@/lib/db'
import type { FarmAccess } from '@/lib/billing/access'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { getAppSettings } from '@/lib/settings/app-settings'
import { activeAnnouncement } from '@/lib/settings/schemas'
import { pickMessageNotice } from '@/lib/settings/notices'
import { getDashboardMessages } from '@/lib/settings/farm-messages'
import { AnnouncementBanner } from './AnnouncementBanner'
import { DismissibleNotice } from './DismissibleNotice'

/** Events that mean a plan was just paid for or granted. */
const PAYMENT_EVENTS = ['PAYSTACK_PAYMENT_COMPLETED', 'TIER_UPGRADED']

/**
 * Admin-controlled notices above the dashboard: maintenance mode, the
 * announcement banner, messages sent from the console, and (for the owner)
 * the message templates.
 */
export async function DashboardNotices({
  farm,
  access,
  isOwner,
}: {
  farm: { id: string; name: string; createdAt: Date } | null
  access: FarmAccess | null
  isOwner: boolean
}) {
  const [site, system, messages, billing] = await Promise.all([
    getAppSettings('site'),
    getAppSettings('system'),
    getAppSettings('messages'),
    getBillingConfig(),
  ])

  const announcement = activeAnnouncement(site, 'dashboard')

  let notice = null
  if (isOwner && farm && access) {
    const lastPayment = await prisma.subscriptionEvent
      .findFirst({
        where: { farmId: farm.id, eventType: { in: PAYMENT_EVENTS } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      .catch(() => null)
    notice = pickMessageNotice({ messages, billing, access, farm, lastPaymentAt: lastPayment?.createdAt ?? null })
  }

  const adminMessages = farm ? await getDashboardMessages(farm.id, isOwner) : []

  if (!system.maintenance.enabled && !announcement && !notice && adminMessages.length === 0) return null

  return (
    <div className="mx-auto mb-4 max-w-[1600px] space-y-3">
      {system.maintenance.enabled ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm leading-6 text-amber-50">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{system.maintenance.message}</p>
        </div>
      ) : null}
      {announcement ? <AnnouncementBanner announcement={announcement} /> : null}
      {adminMessages.map((message) => (
        <DismissibleNotice key={message.id} farmId={farm!.id} tone={message.tone} notice={{ title: message.title, body: message.body, dismissKey: `message:${message.id}` }} />
      ))}
      {notice ? <DismissibleNotice notice={notice} farmId={farm!.id} /> : null}
    </div>
  )
}
