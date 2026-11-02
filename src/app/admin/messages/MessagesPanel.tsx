'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Megaphone, Send } from 'lucide-react'
import { adminSendMessage, adminWithdrawMessage, type AdminMessageRow } from '@/lib/actions/admin-message-actions'
import { cn } from '@/lib/utils'

const inputClass =
  'h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500 disabled:opacity-50'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function messageState(message: AdminMessageRow) {
  if (message.withdrawnAt) return { label: 'Withdrawn', className: 'border-zinc-700 bg-zinc-800 text-zinc-300' }
  if (message.showUntil && new Date(message.showUntil) <= new Date()) return { label: 'Ended', className: 'border-zinc-700 bg-zinc-800 text-zinc-300' }
  return { label: 'Showing', className: 'border-emerald-500/35 bg-emerald-950/60 text-emerald-200' }
}

/** Compose in-app messages to farms and see what has been sent. */
export default function MessagesPanel({
  messages,
  farms,
  canSend,
}: {
  messages: AdminMessageRow[]
  farms: { id: string; name: string; owner: string }[]
  canSend: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [farmId, setFarmId] = useState('')
  const [audience, setAudience] = useState<'OWNERS' | 'EVERYONE'>('OWNERS')
  const [tone, setTone] = useState<'info' | 'warning' | 'success'>('info')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [showUntil, setShowUntil] = useState('')

  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string, after?: () => void) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error ?? 'Action failed')
          return
        }
        toast.success(success)
        after?.()
        router.refresh()
      } catch (error) {
        console.error('[MessagesPanel]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-normal">Messages to farms</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Shown at the top of the farm dashboard until the end date, or until you withdraw it. Each person can dismiss it.
            For a site-wide banner use Settings › Website & announcements.
          </p>
        </header>

        {canSend ? (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Send className="h-5 w-5 text-emerald-200" /> New message</h2>
            <form
              className="mt-4 grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                const target = farmId ? farms.find((farm) => farm.id === farmId)?.name : 'every farm'
                if (!farmId && !window.confirm('Send this to every farm?')) return
                run(
                  () => adminSendMessage({ farmId: farmId || null, audience, tone, title, body, showUntil: showUntil ? `${showUntil}T23:59:59.000Z` : null }),
                  `Message sent to ${target}`,
                  () => {
                    setTitle('')
                    setBody('')
                    setShowUntil('')
                  },
                )
              }}
            >
              <label className="block">
                <span className="text-xs font-semibold text-zinc-300">To</span>
                <select value={farmId} onChange={(e) => setFarmId(e.target.value)} disabled={isPending} className={cn(inputClass, 'mt-1')}>
                  <option value="">Every farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>{farm.name}{farm.owner ? ` (${farm.owner})` : ''}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-300">Who sees it</span>
                <select value={audience} onChange={(e) => setAudience(e.target.value as 'OWNERS' | 'EVERYONE')} disabled={isPending} className={cn(inputClass, 'mt-1')}>
                  <option value="OWNERS">Owners only</option>
                  <option value="EVERYONE">Owners and staff</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold text-zinc-300">Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} disabled={isPending} placeholder="New feature: batch reports" className={cn(inputClass, 'mt-1')} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold text-zinc-300">Message</span>
                <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} disabled={isPending}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-300">Style</span>
                <select value={tone} onChange={(e) => setTone(e.target.value as 'info' | 'warning' | 'success')} disabled={isPending} className={cn(inputClass, 'mt-1')}>
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="success">Good news</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-300">Show until (optional)</span>
                <input type="date" value={showUntil} onChange={(e) => setShowUntil(e.target.value)} disabled={isPending} className={cn(inputClass, 'mt-1')} />
              </label>
              <div className="md:col-span-2">
                <button type="submit" disabled={isPending || title.trim().length < 2 || body.trim().length < 2}
                  className="h-10 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">
                  Send message
                </button>
              </div>
            </form>
          </section>
        ) : (
          <p className="text-sm text-amber-200">Your admin role can see messages but not send them.</p>
        )}

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <h2 className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4 text-lg font-semibold"><Megaphone className="h-5 w-5 text-emerald-200" /> Sent</h2>
          {messages.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">No messages sent yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {messages.map((message) => {
                const state = messageState(message)
                return (
                  <li key={message.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{message.title}</span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', state.className)}>{state.label}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-zinc-300">{message.body}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        To {message.farmName ?? 'every farm'} · {message.audience === 'OWNERS' ? 'owners' : 'owners and staff'} · {message.adminUsername} · {formatDateTime(message.createdAt)}
                        {message.showUntil ? ` · until ${formatDateTime(message.showUntil)}` : ''}
                      </p>
                    </div>
                    {canSend && state.label === 'Showing' ? (
                      <button type="button" disabled={isPending}
                        onClick={() => run(() => adminWithdrawMessage(message.id), 'Message withdrawn')}
                        className="h-9 shrink-0 rounded-md border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-red-400/50 disabled:opacity-50">
                        Withdraw
                      </button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
