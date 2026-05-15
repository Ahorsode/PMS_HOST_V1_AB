'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { returnFromIsolation, logMortalityInIsolation } from '@/lib/actions/batch-actions'
import { toast } from 'sonner'
import { Activity, Skull, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'

interface Batch {
  id: number
  batchName: string
  isolationCount: number
}

export function InfirmaryManagement({ batches }: { batches: Batch[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<number, string>>({})

  const isolatedBatches = batches.filter(b => (b.isolationCount || 0) > 0)

  const handleAction = async (batchId: number, type: 'RECOVER' | 'DEAD', maxCount: number) => {
    const inputCount = parseInt(counts[batchId]) || maxCount
    
    if (inputCount <= 0 || inputCount > maxCount) {
      toast.error('Invalid count')
      return
    }

    setLoadingId(`${batchId}-${type}`)
    try {
      let res;
      if (type === 'RECOVER') {
        res = await returnFromIsolation(batchId, inputCount)
      } else {
        res = await logMortalityInIsolation({ 
          batchId, 
          count: inputCount,
          category: 'Isolation',
          subCategory: 'Resolved in Quarantine'
        })
      }

      if (res.success) {
        toast.success(type === 'RECOVER' ? `${inputCount} birds recovered!` : `${inputCount} mortality logs recorded.`)
        setCounts(prev => ({ ...prev, [batchId]: '' }))
      } else {
        toast.error(res.error)
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Active Isolation Management</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isolatedBatches.length > 0 ? isolatedBatches.map((batch) => (
          <div key={batch.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 hover:shadow-md transition-all border-l-4 border-l-amber-400">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                <Activity className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 text-lg truncate">{batch.batchName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full">In Quarantine</span>
                  <p className="text-sm text-gray-500 font-bold">
                    {batch.isolationCount} birds
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="w-full sm:w-24">
                <Input
                  type="number"
                  placeholder="Count"
                  value={counts[batch.id] || ''}
                  onChange={(e) => setCounts(prev => ({ ...prev, [batch.id]: e.target.value }))}
                  className="h-10 bg-white border-gray-200 text-center font-bold"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={() => handleAction(batch.id, 'RECOVER', batch.isolationCount)}
                  disabled={!!loadingId}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-emerald-200"
                >
                  {loadingId === `${batch.id}-RECOVER` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Recover
                </Button>
                <Button 
                  onClick={() => handleAction(batch.id, 'DEAD', batch.isolationCount)}
                  disabled={!!loadingId}
                  className="flex-1 sm:flex-none bg-white hover:bg-red-50 text-red-600 border border-red-100 font-bold text-xs h-10 px-6 rounded-xl transition-colors"
                >
                  {loadingId === `${batch.id}-DEAD` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Skull className="w-4 h-4 mr-2" />}
                  Mortality
                </Button>
              </div>
            </div>
          </div>
        )) : (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 shadow-inner">
            <div className="p-5 bg-emerald-50 rounded-full mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-40" />
            </div>
            <p className="font-black text-gray-900 text-xl tracking-tight">Zero Quarantined Birds</p>
            <p className="text-sm font-medium mt-1">Your entire livestock population is currently in active production houses.</p>
          </div>
        )}
      </div>
    </div>
  )
}
