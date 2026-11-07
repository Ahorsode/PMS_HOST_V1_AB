'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { returnFromIsolation, logMortalityInIsolation } from '@/lib/actions/batch-actions'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import { MutationBoundary } from '@/components/ui/MutationFeedback'
import { g, ink } from '@/components/ui/graphite'

interface Batch {
  id: string
  batchName: string
  isolationCount: number
}

export function InfirmaryManagement({ batches }: { batches: Batch[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, string>>({})

  const isolatedBatches = batches.filter(b => (b.isolationCount || 0) > 0)
  const isolatedBirds = isolatedBatches.reduce((sum, b) => sum + (b.isolationCount || 0), 0)

  const handleAction = async (batchId: string, type: 'RECOVER' | 'DEAD', maxCount: number) => {
    const actionKey = `${batchId}-${type}`
    if (loadingId === actionKey) return

    const inputCount = parseInt(counts[batchId]) || maxCount

    if (inputCount <= 0 || inputCount > maxCount) {
      toast.error(`Enter a count from 1 to ${maxCount}`)
      return
    }

    setLoadingId(actionKey)
    try {
      let res;
      if (type === 'RECOVER') {
        res = await returnFromIsolation(batchId, inputCount)
      } else {
        res = await logMortalityInIsolation({
          batchId,
          count: inputCount,
          category: 'Unknown',
          subCategory: 'Unknown cause yet'
        })
      }

      if (res.success) {
        const birds = `${inputCount} ${inputCount === 1 ? 'bird' : 'birds'}`
        toast.success(type === 'RECOVER' ? `${birds} returned to the house` : `${birds} recorded as dead`)
        setCounts(prev => ({ ...prev, [batchId]: '' }))
      } else {
        toast.error(res.error)
      }
    } catch (err) {
      toast.error('Something went wrong, try again')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className={g.sectionTitle}>Birds in isolation</h2>
          <p className={`mt-1 text-sm ${g.secondary}`}>Return recovered birds to their house, or record the ones that died</p>
        </div>
        {isolatedBatches.length > 0 ? (
          <span className={`${g.ledger} shrink-0 tabular-nums`}>
            {isolatedBirds.toLocaleString()} {isolatedBirds === 1 ? 'bird' : 'birds'}
          </span>
        ) : null}
      </div>

      {isolatedBatches.length > 0 ? (
        <ul className="space-y-2">
          {isolatedBatches.map((batch) => {
            const recoverKey = `${batch.id}-RECOVER`
            const mortalityKey = `${batch.id}-DEAD`
            const isRecovering = loadingId === recoverKey
            const isLoggingMortality = loadingId === mortalityKey
            const isRowLoading = isRecovering || isLoggingMortality
            const tooMany = parseInt(counts[batch.id]) > batch.isolationCount
            const inputId = `isolation-count-${batch.id}`

            return (
              <li key={batch.id}>
                <MutationBoundary active={isRowLoading} label={isRecovering ? 'Returning birds...' : 'Recording deaths...'} className="rounded-xl">
                  <div className={`${g.tile} flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between`}>
                    <div className="min-w-0">
                      <p className={`truncate text-base font-medium ${g.text}`}>{batch.batchName}</p>
                      <p className={`mt-1 flex items-center gap-2 text-sm ${g.secondary}`}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ink.warning }} />
                        <span className="tabular-nums">
                          {batch.isolationCount.toLocaleString()} {batch.isolationCount === 1 ? 'bird' : 'birds'} in isolation
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label htmlFor={inputId} className="sr-only">Number of birds</label>
                      <div className="w-full sm:w-28">
                        <Input
                          id={inputId}
                          type="number"
                          placeholder={`All ${batch.isolationCount}`}
                          min="1"
                          max={batch.isolationCount}
                          value={counts[batch.id] || ''}
                          disabled={isRowLoading}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val > batch.isolationCount) {
                              toast.error(`Only ${batch.isolationCount} birds are in isolation`);
                              return;
                            }
                            setCounts(prev => ({ ...prev, [batch.id]: e.target.value }));
                          }}
                          className={`${g.input} h-9 text-center ${tooMany ? 'border-neg-solid' : ''}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAction(batch.id, 'RECOVER', batch.isolationCount)}
                        disabled={isRowLoading}
                        aria-busy={isRecovering || undefined}
                        className={g.buttonSecondary}
                      >
                        {isRecovering ? (
                          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Check className="h-4 w-4 text-pos" strokeWidth={1.5} />
                        )}
                        Mark recovered
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(batch.id, 'DEAD', batch.isolationCount)}
                        disabled={isRowLoading}
                        aria-busy={isLoggingMortality || undefined}
                        className={`${g.buttonQuiet} hover:text-neg-solid`}
                      >
                        {isLoggingMortality ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : null}
                        Record deaths
                      </button>
                    </div>
                  </div>
                </MutationBoundary>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className={`rounded-xl border border-dashed ${g.hairline} px-6 py-12 text-center`}>
          <p className={`text-base font-medium ${g.text}`}>No birds in isolation</p>
          <p className={`mt-2 text-sm ${g.secondary}`}>Every bird is in its house</p>
        </div>
      )}
    </div>
  )
}
