'use client'

import React, { useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MessageCircle,
  SkipForward,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { useCurrency } from '@/components/providers/CurrencyProvider'
import {
  ALL_REPORT_SECTIONS,
  BatchReportDocument,
  DurationPreset,
  OPERATIONAL_SECTIONS,
  ReportFormat,
  ReportSectionKey,
  buildBatchReportHtml,
  buildReportFromSources,
  downloadBatchReportPdf,
  downloadBatchReportWord,
  earliestBatchArrivalDate,
  resolveDateRange,
  shareBatchReportWhatsApp,
} from '@/lib/reports/batch-report'

type WizardStep = 'duration' | 'data' | 'format' | 'preview'

const DURATION_OPTIONS: { key: DurationPreset; label: string; hint: string }[] = [
  { key: 'lifetime', label: 'Lifetime', hint: 'From batch arrival to today' },
  { key: 'today', label: 'Today', hint: 'Records from today only' },
  { key: 'weekly', label: 'Weekly', hint: 'Last 7 days' },
  { key: 'monthly', label: 'Monthly', hint: 'Current calendar month' },
  { key: 'custom', label: 'Custom range', hint: 'Pick start and end dates' },
]

const DATA_GROUPS = [
  {
    key: 'finance',
    label: 'Finance',
    hint: 'Summary, sales, and expenses',
    sections: ['finance', 'sales', 'expenses'] as ReportSectionKey[],
  },
  {
    key: 'operational',
    label: 'Operational logs',
    hint: 'Feed, mortality, eggs, weight, and health',
    sections: OPERATIONAL_SECTIONS,
  },
]

const INDIVIDUAL_SECTIONS: { key: ReportSectionKey; label: string }[] = [
  { key: 'finance', label: 'Finance summary' },
  { key: 'sales', label: 'Sales' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'feed', label: 'Feed logs' },
  { key: 'mortality', label: 'Mortality' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'weight', label: 'Weight' },
  { key: 'health', label: 'Health' },
]

function StepIndicator({ step }: { step: WizardStep }) {
  const steps: { key: WizardStep; label: string }[] = [
    { key: 'duration', label: 'Duration' },
    { key: 'data', label: 'Data' },
    { key: 'format', label: 'Format' },
    { key: 'preview', label: 'Preview' },
  ]
  const currentIndex = steps.findIndex((s) => s.key === step)

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {steps.map((s, idx) => (
        <div
          key={s.key}
          className={cn(
            'rounded-lg border px-3 py-1 text-xs',
            idx === currentIndex
              ? 'border-accent bg-accent font-semibold text-accent-fg'
              : idx < currentIndex
                ? 'border-accent/40 bg-accent/10 font-medium text-accent'
                : 'border-fg/10 bg-fg/[0.02] font-medium text-fg-3'
          )}
        >
          {idx + 1}. {s.label}
        </div>
      ))}
    </div>
  )
}

export function BatchReportWizard({ dataSources }: { dataSources: any[] }) {
  const currency = useCurrency()
  const isCombined = dataSources.length > 1
  const scopeLabel = isCombined
    ? `All batches (${dataSources.length})`
    : dataSources[0]?.batch?.batchName || 'This batch'
  const canViewFinance = dataSources.some((source) => source.finance?.canViewFinance)

  const [step, setStep] = useState<WizardStep>('duration')
  const [duration, setDuration] = useState<DurationPreset>('lifetime')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [allData, setAllData] = useState(true)
  const [selectedSections, setSelectedSections] = useState<ReportSectionKey[]>(ALL_REPORT_SECTIONS)
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [previewReport, setPreviewReport] = useState<BatchReportDocument | null>(null)
  const [busy, setBusy] = useState(false)

  const availableSections = useMemo(
    () =>
      canViewFinance
        ? ALL_REPORT_SECTIONS
        : ALL_REPORT_SECTIONS.filter((s) => s !== 'finance' && s !== 'sales' && s !== 'expenses'),
    [canViewFinance]
  )

  const effectiveSections = allData ? availableSections : selectedSections.filter((s) => availableSections.includes(s))

  const arrivalDate = isCombined ? earliestBatchArrivalDate(dataSources) : dataSources[0]?.batch?.arrivalDate

  const dateRange = useMemo(
    () => resolveDateRange(duration, arrivalDate, customStart, customEnd),
    [duration, arrivalDate, customStart, customEnd]
  )

  const builtReport = useMemo(() => {
    if (effectiveSections.length === 0 || dataSources.length === 0) return null
    return buildReportFromSources(dataSources, dateRange, effectiveSections, currency)
  }, [dataSources, dateRange, effectiveSections, currency])

  const previewHtml = previewReport ? buildBatchReportHtml(previewReport, true) : ''

  const toggleAllData = (checked: boolean) => {
    setAllData(checked)
    if (checked) setSelectedSections(availableSections)
  }

  const toggleGroup = (sections: ReportSectionKey[], checked: boolean) => {
    setAllData(false)
    setSelectedSections((prev) => {
      const next = new Set(prev)
      for (const section of sections) {
        if (!availableSections.includes(section)) continue
        if (checked) next.add(section)
        else next.delete(section)
      }
      return Array.from(next)
    })
  }

  const toggleSection = (section: ReportSectionKey, checked: boolean) => {
    setAllData(false)
    setSelectedSections((prev) => {
      const next = new Set(prev)
      if (checked) next.add(section)
      else next.delete(section)
      return Array.from(next)
    })
  }

  const isGroupChecked = (sections: ReportSectionKey[]) =>
    sections.filter((s) => availableSections.includes(s)).every((s) => effectiveSections.includes(s))

  const canProceedFromDuration =
    duration !== 'custom' || (customStart.length > 0 && customEnd.length > 0 && customStart <= customEnd)

  const canProceedFromData = effectiveSections.length > 0

  const goPreview = () => {
    if (!builtReport) return
    setPreviewReport(builtReport)
    setStep('preview')
  }

  const handleDownload = async (report: BatchReportDocument) => {
    setBusy(true)
    try {
      if (format === 'pdf') await downloadBatchReportPdf(report)
      else downloadBatchReportWord(report)
    } finally {
      setBusy(false)
    }
  }

  const handleShare = async (report: BatchReportDocument) => {
    setBusy(true)
    try {
      await shareBatchReportWhatsApp(report, format)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-2">
        <DialogTitle>Generate report</DialogTitle>
        <DialogDescription>
          {scopeLabel} — choose duration, data, format, then preview or download.
        </DialogDescription>
      </div>

      <StepIndicator step={step} />

      {step === 'duration' ? (
        <div className="space-y-4">
          <p className="text-xs font-medium text-fg/45">1. Report duration</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setDuration(option.key)}
                aria-pressed={duration === option.key}
                className={cn(
                  'rounded-lg px-4 py-3 text-left transition-colors',
                  duration === option.key
                    ? 'border-2 border-accent bg-accent/10 shadow-sm'
                    : 'border-2 border-fg/10 bg-fg/[0.03] hover:border-fg/25'
                )}
              >
                <p className={cn('text-sm', duration === option.key ? 'font-semibold text-accent' : 'font-medium text-fg')}>{option.label}</p>
                <p className="mt-0.5 text-xs font-medium text-fg/45">{option.hint}</p>
              </button>
            ))}
          </div>

          {duration === 'custom' ? (
            <div className="grid gap-3 rounded-lg border border-fg/10 bg-fg/[0.03] p-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-fg/45">Start date</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-lg border border-fg/10 bg-fg/[0.04] px-3 py-2 text-sm font-medium text-fg"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-fg/45">End date</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-lg border border-fg/10 bg-fg/[0.04] px-3 py-2 text-sm font-medium text-fg"
                />
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-fg/10 bg-fg/[0.03] px-4 py-3 text-xs font-medium text-fg/60">
              <Calendar className="h-4 w-4 text-fg-3" />
              Selected period: {dateRange.label}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep('data')} disabled={!canProceedFromDuration}>
              Next: select data
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'data' ? (
        <div className="space-y-4">
          <p className="text-xs font-medium text-fg/45">2. Report data</p>

          <label className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors', allData ? 'border-2 border-accent bg-accent/10' : 'border-2 border-fg/10 bg-fg/[0.03]')}>
            <input
              type="checkbox"
              checked={allData}
              onChange={(e) => toggleAllData(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            <div>
              <p className={cn('text-sm', allData ? 'font-semibold text-accent' : 'font-medium text-fg')}>All data</p>
              <p className="text-xs text-fg/50">Include every section available for this report</p>
            </div>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {DATA_GROUPS.filter((g) => g.key !== 'finance' || canViewFinance).map((group) => (
              <label
                key={group.key}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg px-4 py-3 transition-colors',
                  allData || isGroupChecked(group.sections) ? 'border-2 border-accent/60 bg-accent/10' : 'border-2 border-fg/10 bg-fg/[0.03]'
                )}
              >
                <input
                  type="checkbox"
                  checked={allData || isGroupChecked(group.sections)}
                  disabled={allData}
                  onChange={(e) => toggleGroup(group.sections, e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-fg">{group.label}</p>
                  <p className="text-xs text-fg/50">{group.hint}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="rounded-lg border border-fg/10 bg-fg/[0.02] p-4">
            <p className="mb-3 text-xs font-medium text-fg/45">Or pick specific sections</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {INDIVIDUAL_SECTIONS.filter(
                (s) => canViewFinance || !['finance', 'sales', 'expenses'].includes(s.key)
              ).map((section) => (
                <label key={section.key} className="flex items-center gap-2 text-xs font-medium text-fg/75">
                  <input
                    type="checkbox"
                    checked={allData || effectiveSections.includes(section.key)}
                    disabled={allData}
                    onChange={(e) => toggleSection(section.key, e.target.checked)}
                    className="h-3.5 w-3.5 accent-emerald-500"
                  />
                  {section.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep('duration')}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep('format')} disabled={!canProceedFromData}>
              Next: choose format
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'format' ? (
        <div className="space-y-4">
          <p className="text-xs font-medium text-fg/45">3. Export format</p>

          <div className="grid gap-2 sm:grid-cols-2">
            {(['pdf', 'word'] as ReportFormat[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormat(option)}
                aria-pressed={format === option}
                className={cn(
                  'rounded-lg px-4 py-4 text-left transition-colors',
                  format === option
                    ? 'border-2 border-accent bg-accent/10 shadow-sm'
                    : 'border-2 border-fg/10 bg-fg/[0.03] hover:border-fg/25'
                )}
              >
                <p className={cn('text-sm', format === option ? 'font-semibold text-accent' : 'font-medium text-fg')}>{option === 'pdf' ? 'PDF' : 'Word (.doc)'}</p>
                <p className="mt-0.5 text-xs text-fg/45">
                  {option === 'pdf' ? 'Best for sharing and printing' : 'Editable document format'}
                </p>
              </button>
            ))}
          </div>

          {builtReport?.finance ? (
            <div className="rounded-lg border border-fg/10 bg-fg/[0.03] px-4 py-3 text-xs text-fg/60">
              Preview will include net position of{' '}
              <span className={cn('font-medium', builtReport.finance.netProfit >= 0 ? 'text-accent' : 'text-neg')}>
                {formatCurrency(builtReport.finance.netProfit, currency)}
              </span>{' '}
              for {dateRange.label.toLowerCase()}.
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep('data')}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!builtReport || busy} onClick={() => builtReport && handleDownload(builtReport)}>
                <SkipForward className="h-4 w-4" />
                Skip preview & download
              </Button>
              <Button disabled={!builtReport} onClick={goPreview}>
                <Eye className="h-4 w-4" />
                Preview report
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'preview' && previewReport ? (
        <div className="space-y-4">
          <p className="text-xs font-medium text-fg/45">4. Preview before download</p>

          <div className="overflow-hidden rounded-lg border border-fg/10 bg-card">
            <div
              className="max-h-[min(50vh,420px)] overflow-y-auto custom-scrollbar"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep('format')} disabled={busy}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={() => handleShare(previewReport)}>
                <MessageCircle className="h-4 w-4" />
                Share on WhatsApp
              </Button>
              <Button disabled={busy} onClick={() => handleDownload(previewReport)}>
                <Download className="h-4 w-4" />
                Download {format === 'pdf' ? 'PDF' : 'Word'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
