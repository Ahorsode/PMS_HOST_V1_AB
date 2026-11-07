'use client'

import React, { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { cn, formatCurrency } from '@/lib/utils'
import { compareNewestFirst } from '@/lib/utils/chronological-sort'
import { WorkerStamp } from '@/components/ui/WorkerStamp'
import { Panel, PanelHeader, formatCount, formatShortDate, statusLabel, tone } from '../flock-ui'
import { FlockHealthSchedule } from './FlockHealthSchedule'
import { FlockQuickLog } from './FlockQuickLog'

const chartLoading = () => <div className={cn(tone.panel, 'h-80')} />

const EggTrendPanel = dynamic(() => import('./FlockCharts').then((mod) => mod.EggTrendPanel), {
  ssr: false,
  loading: chartLoading,
})
const FinanceTrendPanel = dynamic(
  () => import('./FlockCharts').then((mod) => mod.FinanceTrendPanel),
  {
    ssr: false,
    loading: chartLoading,
  }
)
const MortalityTrendPanel = dynamic(
  () => import('./FlockCharts').then((mod) => mod.MortalityTrendPanel),
  {
    ssr: false,
    loading: chartLoading,
  }
)
const SalesTrendPanel = dynamic(() => import('./FlockCharts').then((mod) => mod.SalesTrendPanel), {
  ssr: false,
  loading: chartLoading,
})

interface FlockDetailClientProps {
  data: any
  eggsPerCrate?: number
}

const KIND_LABELS: Record<string, string> = {
  EggBatch: 'Egg batch',
}

function kindLabel(kind: string | null | undefined, percentage?: number | null) {
  const label = kind ? KIND_LABELS[kind] ?? kind : ''
  return percentage != null ? `${label} ${percentage}%` : label
}

export const FlockDetailClient = ({ data, eggsPerCrate = 30 }: FlockDetailClientProps) => {
  const { batch, logs, metrics, finance, series, forms } = data
  const showEggs = metrics.isLayer || metrics.totalEggs > 0
  const showSales = finance.canViewFinance && (series.salesDaily.length > 0 || finance.totalRevenue > 0)
  const initialInvestment =
    batch.initialCostActual +
    batch.initialCostCarriage +
    (batch.initialCostOther?.reduce((s: number, e: any) => s + Number(e.amount || 0), 0) || 0)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300">
      <FlockQuickLog
        batchId={batch.id}
        batchName={batch.batchName || 'This batch'}
        currentCount={batch.currentCount}
        isLayer={metrics.isLayer}
        feedInventory={forms.feedInventory}
        allocationBatches={forms.allocationBatches}
        canEditFinance={finance.canEditFinance}
      />

      {/* Operational metrics */}
      <StatStrip className="grid-cols-2 lg:grid-cols-4">
        <Stat
          title="Current age"
          value={`${formatCount(metrics.ageInDays)} days`}
          subtext={`Arrived ${formatShortDate(batch.arrivalDate)}`}
        />
        <Stat
          title="Feed conversion (FCR)"
          value={metrics.fcr > 0 ? metrics.fcr.toFixed(2) : '—'}
          subtext={`${formatCount(metrics.totalFeed)} bags fed`}
        />
        <Stat
          title="Mortality rate"
          value={`${metrics.mortalityRate.toFixed(1)}%`}
          subtext={`${formatCount(metrics.totalMortality)} deaths in total`}
        />
        <Stat
          title="Current stock"
          value={formatCount(batch.currentCount)}
          subtext={batch.isolationCount > 0 ? `${formatCount(batch.isolationCount)} in isolation` : `from ${formatCount(batch.initialCount)}`}
        />
      </StatStrip>

      {/* Finance metrics */}
      {finance.canViewFinance ? (
        <StatStrip className="grid-cols-1 sm:grid-cols-3">
          <Stat title="Total revenue" value={formatCurrency(finance.totalRevenue, 'GHS')} subtext="From sales" />
          <Stat
            title="Total expenses"
            value={formatCurrency(finance.totalExpenses, 'GHS')}
            subtext={
              [
                finance.initialInvestment > 0 ? `${formatCurrency(finance.initialInvestment, 'GHS')} initial` : null,
                finance.consumptionAllocatedTotal > 0
                  ? `${formatCurrency(finance.consumptionAllocatedTotal, 'GHS')} feed & med`
                  : null,
                finance.generalAllocatedTotal > 0 ? `${finance.headcountSharePct}% general` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Operating costs'
            }
          />
          <Stat
            title="Net profit"
            value={formatCurrency(finance.netProfit, 'GHS')}
            valueClassName={finance.netProfit >= 0 ? tone.accent : tone.negative}
            subtext={finance.netProfit >= 0 ? 'In profit' : 'In loss'}
          />
        </StatStrip>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Charts column */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <FinanceTrendPanel
            summary={series.financeSummary}
            monthly={series.financeMonthly}
            locked={!finance.canViewFinance}
          />
          {showEggs ? <EggTrendPanel data={series.eggDaily} eggsPerCrate={eggsPerCrate} /> : null}
          <MortalityTrendPanel data={series.mortalityDaily} />
          {showSales ? <SalesTrendPanel data={series.salesDaily} /> : null}

          <ActivityTimeline logs={logs} eggsPerCrate={eggsPerCrate} />
        </div>

        {/* Sidebar column */}
        <div className="min-w-0 space-y-6">
          <FlockHealthSchedule
            batchId={batch.id}
            vaccinations={logs.vaccinations}
            medications={logs.medications}
            vaccineInventory={forms.vaccineInventory}
            medicineInventory={forms.medicineInventory}
            canEdit={forms.canEditHealth}
          />

          {finance.canViewFinance ? <RevenueBreakdown items={finance.revenueBreakdown} /> : null}

          {finance.canViewFinance ? <ExpenseBreakdown items={finance.expenseBreakdown} /> : null}

          <Panel>
            <PanelHeader title="Batch details" />
            <dl className="divide-y divide-fg/[0.06]">
              <MetaItem label="Unit name" value={batch.batchName || 'Selected unit'} />
              <MetaItem label="Housing" value={batch.house?.name || 'House not named'} />
              <MetaItem label="Status" value={statusLabel(batch.status)} />
            </dl>
          </Panel>

          {initialInvestment > 0 ? (
            <Panel>
              <PanelHeader title="Initial investment" />
              <dl className="space-y-3 px-5 py-4">
                <InvestmentRow label="Purchase cost" value={batch.initialCostActual} />
                {batch.initialCostCarriage > 0 ? <InvestmentRow label="Transport and carriage" value={batch.initialCostCarriage} /> : null}
                {batch.initialCostOther?.map((expense: any, idx: number) => (
                  <InvestmentRow key={idx} label={expense.label} value={Number(expense.amount)} />
                ))}
              </dl>
              <div className={cn('flex items-baseline justify-between gap-3 border-t px-5 py-4', tone.hairline)}>
                <span className={cn('text-[13px]', tone.text2)}>Total</span>
                <span className={cn('text-base font-medium tabular-nums', tone.text)}>
                  {formatCurrency(initialInvestment, 'GHS')}
                </span>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function StatStrip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid gap-px overflow-hidden rounded-xl border border-fg/[0.08] bg-raised-2', className)}>
      {children}
    </div>
  )
}

function Stat({
  title,
  value,
  subtext,
  valueClassName,
}: {
  title: string
  value: string
  subtext?: string
  valueClassName?: string
}) {
  return (
    <div className="min-w-0 bg-card p-4 md:p-5">
      <p className={cn('text-[13px]', tone.text2)}>{title}</p>
      <p className={cn('mt-2 text-2xl font-medium leading-none tabular-nums md:text-[28px]', tone.text, valueClassName)}>
        {value}
      </p>
      {subtext ? <p className={cn('mt-2 text-xs', tone.muted)}>{subtext}</p> : null}
    </div>
  )
}

const TIMELINE_LABELS: Record<string, string> = {
  FEED: 'Feed',
  MORTALITY: 'Mortality',
  EGGS: 'Eggs',
  WEIGHT: 'Weight',
}

function ActivityTimeline({ logs, eggsPerCrate = 30 }: { logs: any; eggsPerCrate?: number }) {
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30
  const items = [
    ...logs.feedingLogs.map((l: any) => ({ ...l, _type: 'FEED' })),
    ...logs.mortalityRecords.map((m: any) => ({ ...m, _type: 'MORTALITY' })),
    ...logs.eggProduction.map((e: any) => ({ ...e, _type: 'EGGS' })),
    ...logs.weightRecords.map((w: any) => ({ ...w, _type: 'WEIGHT' })),
  ]
    .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
    .slice(0, 15)

  const formatEggLine = (eggs: number) => {
    const crates = Math.floor(eggs / epc)
    const rem = eggs % epc
    const crateLabel = crates === 1 ? 'crate' : 'crates'
    return rem > 0
      ? `Collected ${crates} ${crateLabel} and ${rem} eggs`
      : `Collected ${crates} ${crateLabel}`
  }

  return (
    <Panel>
      <PanelHeader title="Recent activity" />
      {items.length === 0 ? (
        <p className={cn('px-5 py-10 text-center text-[13px]', tone.text2)}>No activity logged yet</p>
      ) : (
        <ol className="px-5 py-2">
          {items.map((item, idx) => (
            <li key={idx} className="relative flex gap-4 py-3">
              <div className="relative flex w-2 shrink-0 justify-center">
                {idx < items.length - 1 ? <span className="absolute bottom-[-12px] top-5 w-px bg-fg/[0.08]" /> : null}
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 rounded-full',
                    item._type === 'MORTALITY' ? 'bg-neg-solid' : item._type === 'EGGS' ? 'bg-accent' : 'bg-fg-3'
                  )}
                />
              </div>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn('text-sm', tone.text)}>
                    {item._type === 'FEED' ? `Logged ${formatCount(item.amountConsumed)} bags of feed` : null}
                    {item._type === 'MORTALITY' ? `Recorded ${formatCount(item.count)} ${item.type === 'SICK' ? 'sick' : 'deaths'}` : null}
                    {item._type === 'EGGS' ? formatEggLine(Number(item.eggsCollected || 0)) : null}
                    {item._type === 'WEIGHT' ? `Average weight ${item.averageWeight} kg` : null}
                  </p>
                  <p className={cn('mt-0.5 text-xs', tone.muted)}>
                    {TIMELINE_LABELS[item._type]} ·{' '}
                    <span className="font-mono tabular-nums">
                      {new Date(item.logDate).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                </div>
                <WorkerStamp user={item.user} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function BreakdownRow({
  title,
  meta,
  amount,
}: {
  title: string
  meta: React.ReactNode
  amount: number
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className={cn('truncate text-sm', tone.text)}>{title}</p>
        <p className={cn('mt-0.5 text-xs', tone.muted)}>{meta}</p>
      </div>
      <span className={cn('shrink-0 text-sm tabular-nums', tone.text)}>{formatCurrency(amount, 'GHS')}</span>
    </div>
  )
}

function RevenueBreakdown({ items }: { items?: any[] }) {
  const rows = Array.isArray(items) ? items : []
  const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  return (
    <Panel>
      <PanelHeader title="Revenue breakdown" />
      {rows.length === 0 ? (
        <p className={cn('px-5 py-8 text-center text-[13px]', tone.text2)}>No revenue recorded for this batch</p>
      ) : (
        <div className="custom-scrollbar max-h-80 divide-y divide-fg/[0.06] overflow-y-auto">
          {rows.map((item) => (
            <BreakdownRow
              key={item.id}
              title={item.description}
              amount={item.amount}
              meta={[
                formatShortDate(item.date),
                item.quantity != null ? `${formatCount(item.quantity)} units` : null,
                kindLabel(item.kind, item.percentage),
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </div>
      )}
      <div className={cn('flex items-baseline justify-between gap-3 border-t px-5 py-4', tone.hairline)}>
        <span className={cn('text-xs', tone.muted)}>
          <span className="font-mono tabular-nums">{rows.length}</span> entr{rows.length === 1 ? 'y' : 'ies'}
        </span>
        <span className={cn('text-sm font-medium tabular-nums', tone.text)}>{formatCurrency(total, 'GHS')}</span>
      </div>
    </Panel>
  )
}

function ExpenseBreakdown({ items }: { items?: any[] }) {
  const rows = useMemo(() => {
    const list = Array.isArray(items) ? [...items] : []
    return list.sort((a, b) =>
      compareNewestFirst({ date: a.date, id: a.id }, { date: b.date, id: b.id }),
    )
  }, [items])
  return (
    <Panel>
      <PanelHeader title="Expense breakdown" />
      {rows.length === 0 ? (
        <p className={cn('px-5 py-8 text-center text-[13px]', tone.text2)}>No expenses recorded for this batch</p>
      ) : (
        <div className="custom-scrollbar max-h-80 divide-y divide-fg/[0.06] overflow-y-auto">
          {rows.map((item) => (
            <BreakdownRow
              key={item.id}
              title={item.description}
              amount={item.amount}
              meta={[
                item.category ? String(item.category).charAt(0) + String(item.category).slice(1).toLowerCase() : null,
                formatShortDate(item.date),
                kindLabel(item.kind, item.percentage),
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className={cn('text-[13px]', tone.text2)}>{label}</dt>
      <dd className={cn('min-w-0 truncate text-right text-sm', tone.text)}>{value}</dd>
    </div>
  )
}

function InvestmentRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn('text-[13px]', tone.text2)}>{label}</dt>
      <dd className={cn('text-sm tabular-nums', tone.text)}>{formatCurrency(value, 'GHS')}</dd>
    </div>
  )
}
