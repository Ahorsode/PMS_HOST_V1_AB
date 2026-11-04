import Link from 'next/link'
import { Download, History } from 'lucide-react'
import type { AdminAuditRow, AuditFilters } from '@/lib/actions/admin-audit-actions'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

const fieldClass = 'h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-white outline-none focus:border-emerald-500'

/** Every change made from the admin console, with filters and CSV export. */
export default function AdminAuditSection({
  entries,
  filters,
  options,
}: {
  entries: AdminAuditRow[]
  filters: AuditFilters
  options: { admins: string[]; actionGroups: string[] }
}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value) as [string, string][]).toString()
  const filtered = query.length > 0

  return (
    <section className="px-4 pt-6 sm:px-8">
      <div className="mx-auto max-w-7xl rounded-lg border border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-emerald-200" />
            <div>
              <h1 className="text-lg font-semibold text-white">Admin changes</h1>
              <p className="text-xs text-zinc-500">{entries.length} {filtered ? 'matching' : 'most recent'} changes made in this console</p>
            </div>
          </div>
          <a href={`/admin/activity/export${query ? `?${query}` : ''}`}
            className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500">
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>

        <form action="/admin/activity" className="flex flex-wrap items-end gap-2 border-b border-zinc-800 px-5 py-3">
          <label className="block text-xs text-zinc-400">
            Admin
            <select name="admin" defaultValue={filters.admin ?? ''} className={`${fieldClass} mt-1 block`}>
              <option value="">Anyone</option>
              {options.admins.map((admin) => <option key={admin} value={admin}>{admin}</option>)}
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            Kind
            <select name="action" defaultValue={filters.action ?? ''} className={`${fieldClass} mt-1 block`}>
              <option value="">All</option>
              {options.actionGroups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            From
            <input type="date" name="from" defaultValue={filters.from ?? ''} className={`${fieldClass} mt-1 block`} />
          </label>
          <label className="block text-xs text-zinc-400">
            To
            <input type="date" name="to" defaultValue={filters.to ?? ''} className={`${fieldClass} mt-1 block`} />
          </label>
          <label className="block flex-1 text-xs text-zinc-400">
            Search
            <input name="q" defaultValue={filters.q ?? ''} placeholder="Words or a farm id" className={`${fieldClass} mt-1 block w-full min-w-[160px]`} />
          </label>
          <button type="submit" className="h-9 rounded-md bg-emerald-500 px-3 text-sm font-semibold text-zinc-950">Filter</button>
          {filtered ? <Link href="/admin/activity" className="h-9 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300">Clear</Link> : null}
        </form>

        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">{filtered ? 'Nothing matches these filters.' : 'No admin changes recorded yet.'}</p>
        ) : (
          <ul className="max-h-[560px] divide-y divide-zinc-800 overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100">{entry.summary}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                    {entry.action}
                    {entry.targetType === 'farm' && entry.targetId ? (
                      <>{' · '}<Link href={`/admin/farms/${entry.targetId}`} className="text-emerald-300 hover:underline">open farm</Link></>
                    ) : null}
                    {entry.targetType === 'user' && entry.targetId ? (
                      <>{' · '}<Link href={`/admin/users/${entry.targetId}`} className="text-emerald-300 hover:underline">open user</Link></>
                    ) : null}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-300">{entry.adminUsername}</span> · {formatDateTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
