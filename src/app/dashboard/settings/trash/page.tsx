import { getTrashItems } from '@/lib/actions/trash-actions'
import { TrashDashboardClient } from './TrashDashboardClient'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Data Recovery Center | Agri-ERP',
  description: 'Review and restore soft-deleted records from all operational modules.',
}

export default async function TrashPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role
  if (!['OWNER', 'MANAGER'].includes(role)) redirect('/dashboard')

  const trashItems = await getTrashItems()

  return <TrashDashboardClient trashItems={trashItems} />
}
