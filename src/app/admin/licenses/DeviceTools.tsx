'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ArrowRightLeft, History, Power } from 'lucide-react'
import {
  adminGetDeviceHistory,
  adminMoveDevice,
  adminSetDeviceActive,
  type AdminDeviceHistoryEntry,
  type AdminFarmChoice,
  type AdminFarmDevice,
} from '@/lib/actions/admin-device-actions'
import { cn } from '@/lib/utils'

const buttonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-[#f7f1df]/15 px-3 text-xs font-bold text-[#fff9e8]/85 transition hover:border-[#f7f1df]/35 disabled:opacity-50'

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

/** Switch off, move and history for one device in the Desktop licenses overview. */
export default function DeviceTools({
  device,
  currentFarmId,
  farms,
  onChanged,
}: {
  device: AdminFarmDevice
  currentFarmId: string
  farms: AdminFarmChoice[]
  /** Reload the farm's devices and the registry after a change. */
  onChanged: () => void
}) {
  const [panel, setPanel] = useState<'move' | 'history' | null>(null)
  const [targetFarmId, setTargetFarmId] = useState('')
  const [history, setHistory] = useState<AdminDeviceHistoryEntry[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const label = device.hardwareId || device.deviceName || 'this device'

  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          toast.error(result.error ?? 'Action failed')
          return
        }
        toast.success(success)
        setPanel(null)
        onChanged()
      } catch (error) {
        console.error('[DeviceTools]', error)
        toast.error('Request failed. Check your connection and try again.')
      }
    })
  }

  function showHistory() {
    if (panel === 'history') {
      setPanel(null)
      return
    }
    setPanel('history')
    startTransition(async () => {
      try {
        setHistory(await adminGetDeviceHistory(device.id))
      } catch {
        setHistory([])
        toast.error('Could not load the device history')
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={isPending} onClick={showHistory}>
          <History className="h-3.5 w-3.5" /> History
        </button>
        <button type="button" className={buttonClass} disabled={isPending} onClick={() => setPanel(panel === 'move' ? null : 'move')}>
          <ArrowRightLeft className="h-3.5 w-3.5" /> Move
        </button>
        <button
          type="button"
          disabled={isPending}
          className={cn(buttonClass, device.isActive ? 'hover:border-red-300/50 hover:text-red-100' : 'border-emerald-300/30 text-emerald-100')}
          onClick={() => {
            if (device.isActive && !window.confirm(`Switch off ${label}? It stops working until you switch it back on.`)) return
            run(() => adminSetDeviceActive(device.id, !device.isActive), device.isActive ? 'Device switched off' : 'Device switched back on')
          }}
        >
          <Power className="h-3.5 w-3.5" /> {device.isActive ? 'Switch off' : 'Switch on'}
        </button>
      </div>

      {panel === 'move' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[#f7f1df]/10 bg-black/25 p-3 sm:flex-row sm:items-center">
          <select
            value={targetFarmId}
            onChange={(event) => setTargetFarmId(event.target.value)}
            aria-label="Farm to move the device to"
            className="h-9 flex-1 rounded-full border border-[#f7f1df]/10 bg-black/40 px-3 text-sm text-[#fff9e8]"
          >
            <option value="">Choose a farm…</option>
            {farms
              .filter((farm) => farm.id !== currentFarmId)
              .map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} ({farm.ownerName})
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={isPending || !targetFarmId}
            onClick={() => run(() => adminMoveDevice(device.id, targetFarmId), 'Device moved')}
            className="h-9 rounded-full bg-[#d9a441] px-4 text-xs font-black uppercase tracking-wider text-[#11140d] disabled:opacity-50"
          >
            Move device
          </button>
        </div>
      ) : null}

      {panel === 'history' ? (
        <div className="rounded-xl border border-[#f7f1df]/10 bg-black/25 p-3 text-xs">
          {history === null ? (
            <p className="text-[#c5ba9a]/80">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-[#c5ba9a]/80">No payments, renewals or issued keys for this device yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((entry, index) => (
                <li key={index} className="border-b border-[#f7f1df]/5 pb-2 last:border-0 last:pb-0">
                  <p className="font-semibold text-[#fff9e8]">{entry.summary}</p>
                  <p className="mt-0.5 text-[#c5ba9a]/70">
                    {formatDateTime(entry.at)}
                    {entry.admin ? ` · ${entry.admin}` : ''}
                    {entry.token ? (
                      <>
                        {' · '}
                        <span className="font-[var(--font-payment-admin-mono)] text-[#d8c78f]">{entry.token}</span>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
