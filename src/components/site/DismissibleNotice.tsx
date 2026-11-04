'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, X } from 'lucide-react'
import type { MessageNotice } from '@/lib/settings/notices'

const UPGRADE_KINDS = new Set(['trialEnding', 'planExpired'])

/** A message-template notice the owner can dismiss; remembered per browser. */
export function DismissibleNotice({ notice, farmId }: { notice: MessageNotice; farmId: string }) {
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
    <div role="status" className="flex items-start gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
      <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{notice.title}</p>
        <p className="mt-0.5 leading-6 text-emerald-50/85">{notice.body}</p>
        {UPGRADE_KINDS.has(notice.kind) ? (
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
