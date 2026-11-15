import type { ReactNode } from 'react'
import { getActiveAdminUser } from '@/lib/admin-auth'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getActiveAdminUser()

  return (
    // `relative z-10` lifts the admin console above the global fixed background
    // gradient in the root layout (which would otherwise paint over this content).
    <div className="relative z-10 min-h-screen bg-zinc-950 text-white">
      <AdminNav adminName={admin?.username} adminRole={admin?.role} />
      <div>{children}</div>
    </div>
  )
}
