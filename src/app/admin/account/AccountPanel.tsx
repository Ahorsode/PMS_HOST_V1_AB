'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { KeyRound, Laptop, ShieldAlert, ShieldCheck } from 'lucide-react'
import {
  adminChangeOwnPassword,
  adminConfirmTwoStep,
  adminDisableTwoStep,
  adminEndOtherSessions,
  adminEndOwnSession,
  adminStartTwoStepSetup,
  type AccountActionResult,
  type AdminAccount,
} from '@/lib/actions/admin-account-actions'
import { ADMIN_ROLE_DETAILS, isAdminRole } from '@/lib/admin-permissions'
import { cn } from '@/lib/utils'

const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

/** Short device description from a user agent, e.g. "Chrome on Windows". */
function describeDevice(userAgent: string | null) {
  if (!userAgent) return 'Unknown device'
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Browser'
  const os = /Windows/.test(userAgent) ? 'Windows' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad/.test(userAgent) ? 'iPhone/iPad' : /Mac OS/.test(userAgent) ? 'Mac' : /Linux/.test(userAgent) ? 'Linux' : 'unknown system'
  return `${browser} on ${os}`
}

function Card({ icon, title, children, highlight }: { icon: React.ReactNode; title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <section className={cn('rounded-lg border bg-zinc-900/40', highlight ? 'border-amber-500/50' : 'border-zinc-800')}>
      <h2 className="flex items-center gap-2 border-b border-zinc-800 px-5 py-3 text-sm font-semibold text-white">{icon}{title}</h2>
      <div className="space-y-3 p-5">{children}</div>
    </section>
  )
}

export default function AccountPanel({
  account,
  mustSetUpTwoStep,
  highlightTwoStep,
}: {
  account: AdminAccount
  mustSetUpTwoStep: boolean
  highlightTwoStep: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [setup, setSetup] = useState<{ secret: string; formatted: string; uri: string } | null>(null)
  const [code, setCode] = useState('')

  function run(action: () => Promise<AccountActionResult>, success: string, after?: () => void) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error)
          return
        }
        toast.success(success)
        after?.()
        router.refresh()
      } catch (error) {
        console.error('[AccountPanel]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-normal">Your account</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {account.username} · {isAdminRole(account.role) ? ADMIN_ROLE_DETAILS[account.role].label : account.role}
          </p>
        </header>

        {mustSetUpTwoStep ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Super admins must use two-step sign-in. Set it up below to continue to the rest of the console.
          </p>
        ) : null}

        <Card icon={<ShieldCheck className="h-4 w-4 text-emerald-200" />} title="Two-step sign-in" highlight={highlightTwoStep || mustSetUpTwoStep}>
          {account.twoStepEnabled ? (
            <>
              <p className="text-sm text-emerald-200">On. You enter a code from your authenticator app after your password.</p>
              {!account.twoStepRequired ? (
                <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
                  event.preventDefault()
                  run(() => adminDisableTwoStep(code), 'Two-step sign-in turned off', () => setCode(''))
                }}>
                  <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="Current code" disabled={isPending} className={cn(inputClass, 'sm:max-w-[160px]')} />
                  <button type="submit" disabled={isPending || code.length !== 6} className="h-10 rounded-md border border-zinc-700 px-4 text-sm text-zinc-300 disabled:opacity-50">Turn off</button>
                </form>
              ) : (
                <p className="text-xs text-zinc-500">Required for super admins. If you lose your phone, another super admin can reset it from the Admins page.</p>
              )}
            </>
          ) : setup ? (
            <div className="space-y-3 text-sm">
              <ol className="list-decimal space-y-1 pl-5 text-zinc-300">
                <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator or Authy).</li>
                <li>
                  Add an account and type this key, or{' '}
                  <a href={setup.uri} className="text-emerald-300 underline">open it in the app</a> on this phone:
                </li>
              </ol>
              <p className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-center font-mono text-lg tracking-wider text-white">{setup.formatted}</p>
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
                event.preventDefault()
                run(() => adminConfirmTwoStep(setup.secret, code), 'Two-step sign-in is on', () => { setSetup(null); setCode('') })
              }}>
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code from the app" disabled={isPending} className={cn(inputClass, 'sm:max-w-[220px]')} />
                <button type="submit" disabled={isPending || code.length !== 6} className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50">Confirm and turn on</button>
              </form>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400">Off. Turn it on so a stolen password alone cannot open the console.</p>
              <button type="button" disabled={isPending}
                onClick={() => startTransition(async () => {
                  const result = await adminStartTwoStepSetup()
                  if (!result.success) toast.error(result.error)
                  else setSetup({ secret: result.secret, formatted: result.formatted, uri: result.uri })
                })}
                className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
                Set up two-step sign-in
              </button>
            </>
          )}
        </Card>

        <Card icon={<KeyRound className="h-4 w-4 text-emerald-200" />} title="Change your password">
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => {
            event.preventDefault()
            run(() => adminChangeOwnPassword(currentPassword, newPassword), 'Password changed. Your other sessions were signed out.', () => { setCurrentPassword(''); setNewPassword('') })
          }}>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Current password</span>
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isPending} className={cn(inputClass, 'mt-1')} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">New password</span>
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isPending} placeholder="10+ characters" className={cn(inputClass, 'mt-1')} />
            </label>
            <button type="submit" disabled={isPending || !currentPassword || newPassword.length < 10} className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50">Change</button>
          </form>
        </Card>

        <Card icon={<Laptop className="h-4 w-4 text-emerald-200" />} title="Where you are signed in">
          <ul className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
            {account.sessions.map((session) => (
              <li key={session.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-zinc-100">
                    {describeDevice(session.userAgent)}
                    {session.current ? <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">This device</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Signed in {formatDateTime(session.createdAt)} · last active {formatDateTime(session.lastSeenAt)}{session.ip ? ` · ${session.ip}` : ''}
                  </p>
                </div>
                {!session.current ? (
                  <button type="button" disabled={isPending} onClick={() => run(() => adminEndOwnSession(session.id), 'Session ended')}
                    className="h-8 self-start rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:border-red-400/50 disabled:opacity-50">
                    Sign out
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {account.sessions.length > 1 ? (
            <button type="button" disabled={isPending} onClick={() => run(adminEndOtherSessions, 'Signed out everywhere else')}
              className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-red-400/50 disabled:opacity-50">
              Sign out everywhere else
            </button>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
