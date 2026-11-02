import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, UsersRound } from 'lucide-react'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { adminSearchFarmers } from '@/lib/actions/admin-farmer-actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Users | Poultry Ledger Admin',
  description: 'Find farm owners and staff to help them sign in, update details or move a farm.',
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePaymentAdminPage()
  const { q = '' } = await searchParams
  const users = await adminSearchFarmers(q)

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-normal">
              <UsersRound className="h-6 w-6 text-emerald-200" /> Users
            </h1>
            <p className="mt-2 text-sm text-zinc-400">Farm owners and staff. Open someone to help them sign in or change their details.</p>
          </div>
          <form className="relative w-full max-w-md" action="/admin/users">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name, phone, email or farm"
              className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500"
            />
          </form>
        </header>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <p className="border-b border-zinc-800 px-5 py-3 text-xs text-zinc-500">
            {q ? `${users.length} match${users.length === 1 ? '' : 'es'} for "${q}"` : `Newest ${users.length} users`}
          </p>
          {users.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">No users found.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {users.map((user) => (
                <li key={user.id}>
                  <Link href={`/admin/users/${user.id}`} className="flex flex-col gap-1 px-5 py-3 hover:bg-zinc-800/40 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block font-semibold text-zinc-100">{user.name}</span>
                      <span className="block text-xs text-zinc-500">{[user.phoneNumber, user.email].filter(Boolean).join(' · ') || 'No contact saved'}</span>
                    </span>
                    <span className="text-xs text-zinc-400">
                      {user.role.replace('_', ' ').toLowerCase()}
                      {user.farms.length ? ` · ${user.farms.join(', ')}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
