import type { Metadata } from 'next'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminCan } from '@/lib/admin-permissions'
import { adminListMessages } from '@/lib/actions/admin-message-actions'
import { adminListFarms } from '@/lib/actions/admin-farm-actions'
import MessagesPanel from './MessagesPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Messages | Poultry Ledger Admin',
  description: 'Send in-app messages to one farm or every farm.',
}

export default async function AdminMessagesPage() {
  const admin = await requirePaymentAdminPage()
  const [messages, farms] = await Promise.all([adminListMessages(), adminListFarms()])

  return (
    <MessagesPanel
      messages={messages}
      farms={farms.map((farm) => ({ id: farm.id, name: farm.name, owner: farm.ownerName ?? farm.ownerEmail ?? '' }))}
      canSend={adminCan(admin.role, 'farms.manage')}
    />
  )
}
