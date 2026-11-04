'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { KeyRound, UserCog, UserPlus } from 'lucide-react'
import {
  adminCreateAdmin,
  adminResetAdminPassword,
  adminResetAdminTwoStep,
  adminSignOutAdmin,
  adminUpdateAdmin,
  type AdminAccountRow,
  type AdminUserActionResult,
} from '@/lib/actions/admin-user-actions'
import { ADMIN_ROLE_DETAILS, ADMIN_ROLES, isAdminRole } from '@/lib/admin-permissions'
import { cn } from '@/lib/utils'

const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

function formatDateTime(value: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en-GH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export default function AdminAccountsPanel({ admins, currentAdminId }: { admins: AdminAccountRow[]; currentAdminId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('BILLING')
  const [resetFor, setResetFor] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  function run(action: () => Promise<AdminUserActionResult>, success: string, after?: () => void) {
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
        console.error('[AdminAccountsPanel]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-normal">Admins</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Who can sign in to this console and what they can do. Deactivating an admin signs them out on their next
            request. There must always be at least one active super admin.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-5 w-5 text-emerald-200" /> Add an admin
          </h2>
          <form
            className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              run(() => adminCreateAdmin({ username, password, role }), `Admin "${username}" created`, () => {
                setUsername('')
                setPassword('')
              })
            }}
          >
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" className={cn(inputClass, 'mt-1')} disabled={isPending} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Temporary password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="10+ characters" className={cn(inputClass, 'mt-1')} disabled={isPending} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-300">Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={cn(inputClass, 'mt-1')} disabled={isPending}>
                {ADMIN_ROLES.map((value) => (
                  <option key={value} value={value}>{ADMIN_ROLE_DETAILS[value].label}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={isPending || !username || !password} className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50">
              Create
            </button>
          </form>
          <ul className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
            {ADMIN_ROLES.map((value) => (
              <li key={value} className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <span className="font-semibold text-zinc-200">{ADMIN_ROLE_DETAILS[value].label}:</span> {ADMIN_ROLE_DETAILS[value].description}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <h2 className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4 text-lg font-semibold">
            <UserCog className="h-5 w-5 text-emerald-200" /> Admin accounts
          </h2>
          <ul className="divide-y divide-zinc-800">
            {admins.map((admin) => {
              const isSelf = admin.id === currentAdminId
              return (
                <li key={admin.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {admin.username}
                        {isSelf ? <span className="ml-2 text-xs font-normal text-zinc-500">(you)</span> : null}
                        {!admin.isActive ? (
                          <span className="ml-2 rounded-full border border-red-500/35 bg-red-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-200">Deactivated</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Last sign-in: {formatDateTime(admin.lastLoginAt)} · two-step {admin.twoStepEnabled ? 'on' : 'off'} · {admin.activeSessions} active session{admin.activeSessions === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Role for ${admin.username}`}
                        value={isAdminRole(admin.role) ? admin.role : ''}
                        disabled={isPending || isSelf}
                        onChange={(e) => run(() => adminUpdateAdmin(admin.id, { role: e.target.value }), `Role updated for ${admin.username}`)}
                        className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-white disabled:opacity-50"
                      >
                        {!isAdminRole(admin.role) ? <option value="">Unknown role</option> : null}
                        {ADMIN_ROLES.map((value) => (
                          <option key={value} value={value}>{ADMIN_ROLE_DETAILS[value].label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setResetFor(resetFor === admin.id ? null : admin.id)
                          setResetPassword('')
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
                      >
                        <KeyRound className="h-4 w-4" /> Reset password
                      </button>
                      {!isSelf && admin.twoStepEnabled ? (
                        <button type="button" disabled={isPending}
                          onClick={() => {
                            if (window.confirm(`Reset two-step sign-in for ${admin.username}? They will be signed out and must set it up again.`)) {
                              run(() => adminResetAdminTwoStep(admin.id), `Two-step reset for ${admin.username}`)
                            }
                          }}
                          className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50">
                          Reset two-step
                        </button>
                      ) : null}
                      {!isSelf && admin.activeSessions > 0 ? (
                        <button type="button" disabled={isPending}
                          onClick={() => run(() => adminSignOutAdmin(admin.id), `${admin.username} signed out`)}
                          className="h-9 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50">
                          Sign out
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={isPending || isSelf}
                        onClick={() =>
                          run(
                            () => adminUpdateAdmin(admin.id, { isActive: !admin.isActive }),
                            `${admin.username} ${admin.isActive ? 'deactivated' : 'reactivated'}`,
                          )
                        }
                        className={cn(
                          'h-9 rounded-md border px-3 text-sm disabled:opacity-50',
                          admin.isActive ? 'border-red-500/40 text-red-200 hover:bg-red-950/40' : 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/40',
                        )}
                      >
                        {admin.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                  {resetFor === admin.id ? (
                    <form
                      className="flex flex-col gap-2 sm:flex-row"
                      onSubmit={(event) => {
                        event.preventDefault()
                        run(() => adminResetAdminPassword(admin.id, resetPassword), `Password reset for ${admin.username}`, () => {
                          setResetFor(null)
                          setResetPassword('')
                        })
                      }}
                    >
                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="New password (10+ characters)"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className={cn(inputClass, 'sm:max-w-xs')}
                        disabled={isPending}
                      />
                      <button type="submit" disabled={isPending || !resetPassword} className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50">
                        Save password
                      </button>
                    </form>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
