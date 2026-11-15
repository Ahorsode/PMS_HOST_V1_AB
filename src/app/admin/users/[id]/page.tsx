import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminCan } from '@/lib/admin-permissions'
import { adminGetFarmer } from '@/lib/actions/admin-farmer-actions'
import FarmerSupportPanel from './FarmerSupportPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'User | Poultry Ledger Admin',
  description: 'Help a farmer sign in, update their details, or hand over a farm.',
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePaymentAdminPage()
  const { id } = await params
  const farmer = await adminGetFarmer(id)
  if (!farmer) notFound()

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> All users
        </Link>
        <FarmerSupportPanel farmer={farmer} canManage={adminCan(admin.role, 'farms.manage')} />
      </div>
    </div>
  )
}
