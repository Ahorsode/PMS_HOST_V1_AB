import type { Metadata } from 'next'
import { CheckCircle2, Info, OctagonAlert, TriangleAlert } from 'lucide-react'
import { requirePaymentAdminPage } from '@/lib/admin-auth'
import { getSystemStatus, type CheckState, type StatusCheck } from '@/lib/admin/system-status'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'System status | Poultry Ledger Admin',
  description: 'Whether payments, security, jobs and the database are set up and working.',
}

const STATE: Record<CheckState, { label: string; icon: typeof Info; className: string }> = {
  ok: { label: 'OK', icon: CheckCircle2, className: 'text-emerald-300' },
  info: { label: 'Note', icon: Info, className: 'text-sky-300' },
  warning: { label: 'Check', icon: TriangleAlert, className: 'text-amber-300' },
  problem: { label: 'Problem', icon: OctagonAlert, className: 'text-red-300' },
}

export default async function AdminSystemStatusPage() {
  await requirePaymentAdminPage('settings.manage')
  const checks = await getSystemStatus()
  const groups = Array.from(new Set(checks.map((check) => check.group)))
  const problems = checks.filter((check) => check.state === 'problem').length
  const warnings = checks.filter((check) => check.state === 'warning').length

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-normal">System status</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {problems === 0 && warnings === 0
              ? 'Everything checked here is set up.'
              : `${problems} problem${problems === 1 ? '' : 's'} and ${warnings} thing${warnings === 1 ? '' : 's'} to check.`}{' '}
            Checked {new Intl.DateTimeFormat('en-GH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())}; reload to check again.
          </p>
        </header>

        {groups.map((group) => (
          <section key={group} className="rounded-lg border border-zinc-800 bg-zinc-900/40">
            <h2 className="border-b border-zinc-800 px-5 py-3 text-sm font-semibold text-white">{group}</h2>
            <ul className="divide-y divide-zinc-800">
              {checks.filter((check) => check.group === group).map((check: StatusCheck) => {
                const state = STATE[check.state]
                const Icon = state.icon
                return (
                  <li key={check.name} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', state.className)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-100">
                        {check.name} <span className={cn('ml-1 text-xs font-semibold', state.className)}>{state.label}</span>
                      </p>
                      <p className="mt-0.5 break-words text-zinc-400">{check.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
