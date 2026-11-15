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
import {
  Button,
  Checkbox,
  DateInput,
  FormActions,
  FormNote,
  FormRow,
  FormSection,
  FormSteps,
  FormSummary,
  FormSummaryRow,
  MoreDetails,
  OptionCards,
} from '@/components/ui/form'
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

const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'duration', label: 'Dates' },
  { id: 'data', label: 'What to include' },
  { id: 'format', label: 'File type' },
  { id: 'preview', label: 'Preview' },
]

function StepIndicator({ step, onBack }: { step: WizardStep; onBack: (step: WizardStep) => void }) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === step)
  return <FormSteps steps={WIZARD_STEPS} current={currentIndex} onStepClick={(index) => onBack(WIZARD_STEPS[index].id)} />
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
    <div className="space-y-6">
      <div>
        <DialogTitle>Make a report</DialogTitle>
        <DialogDescription>{scopeLabel}</DialogDescription>
      </div>

      <StepIndicator step={step} onBack={setStep} />

      {step === 'duration' ? (
        <>
          <OptionCards
            label="Which dates"
            value={duration}
            onChange={setDuration}
            options={DURATION_OPTIONS.map((option) => ({
              value: option.key,
              label: option.label,
              description: option.hint,
            }))}
          />

          {duration === 'custom' ? (
            <FormRow>
              <DateInput label="From" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <DateInput label="To" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </FormRow>
          ) : (
            <FormNote>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-fg-3" strokeWidth={1.75} />
                {dateRange.label}
              </span>
            </FormNote>
          )}

          <FormActions>
            <Button type="button" variant="accent" onClick={() => setStep('data')} disabled={!canProceedFromDuration}>
              Next: what to include
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </FormActions>
        </>
      ) : null}

      {step === 'data' ? (
        <>
          <label
            className={cn(
              'flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150',
              allData ? 'border-accent bg-accent/10' : 'border-fg/[0.14] bg-page hover:border-fg/25'
            )}
          >
            <input
              type="checkbox"
              checked={allData}
              onChange={(e) => toggleAllData(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-semibold text-fg">Everything</span>
              <span className="block text-[13px] leading-5 text-fg-2">Every section available for this report</span>
            </span>
          </label>

          <FormSection title="Or choose parts">
            <div className="grid gap-2 sm:grid-cols-2">
              {DATA_GROUPS.filter((g) => g.key !== 'finance' || canViewFinance).map((group) => {
                const checked = allData || isGroupChecked(group.sections)
                return (
                  <label
                    key={group.key}
                    className={cn(
                      'flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150',
                      checked ? 'border-accent bg-accent/10' : 'border-fg/[0.14] bg-page hover:border-fg/25',
                      allData && 'cursor-not-allowed opacity-70'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={allData}
                      onChange={(e) => toggleGroup(group.sections, e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-fg">{group.label}</span>
                      <span className="block text-[13px] leading-5 text-fg-2">{group.hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>

            <MoreDetails label="Pick single sections">
              <div className="grid gap-x-4 sm:grid-cols-2">
                {INDIVIDUAL_SECTIONS.filter(
                  (s) => canViewFinance || !['finance', 'sales', 'expenses'].includes(s.key)
                ).map((section) => (
                  <Checkbox
                    key={section.key}
                    label={section.label}
                    checked={allData || effectiveSections.includes(section.key)}
                    disabled={allData}
                    onChange={(e) => toggleSection(section.key, e.target.checked)}
                  />
                ))}
              </div>
            </MoreDetails>
          </FormSection>

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setStep('duration')}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Back
            </Button>
            <Button type="button" variant="accent" onClick={() => setStep('format')} disabled={!canProceedFromData}>
              Next: file type
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </FormActions>
        </>
      ) : null}

      {step === 'format' ? (
        <>
          <OptionCards
            label="File type"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'pdf', label: 'PDF', description: 'Best for sharing and printing' },
              { value: 'word', label: 'Word (.doc)', description: 'You can edit it after' },
            ]}
          />

          {builtReport?.finance ? (
            <FormSummary>
              <FormSummaryRow
                label={`Profit, ${dateRange.label.toLowerCase()}`}
                value={formatCurrency(builtReport.finance.netProfit, currency)}
                tone={builtReport.finance.netProfit >= 0 ? 'positive' : 'negative'}
                strong
              />
            </FormSummary>
          ) : null}

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setStep('data')}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Back
            </Button>
            <Button type="button" variant="outline" disabled={!builtReport || busy} onClick={() => builtReport && handleDownload(builtReport)}>
              <SkipForward className="h-4 w-4" strokeWidth={1.75} />
              Download now
            </Button>
            <Button type="button" variant="accent" disabled={!builtReport} onClick={goPreview}>
              <Eye className="h-4 w-4" strokeWidth={1.75} />
              Preview
            </Button>
          </FormActions>
        </>
      ) : null}

      {step === 'preview' && previewReport ? (
        <>
          <div className="overflow-hidden rounded-xl border border-fg/[0.08] bg-card">
            <div
              className="max-h-[min(50vh,420px)] overflow-y-auto custom-scrollbar"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setStep('format')} disabled={busy}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              Back
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => handleShare(previewReport)}>
              <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              WhatsApp
            </Button>
            <Button type="button" variant="accent" disabled={busy} isLoading={busy} loadingText="Preparing" onClick={() => handleDownload(previewReport)}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Download {format === 'pdf' ? 'PDF' : 'Word'}
            </Button>
          </FormActions>
        </>
      ) : null}
    </div>
  )
}
