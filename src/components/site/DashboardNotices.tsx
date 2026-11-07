import { Wrench } from 'lucide-react'
import type { FarmAccess } from '@/lib/billing/access'
import { getDashboardNotices } from '@/lib/settings/dashboard-notices'
import { getDashboardMessages } from '@/lib/settings/farm-messages'
import { AnnouncementBanner } from './AnnouncementBanner'
import { DismissibleNotice } from './DismissibleNotice'

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
  const [{ maintenanceMessage, announcement, notice }, adminMessages] = await Promise.all([
    getDashboardNotices({ farm, access, isOwner }),
    farm ? getDashboardMessages(farm.id, isOwner) : Promise.resolve([]),
  ])

  if (!maintenanceMessage && !announcement && !notice && adminMessages.length === 0) return null

  return (
    <div className="mx-auto mb-4 max-w-[1600px] space-y-3">
      {maintenanceMessage ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm leading-6 text-amber-50">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{maintenanceMessage}</p>
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
