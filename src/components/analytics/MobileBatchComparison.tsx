'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, ChevronDown, EyeOff, Info, Lock, Wheat } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { QlChip } from '@/components/ui/ql/Chip'
import { QlHero, QlLabel } from '@/components/ui/ql/Surface'
import { QlMoney } from '@/components/ui/ql/Figure'
import { QlDerived } from '@/components/ui/ql/Derived'
import { qlButton } from '@/components/ui/ql/Button'
import { useCurrency } from '@/components/providers/CurrencyProvider'

export type ComparisonBatch = {
  id: string
  name: string
  status: string
  type: string
  houseName: string
  currentCount: number
  totalEggs: number
  fcr: number
  mortalityRate: number
  initialInvestment: number
  directExpenses: number
  allocatedExpenses: number
  consumptionShare: number
  generalShare: number
  totalExpenses: number
  totalRevenue: number
  netProfitability: number
}

type MetricKey = 'netProfit' | 'revenue' | 'expenses' | 'eggs' | 'fcr' | 'mortalityRate'

const METRICS: Record<MetricKey, { label: string; short: string; value: (b: ComparisonBatch) => number; finance?: boolean; lowerIsBetter?: boolean; benchmark?: number }> = {
  netProfit: { label: 'Net profit', short: 'Profit', value: (b) => b.netProfitability, finance: true },
  revenue: { label: 'Revenue', short: 'Revenue', value: (b) => b.totalRevenue, finance: true },
  expenses: { label: 'Expenses', short: 'Expenses', value: (b) => b.totalExpenses, finance: true, lowerIsBetter: true },
  eggs: { label: 'Eggs collected', short: 'Eggs', value: (b) => b.totalEggs },
  fcr: { label: 'Feed conversion', short: 'FCR', value: (b) => b.fcr, lowerIsBetter: true, benchmark: 1.6 },
  mortalityRate: { label: 'Mortality', short: 'Mortality', value: (b) => b.mortalityRate, lowerIsBetter: true, benchmark: 3.5 },
}

/** The desktop cards mark mortality above 5% red; phones say so next to the colour. */
const MORTALITY_FLAG = 5

const nf = new Intl.NumberFormat('en-US')
const isLayer = (b: ComparisonBatch) => b.type.toUpperCase().includes('LAYER')
const sentence = (value: string) => {
  const text = value.replaceAll('_', ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function MobileBatchComparison({
  batches,
  canViewFinance,
  selectedIds,
  onToggle,
}: {
  batches: ComparisonBatch[]
  canViewFinance: boolean
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const metricKeys = (Object.keys(METRICS) as MetricKey[]).filter((key) => canViewFinance || !METRICS[key].finance)
  const [metricKey, setMetricKey] = useState<MetricKey>(metricKeys[0])
  const [showBenchmark, setShowBenchmark] = useState(true)
  const [splitOpen, setSplitOpen] = useState<Record<string, boolean>>({})
  const [lockNote, setLockNote] = useState(false)
  const shown = batches.filter((b) => selectedIds.includes(b.id))
  const metric = METRICS[metricKey]
  const currency = useCurrency()
  const money = (v: number) => formatCurrency(v, currency)

  const totals = shown.reduce(
    (acc, b) => ({
      revenue: acc.revenue + b.totalRevenue,
      expenses: acc.expenses + b.totalExpenses,
      profit: acc.profit + b.netProfitability,
      eggs: acc.eggs + b.totalEggs,
      birds: acc.birds + b.currentCount,
    }),
    { revenue: 0, expenses: 0, profit: 0, eggs: 0, birds: 0 },
  )
  const keptPct = totals.revenue > 0 ? Math.max(0, Math.min(100, (totals.profit / totals.revenue) * 100)) : null
  const spentPct = totals.revenue > 0 ? Math.max(0, Math.min(100, (totals.expenses / totals.revenue) * 100)) : null

  const formatValue = (b: ComparisonBatch) => {
    const v = metric.value(b)
    if (metric.finance) return money(v)
    if (metricKey === 'eggs') return isLayer(b) || v > 0 ? nf.format(v) : 'Not a layer'
    if (metricKey === 'fcr') return v > 0 ? v.toFixed(2) : '—'
    return `${v.toFixed(1)}%`
  }

  const rows = useMemo(() => {
    const list = shown.map((b) => ({ b, v: metric.value(b) }))
    const candidates = metric.lowerIsBetter ? list.filter((r) => r.v > 0) : list
    const best = candidates.reduce<(typeof list)[number] | null>((top, r) => {
      if (!top) return r
      return metric.lowerIsBetter ? (r.v < top.v ? r : top) : r.v > top.v ? r : top
    }, null)
    return list
      .map((r) => ({ ...r, best: r.b.id === best?.b.id && shown.length > 1 }))
      .sort((a, z) => (metric.lowerIsBetter ? (a.v || Infinity) - (z.v || Infinity) : z.v - a.v))
  }, [shown, metric])

  const min = Math.min(0, ...rows.map((r) => r.v))
  const max = Math.max(0, ...rows.map((r) => r.v), metric.benchmark && showBenchmark ? metric.benchmark : 0)
  const range = max - min || 1
  const zero = (-min / range) * 100
  const allFcrMissing = metricKey === 'fcr' && rows.every((r) => !(r.v > 0))

  // Notes the board asks for: where a loss comes from, and why a bar is flagged.
  const loss = metricKey === 'netProfit' ? rows.find((r) => r.v < 0 && r.b.totalRevenue === 0 && r.b.initialInvestment > 0) : undefined
  const flagged = metricKey === 'mortalityRate' ? rows.filter((r) => r.v > MORTALITY_FLAG) : []
  const mortalityLow = metricKey === 'mortalityRate' ? [...rows].filter((r) => r.v > 0).sort((a, z) => a.v - z.v)[0] : undefined
  const mortalityHigh = metricKey === 'mortalityRate' ? [...rows].sort((a, z) => z.v - a.v)[0] : undefined

  const chipFor = (r: (typeof rows)[number]) => {
    if (metricKey === 'netProfit' && r.v < 0 && r.b.totalRevenue === 0) return <QlChip tone="amber">No revenue yet</QlChip>
    if (metricKey === 'mortalityRate' && r.v > MORTALITY_FLAG) return <QlChip tone="coral">Flagged</QlChip>
    if (r.best && !(metricKey === 'fcr' && r.v <= 0)) return <QlChip tone="mint">Leads</QlChip>
    return null
  }

  const costMax = Math.max(1, ...shown.map((b) => Math.max(b.totalRevenue, b.totalExpenses)))

  return (
    <div className="space-y-3 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>{nf.format(batches.length)} {batches.length === 1 ? 'batch' : 'batches'} · this farm</QlLabel>
        <h1 className="mt-2 font-ql-display text-[28px] font-semibold leading-none tracking-[-0.02em]">Batch comparison</h1>
        <p className="mt-2 text-[13px] text-ql-muted">
          {canViewFinance ? 'Profit, eggs, feed conversion and mortality, side by side' : 'Eggs, feed conversion and mortality, side by side'}
        </p>
      </header>

      <div>
        <QlLabel>Showing {shown.length} of {batches.length} batches</QlLabel>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Batches in the comparison">
          {batches.map((b) => {
            const on = selectedIds.includes(b.id)
            const locked = on && shown.length === 1
            return (
              <li key={b.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-disabled={locked || undefined}
                  aria-label={locked ? `${b.name}, kept: keep one batch to compare` : undefined}
                  onClick={() => (locked ? setLockNote(true) : (setLockNote(false), onToggle(b.id)))}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors duration-150',
                    on ? 'border-ql-mint/50 bg-ql-mint/[0.06] text-ql-text' : 'border-ql-line bg-ql-surface text-ql-muted',
                  )}
                >
                  <span aria-hidden="true" className={cn('flex h-5 w-5 items-center justify-center rounded-full', on ? 'bg-ql-mint text-ql-on-mint' : 'bg-ql-text/[0.06]')}>
                    {locked ? <Lock className="h-3 w-3" strokeWidth={2.5} /> : on ? <Check className="h-3 w-3" strokeWidth={3} /> : <EyeOff className="h-3 w-3" />}
                  </span>
                  {b.name}
                  <span className="font-ql-mono text-[10px] font-normal uppercase text-ql-muted">{isLayer(b) ? 'Layer' : sentence(b.type).replace(/^Poultry /, '')}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {lockNote ? <p className="mt-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">Keep one batch to compare</p> : null}
      </div>

      {canViewFinance ? (
        <QlHero aria-labelledby="cmp-profit-label" className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent)_0%,transparent_60%)]">
          <QlLabel as="h2" id="cmp-profit-label">Net profit · {shown.length === 2 ? 'both batches' : `${shown.length} batches`}</QlLabel>
          <p className="mt-3 text-[clamp(28px,10vw,40px)] leading-none">
            <QlMoney amount={totals.profit} currency={currency} className={totals.profit < 0 ? 'text-ql-amber' : 'text-ql-text'} />
          </p>
          {keptPct !== null && spentPct !== null ? (
            <>
              <div aria-hidden="true" className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ql-text/[0.06]">
                <span className="h-full rounded-full bg-ql-mint" style={{ width: `${keptPct}%` }} />
                <span className="h-full rounded-full bg-ql-muted/60" style={{ width: `${spentPct}%` }} />
              </div>
              <div className="mt-2 flex justify-between font-ql-mono text-[11px] text-ql-muted">
                <span><QlDerived formula="net profit ÷ revenue">{Math.round(keptPct)}%</QlDerived> kept</span>
                <span><QlDerived formula="expenses ÷ revenue">{Math.round(spentPct)}%</QlDerived> spent</span>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-ql-muted">No revenue yet for the batches shown.</p>
          )}
          <dl className="mt-4 grid grid-cols-2 divide-x divide-ql-line border-t border-ql-line pt-3">
            <div className="min-w-0 pr-3">
              <dt><QlLabel as="span">Revenue</QlLabel></dt>
              <dd className="mt-1 truncate font-ql-display text-base font-semibold tabular-nums">{money(totals.revenue)}</dd>
            </div>
            <div className="min-w-0 pl-3">
              <dt><QlLabel as="span">Expenses</QlLabel></dt>
              <dd className="mt-1 truncate font-ql-display text-base font-semibold tabular-nums">{money(totals.expenses)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex justify-between border-t border-ql-line pt-3 font-ql-mono text-[11px] text-ql-muted">
            <span>Eggs collected</span>
            <span className="text-ql-text">{nf.format(totals.eggs)}</span>
          </div>
        </QlHero>
      ) : (
        <QlHero>
          <QlLabel>Eggs collected · {shown.length} batches</QlLabel>
          <p className="mt-3 font-ql-display text-[40px] font-semibold leading-none tabular-nums">{nf.format(totals.eggs)}</p>
          <p className="mt-2 font-ql-mono text-[11px] text-ql-muted">{nf.format(totals.birds)} live birds</p>
        </QlHero>
      )}

      <div>
        <QlLabel>Compare by</QlLabel>
        <div role="tablist" aria-label="Metric" className="mt-2 flex flex-wrap gap-1.5">
          {metricKeys.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={metricKey === key}
              onClick={() => setMetricKey(key)}
              className={cn(
                "relative h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-150 after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                metricKey === key ? 'border-ql-mint/50 bg-ql-mint/12 text-ql-mint' : 'border-ql-line text-ql-muted',
              )}
            >
              {METRICS[key].short}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? null : allFcrMissing ? (
        <div className="rounded-2xl border border-dashed border-ql-line p-5 text-center">
          <span aria-hidden="true" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-ql-line text-ql-muted">
            <Wheat className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <p className="mt-3 font-ql-display text-lg font-semibold">No FCR to compare yet</p>
          <p className="mt-1 text-[13px] text-ql-muted">Needs feed &amp; weight logs for {shown.map((b) => b.name).join(' and ')}.</p>
          <Link href="/dashboard/flocks" className={qlButton('filled', 'mt-4 w-full rounded-2xl')}>Add weights</Link>
        </div>
      ) : (
        <section aria-labelledby="cmp-metric" className="rounded-2xl border border-ql-line bg-ql-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="cmp-metric" className="font-ql-display text-lg font-semibold">{metric.label}</h2>
            <QlLabel as="span">{shown.length} {shown.length === 1 ? 'batch' : 'batches'}{metric.lowerIsBetter ? ' · lower is better' : ''}</QlLabel>
          </div>
          <ul className="mt-4 space-y-4">
            {rows.map((r) => {
              const left = Math.min(zero, ((r.v - min) / range) * 100)
              const width = Math.abs((r.v / range) * 100)
              const notLayer = metricKey === 'eggs' && !isLayer(r.b) && r.v === 0
              const missing = metricKey === 'fcr' && !(r.v > 0)
              const flaggedRow = metricKey === 'mortalityRate' && r.v > MORTALITY_FLAG
              return (
                <li key={r.b.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold">{r.b.name}</span>
                      {chipFor(r)}
                    </span>
                    <span className={cn('shrink-0 font-ql-display text-[15px] font-semibold tabular-nums', r.v < 0 ? 'text-ql-amber' : flaggedRow ? 'text-ql-coral' : r.best ? 'text-ql-mint' : notLayer || missing ? 'font-ql-mono text-[12px] font-normal text-ql-muted' : 'text-ql-text')}>
                      {formatValue(r.b)}
                    </span>
                  </div>
                  {notLayer || missing ? null : (
                    <div aria-hidden="true" className="relative mt-2 h-2 rounded-full bg-ql-text/[0.05]">
                      <span className="absolute -top-0.5 h-3 w-px bg-ql-muted/60" style={{ left: `${zero}%` }} />
                      <span
                        className={cn('absolute inset-y-0 rounded-full', r.v < 0 ? 'bg-ql-amber' : flaggedRow ? 'bg-ql-coral' : r.best ? 'bg-ql-mint' : 'bg-ql-muted/50')}
                        style={{ left: `${left}%`, width: `${Math.max(width, r.v !== 0 ? 1 : 0)}%` }}
                      />
                      {metric.benchmark && showBenchmark ? (
                        <span className="absolute -top-1 h-4 border-l border-dashed border-ql-text/50" style={{ left: `${((metric.benchmark - min) / range) * 100}%` }} />
                      ) : null}
                    </div>
                  )}
                  {r.v < 0 && min < 0 ? <p className="mt-1 font-ql-mono text-[10px] text-ql-muted" style={{ paddingLeft: `${Math.max(0, zero - 6)}%` }}>{money(0).replace(/[.,]00$/, '')}</p> : null}
                </li>
              )
            })}
          </ul>
          {metric.benchmark ? (
            <button
              type="button"
              role="switch"
              aria-checked={showBenchmark}
              onClick={() => setShowBenchmark((v) => !v)}
              className="mt-4 flex min-h-11 w-full items-center justify-between border-t border-ql-line pt-2 text-[13px] text-ql-muted"
            >
              <span>Benchmark {metricKey === 'fcr' ? metric.benchmark.toFixed(1) : `${metric.benchmark}%`} (dashed line)</span>
              <span className={cn('relative h-6 w-10 rounded-full transition-colors', showBenchmark ? 'bg-ql-mint' : 'bg-ql-text/[0.12]')}>
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-ql-ground transition-transform', showBenchmark ? 'translate-x-[18px]' : 'translate-x-0.5')} />
              </span>
            </button>
          ) : null}
          {loss ? (
            <p className="mt-4 flex gap-2 border-t border-ql-line pt-3 text-[13px] text-ql-muted">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <QlDerived formula={`initial cost ÷ loss for ${loss.b.name}`}>{Math.min(100, (loss.b.initialInvestment / Math.abs(loss.v)) * 100).toFixed(1)}%</QlDerived>{' '}
                of {loss.b.name}&rsquo;s loss is its initial cost, and it has no revenue yet.
              </span>
            </p>
          ) : null}
        </section>
      )}

      {metricKey === 'mortalityRate' && rows.length > 0 ? (
        <>
          <div className={cn('flex gap-3 rounded-2xl border p-4', flagged.length > 0 ? 'border-ql-amber/30 bg-ql-amber/[0.06]' : 'border-ql-line bg-ql-surface')}>
            <Info aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', flagged.length > 0 ? 'text-ql-amber' : 'text-ql-muted')} />
            <div className="min-w-0 text-[13px] text-ql-muted">
              {mortalityHigh && mortalityLow && mortalityHigh.b.id !== mortalityLow.b.id ? (
                <p className="text-sm font-semibold text-ql-text">
                  {mortalityHigh.b.name} is <QlDerived formula={`${mortalityHigh.v.toFixed(1)}% ÷ ${mortalityLow.v.toFixed(1)}%`}>{(mortalityHigh.v / mortalityLow.v).toFixed(1)}×</QlDerived> {mortalityLow.b.name}
                </p>
              ) : null}
              <p className="mt-0.5">Marked red above {MORTALITY_FLAG}% of the starting count. The dashed line is the {METRICS.mortalityRate.benchmark}% benchmark.</p>
            </div>
          </div>
          <Link href="/dashboard/mortality" className={qlButton('ghost', 'w-full rounded-2xl border-ql-line text-ql-text')}>
            Open Mortality log
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </>
      ) : null}

      {shown.length > 0 ? (
        <section aria-labelledby="cmp-side">
          <QlLabel as="h2" id="cmp-side">Side by side</QlLabel>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-ql-line bg-ql-surface">
            <table className="w-full min-w-0 border-collapse text-left">
              <thead>
                <tr className="border-b border-ql-line">
                  <th scope="col" className="w-[30%] min-w-24 p-3"><span className="sr-only">Measure</span></th>
                  {shown.map((b) => (
                    <th key={b.id} scope="col" className="min-w-32 border-l border-ql-line p-3 align-top font-normal">
                      <span className="block truncate font-ql-display text-[15px] font-semibold">{b.name}</span>
                      <span className="block truncate font-ql-mono text-[10px] uppercase text-ql-muted">{b.houseName} · {isLayer(b) ? 'Layer' : sentence(b.type).replace(/^Poultry /, '')}</span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-ql-mint">
                        <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', b.status === 'active' ? 'bg-ql-mint' : 'bg-ql-muted')} />
                        <span className={b.status === 'active' ? '' : 'text-ql-muted'}>{sentence(b.status)}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ql-line">
                {[
                  ...(canViewFinance
                    ? [
                        { key: 'profit', label: 'Net profit', cell: (b: ComparisonBatch) => <span className={cn('font-semibold', b.netProfitability < 0 ? 'text-ql-amber' : 'text-ql-mint')}>{money(b.netProfitability)}</span> },
                        { key: 'revenue', label: 'Revenue', cell: (b: ComparisonBatch) => money(b.totalRevenue) },
                        { key: 'costs', label: 'Costs', cell: (b: ComparisonBatch) => money(b.totalExpenses) },
                      ]
                    : [{ key: 'birds', label: 'Live birds', cell: (b: ComparisonBatch) => nf.format(b.currentCount) }]),
                  { key: 'eggs', label: 'Eggs', cell: (b: ComparisonBatch) => (isLayer(b) || b.totalEggs > 0 ? nf.format(b.totalEggs) : <span className="font-ql-mono text-[11px] text-ql-muted">Not a layer</span>) },
                  { key: 'mortality', label: 'Mortality', cell: (b: ComparisonBatch) => <span className={b.mortalityRate > MORTALITY_FLAG ? 'text-ql-coral' : undefined}>{b.mortalityRate.toFixed(1)}%</span> },
                  { key: 'fcr', label: 'FCR', cell: (b: ComparisonBatch) => (b.fcr > 0 ? b.fcr.toFixed(2) : <span className="text-ql-muted">—</span>) },
                ].map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="p-3 align-top font-ql-mono text-[10px] font-normal uppercase tracking-[0.08em] text-ql-muted">{row.label}</th>
                    {shown.map((b) => (
                      <td key={b.id} className="border-l border-ql-line p-3 align-top font-ql-display text-[14px] tabular-nums">{row.cell(b)}</td>
                    ))}
                  </tr>
                ))}
                {shown.some((b) => !(b.fcr > 0)) ? (
                  <tr>
                    <td colSpan={shown.length + 1} className="p-3">
                      <span className="flex items-center justify-between gap-3 text-[12px] text-ql-muted">
                        Needs feed &amp; weight logs
                        <Link href="/dashboard/flocks" className="inline-flex min-h-11 items-center font-semibold text-ql-mint">Add weights</Link>
                      </span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-ql-line px-4 py-8 text-center text-[13px] text-ql-muted">Pick a batch above to compare it.</p>
      )}

      {canViewFinance && shown.length > 0 ? (
        <section aria-labelledby="cmp-costs">
          <div className="flex items-baseline justify-between">
            <QlLabel as="h2" id="cmp-costs">Revenue and costs</QlLabel>
            <QlLabel as="span">Per batch</QlLabel>
          </div>
          <ul className="mt-2 divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {shown.map((b) => {
              const open = !!splitOpen[b.id]
              const parts = [
                { label: 'Initial cost', rule: 'Stays on its batch', value: b.initialInvestment, dot: 'bg-ql-muted' },
                { label: 'Feed and medication', rule: 'Split by usage', value: b.consumptionShare, dot: 'bg-ql-shell' },
                { label: 'Operating', rule: 'Direct and allocated costs', value: Math.max(0, b.directExpenses + b.allocatedExpenses), dot: 'bg-ql-amber' },
                { label: 'General share', rule: 'Split by headcount', value: b.generalShare, dot: 'bg-ql-text/30' },
              ]
              return (
                <li key={b.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-ql-display text-base font-semibold">{b.name}</p>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setSplitOpen((current) => ({ ...current, [b.id]: !open }))}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-semibold text-ql-mint"
                    >
                      Cost split
                      <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                    </button>
                  </div>
                  {[
                    { label: 'Revenue', value: b.totalRevenue, bar: 'bg-ql-mint' },
                    { label: 'Costs', value: b.totalExpenses, bar: 'bg-ql-muted/60' },
                  ].map((line) => (
                    <div key={line.label} className="mt-2">
                      <div className="flex justify-between gap-3">
                        <QlLabel as="span">{line.label}</QlLabel>
                        <span className="font-ql-display text-[14px] font-semibold tabular-nums">{money(line.value)}</span>
                      </div>
                      <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ql-text/[0.05]">
                        <span className={cn('block h-full rounded-full', line.bar)} style={{ width: `${line.value > 0 ? Math.max(1, (line.value / costMax) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                  {open ? (
                    <ul className="mt-3 divide-y divide-ql-line border-t border-ql-line">
                      {parts.map((part) => (
                        <li key={part.label} className="flex items-center gap-3 py-2.5">
                          <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', part.dot)} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold">{part.label}</span>
                            <span className="block text-[11px] text-ql-muted">{part.rule}</span>
                          </span>
                          <span className="shrink-0 font-ql-mono text-[12px] font-semibold tabular-nums">{money(part.value)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
