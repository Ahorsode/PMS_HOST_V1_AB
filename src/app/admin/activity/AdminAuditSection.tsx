import Link from 'next/link'
import { History } from 'lucide-react'
import type { AdminAuditRow } from '@/lib/actions/admin-audit-actions'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

/** Every change made from the admin console (pricing, settings, admins, payments, farms). */
export default function AdminAuditSection({ entries }: { entries: AdminAuditRow[] }) {
  return (
    <section className="px-4 pt-6 sm:px-8">
      <div className="mx-auto max-w-7xl rounded-lg border border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
          <History className="h-5 w-5 text-emerald-200" />
          <div>
            <h2 className="text-lg font-semibold text-white">Admin changes</h2>
            <p className="text-xs text-zinc-500">{entries.length} most recent changes made in this console</p>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">No admin changes recorded yet.</p>
        ) : (
          <ul className="max-h-[480px] divide-y divide-zinc-800 overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100">{entry.summary}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                    {entry.action}
                    {entry.targetType === 'farm' && entry.targetId ? (
                      <>
                        {' · '}
                        <Link href={`/admin/farms/${entry.targetId}`} className="text-emerald-300 hover:underline">
                          open farm
                        </Link>
                      </>
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
