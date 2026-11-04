'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const UPGRADE_KINDS = new Set(['trialEnding', 'planExpired'])

const TONES = {
  info: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50',
  warning: 'border-amber-400/35 bg-amber-500/10 text-amber-50',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50',
} as const

/**
 * A dashboard notice the user can dismiss; remembered per browser. Used for
 * the admin message templates (kind set) and for messages sent from the console.
 */
export function DismissibleNotice({
  notice,
  farmId,
  tone = 'info',
}: {
  notice: { title: string; body: string; dismissKey: string; kind?: string }
  farmId: string
  tone?: keyof typeof TONES
}) {
  const storageKey = `pl-notice:${farmId}:${notice.dismissKey}`
  // Hidden until we know it was not dismissed, so it does not flash.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(storageKey) !== 'dismissed')
    } catch {
      setVisible(true)
    }
  }, [storageKey])

  if (!visible) return null

  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', TONES[tone])}>
      <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{notice.title}</p>
        <p className="mt-0.5 whitespace-pre-line leading-6 opacity-85">{notice.body}</p>
        {notice.kind && UPGRADE_KINDS.has(notice.kind) ? (
          <Link href="/dashboard/license-upgrade" className="mt-2 inline-block text-xs font-bold uppercase tracking-wider text-emerald-300 hover:underline">
            Choose a plan
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setVisible(false)
          try {
            window.localStorage.setItem(storageKey, 'dismissed')
          } catch {
            // Storage unavailable (private mode): the notice returns next visit.
          }
        }}
        className="rounded p-1 text-emerald-200/70 hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
