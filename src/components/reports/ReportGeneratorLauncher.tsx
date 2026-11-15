'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { FormActions, OptionCards, SearchSelect } from '@/components/ui/form'
import { loadBatchReportPayloads } from '@/lib/actions/report-actions'
import { BatchReportWizard } from '@/components/reports/BatchReportWizard'
import { cn } from '@/lib/utils'

export type ReportBatchOption = {
  id: string
  batchName: string
  currentCount?: number
  status?: string
  house?: { name?: string } | null
}

type ScopeMode = 'all' | 'single'

export function ReportGeneratorLauncher({
  batches,
  presetBatchId,
  preloadedSources,
  buttonClassName,
  buttonSize = 'sm',
}: {
  batches: ReportBatchOption[]
  presetBatchId?: string
  preloadedSources?: any[]
  buttonClassName?: string
  buttonSize?: 'sm' | 'md'
}) {
  const [open, setOpen] = useState(false)
  const [scopeMode, setScopeMode] = useState<ScopeMode>(presetBatchId ? 'single' : 'all')
  const [selectedBatchId, setSelectedBatchId] = useState(presetBatchId || batches[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [dataSources, setDataSources] = useState<any[] | null>(preloadedSources ?? null)
  const [showWizard, setShowWizard] = useState(!!preloadedSources?.length)

  const loadReportForIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      toast.error('Select at least one batch')
      return
    }

    setLoading(true)
    try {
      const payloads = await loadBatchReportPayloads(ids)
      if (payloads.length === 0) {
        toast.error('Could not load batch data for this report')
        return
      }
      setDataSources(payloads)
      setShowWizard(true)
    } catch {
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setScopeMode(presetBatchId ? 'single' : 'all')
    setSelectedBatchId(presetBatchId || batches[0]?.id || '')
    setLoading(false)
    setDataSources(preloadedSources ?? null)
    setShowWizard(!!preloadedSources?.length)
  }, [batches, presetBatchId, preloadedSources])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  useEffect(() => {
    if (!open) return

    if (preloadedSources?.length) {
      setDataSources(preloadedSources)
      setShowWizard(true)
      return
    }

    if (presetBatchId) {
      setScopeMode('single')
      setSelectedBatchId(presetBatchId)
      void loadReportForIds([presetBatchId])
    }
  }, [open, presetBatchId, preloadedSources, loadReportForIds])

  const continueFromScope = async () => {
    const ids = scopeMode === 'all' ? batches.map((batch) => batch.id) : selectedBatchId ? [selectedBatchId] : []
    await loadReportForIds(ids)
  }

  const showScopeStep = open && !showWizard && !presetBatchId && !preloadedSources?.length

  return (
    <>
      <Button
        variant="glass"
        size={buttonSize}
        onClick={() => setOpen(true)}
        className={cn('shrink-0', buttonClassName)}
      >
        <FileText className="h-4 w-4" />
        Make a report
      </Button>

      <Dialog isOpen={open} onOpenChange={handleOpenChange} className="max-w-2xl" title={undefined}>
        {loading && !showWizard ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-fg-3" />
            <p className="text-sm text-fg-2">Getting your report ready...</p>
          </div>
        ) : showWizard && dataSources?.length ? (
          <BatchReportWizard dataSources={dataSources} />
        ) : showScopeStep ? (
          <div className="space-y-6">
            <div>
              <DialogTitle>Make a report</DialogTitle>
              <DialogDescription>Choose the flocks to report on.</DialogDescription>
            </div>

            <OptionCards
              aria-label="Which flocks"
              value={scopeMode}
              onChange={setScopeMode}
              options={[
                { value: 'all', label: 'All flocks', description: `One report for every flock (${batches.length})` },
                { value: 'single', label: 'One flock', description: 'A report for a single flock' },
              ]}
            />

            {scopeMode === 'single' ? (
              <SearchSelect
                label="Flock"
                value={selectedBatchId}
                onChange={setSelectedBatchId}
                searchPlaceholder="Search flocks"
                emptyText="No flock matches"
                options={batches.map((batch) => ({ value: batch.id, label: batch.batchName || 'Unnamed flock' }))}
              />
            ) : null}

            <FormActions>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={continueFromScope}
                disabled={loading || batches.length === 0 || (scopeMode === 'single' && !selectedBatchId)}
                isLoading={loading}
                loadingText="Preparing"
              >
                Continue
              </Button>
            </FormActions>
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
