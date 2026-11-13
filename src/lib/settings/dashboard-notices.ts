import prisma from '@/lib/db'
import type { FarmAccess } from '@/lib/billing/access'
import { getBillingConfig } from '@/lib/billing/billing-config'
import { getAppSettings } from '@/lib/settings/app-settings'
import { activeAnnouncement } from '@/lib/settings/schemas'
import { pickMessageNotice } from '@/lib/settings/notices'

/** Events that mean a plan was just paid for or granted. */
const PAYMENT_EVENTS = ['PAYSTACK_PAYMENT_COMPLETED', 'TIER_UPGRADED']

/** When the farm last paid for or was granted a plan; null when never (or the lookup fails). */
export function loadLastPlanPayment(farmId: string): Promise<{ createdAt: Date } | null> {
  return prisma.subscriptionEvent
    .findFirst({
      where: { farmId, eventType: { in: PAYMENT_EVENTS } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    .catch(() => null)
}

/**
 * The admin-controlled notices a farm user should see now: maintenance mode,
 * the dashboard announcement and (for the owner) the plan message template.
 * Shared by the dashboard banners and the Notifications page.
 */
export async function getDashboardNotices({
  farm,
  access,
  isOwner,
  lastPlanPayment,
}: {
  farm: { id: string; name: string; createdAt: Date } | null
  access: FarmAccess | null
  isOwner: boolean
  /** A loadLastPlanPayment() the caller already started, so it is not waited for twice. */
  lastPlanPayment?: Promise<{ createdAt: Date } | null>
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
    const lastPayment = await (lastPlanPayment ?? loadLastPlanPayment(farm.id))
    notice = pickMessageNotice({ messages, billing, access, farm, lastPaymentAt: lastPayment?.createdAt ?? null })
  }

  return {
    maintenanceMessage: system.maintenance.enabled ? system.maintenance.message : null,
    announcement,
    notice,
  }
}
