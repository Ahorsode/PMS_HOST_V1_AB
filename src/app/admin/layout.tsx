import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:gap-6">
          <Link href="/admin/farms" className="w-fit font-bold text-white">
            HatchLog Admin
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link href="/admin/farms" className="text-zinc-400 transition-colors hover:text-white">
              Farms
            </Link>
            <Link href="/admin/licenses/issue" className="text-zinc-400 transition-colors hover:text-white">
              Issue License
            </Link>
            <Link href="/admin/licenses/renew" className="text-zinc-400 transition-colors hover:text-white">
              Renew License
            </Link>
            <Link href="/admin/payments" className="text-zinc-400 transition-colors hover:text-white">
              Payments
            </Link>
            <Link href="/admin/users/map" className="text-zinc-400 transition-colors hover:text-white">
              User Map
            </Link>
          </div>
        </div>
      </nav>
      <div>{children}</div>
    </div>
  )
}
