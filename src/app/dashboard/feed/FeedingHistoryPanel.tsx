'use client'

import React, { useMemo } from 'react'
import { History, Utensils } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { getBreedDisplayName } from '@/lib/livestock-breed-options'
import { FeedLogActions } from './FeedActions'
import { compareNewestFirst } from '@/lib/utils/chronological-sort'

type FeedingLog = {
  id: string
  logDate: string | Date
  amountConsumed: number
  batch?: { batchName?: string | null; breedType?: string | null } | null
  inventory?: { itemName?: string | null } | null
  formulation?: { name?: string | null } | null
  user?: { firstname?: string | null; surname?: string | null } | null
}

function feedLabel(log: FeedingLog): string {
  if (log.inventory?.itemName) return log.inventory.itemName
  if (log.formulation?.name) return log.formulation.name
  return 'Feed'
}

export function FeedingHistoryPanel({
  logs,
  batches,
  inventory,
  formulations,
  canEdit,
}: {
  logs: FeedingLog[]
  batches: any[]
  inventory: any[]
  formulations: any[]
  canEdit: boolean
}) {
  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) =>
      compareNewestFirst({ date: a.logDate, id: a.id }, { date: b.logDate, id: b.id }),
    ),
    [logs],
  )

  const todayTotal = sortedLogs
    .filter((log) => new Date(log.logDate).toDateString() === new Date().toDateString())
    .reduce((sum, log) => sum + Number(log.amountConsumed || 0), 0)

  const weekTotal = sortedLogs
    .filter((log) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(log.logDate) >= weekAgo
    })
    .reduce((sum, log) => sum + Number(log.amountConsumed || 0), 0)

  return (
    <Card className="bg-[#1a2332] border-white/10 shadow-xl rounded-lg overflow-hidden">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-white text-xl border-none flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Feeding History
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Today</p>
              <p className="text-emerald-300 font-bold">{todayTotal.toLocaleString()} bags</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">This Week</p>
              <p className="text-emerald-300 font-bold">{weekTotal.toLocaleString()} bags</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {sortedLogs.length === 0 ? (
          <div className="py-16 text-center">
            <Utensils className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 font-medium">No feeding logs recorded yet.</p>
            <p className="text-white/30 text-sm mt-1">Use Log Feeding to record your first entry.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-widest">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-widest">Batch</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-widest">Feed</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-widest">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-widest">Logged By</th>
                    {canEdit && (
                      <th className="px-5 py-3 text-right text-xs font-bold text-white/50 uppercase tracking-widest">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {sortedLogs.map((log, index) => {
                    const batchLabel = log.batch?.batchName || `Unit ${index + 1}`
                    const loggedBy = [log.user?.firstname, log.user?.surname].filter(Boolean).join(' ') || '—'
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3 text-sm text-white/80">{formatDate(log.logDate)}</td>
                        <td className="px-5 py-3 text-sm font-bold text-white">
                          {batchLabel}
                          {log.batch?.breedType ? (
                            <span className="block text-xs font-medium text-white/50">
                              {getBreedDisplayName(log.batch.breedType)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-sm text-emerald-200">{feedLabel(log)}</td>
                        <td className="px-5 py-3 text-sm font-bold text-emerald-400">
                          {Number(log.amountConsumed).toLocaleString()} bags
                        </td>
                        <td className="px-5 py-3 text-sm text-white/60">{loggedBy}</td>
                        {canEdit && (
                          <td className="px-5 py-3 text-right">
                            <FeedLogActions
                              log={log}
                              batches={batches}
                              inventory={inventory}
                              formulations={formulations}
                            />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-white/10">
              {sortedLogs.map((log, index) => {
                const batchLabel = log.batch?.batchName || `Unit ${index + 1}`
                const loggedBy = [log.user?.firstname, log.user?.surname].filter(Boolean).join(' ') || '—'
                return (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                          {formatDate(log.logDate)}
                        </p>
                        <p className="text-white font-bold">{batchLabel}</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-400">
                        {Number(log.amountConsumed).toLocaleString()} bags
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-emerald-200">{feedLabel(log)}</span>
                      <span className="text-white/50">{loggedBy}</span>
                    </div>
                    {canEdit && (
                      <div className="pt-1">
                        <FeedLogActions
                          log={log}
                          batches={batches}
                          inventory={inventory}
                          formulations={formulations}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
