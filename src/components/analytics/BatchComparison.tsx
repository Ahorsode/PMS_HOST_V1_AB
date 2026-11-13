'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, Check, Eye, EyeOff, Layers } from 'lucide-react'
import { cn, formatCompactMoney, formatCurrency } from '@/lib/utils'
import { useCurrency } from '@/components/providers/CurrencyProvider'

type BatchReport = {
  id: string
  name: string
  status: string
  type: string
  houseName: string
  initialCount: number
  currentCount: number
  totalFeed: number
  totalEggs: number
  totalDead: number
  fcr: number
  mortalityRate: number
  initialInvestment: number
  directExpenses: number
  allocatedExpenses: number
  operatingExpenses: number
  consumptionShare: number
  generalShare: number
  totalExpenses: number
  totalRevenue: number
  netProfitability: number
}

interface BatchComparisonProps {
  batches: BatchReport[]
  canViewFinance: boolean
}

// Graphite ramp, one accent. Surfaces stay neutral so the charts carry the color.
const INK = {
  card: 'var(--card)',
  raised: 'var(--raised)',
  text: 'var(--fg)',
  secondary: 'var(--fg-2)',
  muted: 'var(--fg-3)',
  bar: 'var(--bar)',
  accent: 'var(--accent)',
  yolk: 'var(--yolk)',
  negative: 'var(--neg-solid)',
  grid: 'color-mix(in srgb, var(--fg) 6%, transparent)',
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
const axisTick = { fill: INK.muted, fontSize: 12, fontFamily: MONO }

const card = 'rounded-2xl border border-fg/[0.08] bg-card'
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-accent/60'

const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const fullNumber = new Intl.NumberFormat('en-US')

type MetricKey = 'netProfit' | 'revenue' | 'expenses' | 'eggs' | 'fcr' | 'mortalityRate'

type MetricDef = {
  label: string
  short: string
  accessor: (b: BatchReport) => number
  format: (v: number, currency: string) => string
  benchmark?: number
  lowerIsBetter?: boolean
  finance?: boolean
}

const formatFcr = (v: number) => (v ? v.toFixed(2) : '–')
const formatRate = (v: number) => `${v.toFixed(1)}%`

const METRICS: Record<MetricKey, MetricDef> = {
  netProfit: {
    label: 'Net profit',
    short: 'Profit',
    accessor: (b) => b.netProfitability,
    format: (v, currency) => formatCurrency(v, currency),
    finance: true,
  },
  revenue: {
    label: 'Revenue',
    short: 'Revenue',
    accessor: (b) => b.totalRevenue,
    format: (v, currency) => formatCurrency(v, currency),
    finance: true,
  },
  expenses: {
    label: 'Expenses',
    short: 'Expenses',
    accessor: (b) => b.totalExpenses,
    format: (v, currency) => formatCurrency(v, currency),
    lowerIsBetter: true,
    finance: true,
  },
  eggs: {
    label: 'Eggs collected',
    short: 'Eggs',
    accessor: (b) => b.totalEggs,
    format: (v) => `${fullNumber.format(v)} eggs`,
  },
  fcr: {
    label: 'Feed conversion ratio',
    short: 'FCR',
    accessor: (b) => b.fcr,
    format: formatFcr,
    benchmark: 1.6,
    lowerIsBetter: true,
  },
  mortalityRate: {
    label: 'Mortality rate',
    short: 'Mortality',
    accessor: (b) => b.mortalityRate,
    format: formatRate,
    benchmark: 3.5,
    lowerIsBetter: true,
  },
}

// Cost types each keep one muted hue from the farm, revenue leads in the accent.
const FINANCE_SERIES = [
  { key: 'Initial', label: 'Initial cost', color: '#7d8491' },
  { key: 'Operating', label: 'Operating', color: 'var(--clay)' },
  { key: 'Consumption', label: 'Feed and medication', color: 'var(--straw)' },
  { key: 'General', label: 'General share', color: 'var(--fg-3)' },
] as const

function shortName(name: string) {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name
}

function sentence(value: string) {
  const text = value.replaceAll('_', ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** The record-book line under every batch name: house and bird type. */
function Ledger({ batch, className }: { batch: BatchReport; className?: string }) {
  return (
    <span className={cn('block truncate font-mono text-xs text-fg-3', className)}>
      {batch.houseName} · {sentence(batch.type)}
    </span>
  )
}

function plural(count: number, word: string) {
  return `${fullNumber.format(count)} ${word}${count === 1 ? '' : 'es'}`
}

export function BatchComparison({ batches, canViewFinance }: BatchComparisonProps) {
  const currency = useCurrency()
  const availableMetrics = useMemo<MetricKey[]>(() => {
    const keys = Object.keys(METRICS) as MetricKey[]
    return keys.filter((key) => canViewFinance || !METRICS[key].finance)
  }, [canViewFinance])

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>(availableMetrics[0])
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(batches.slice(0, 4).map((b) => b.id))
  const [hiddenBatches, setHiddenBatches] = useState<string[]>([])
  const [showBenchmark, setShowBenchmark] = useState(true)
  // On phones the batch names under the charts collide, so they tilt sooner.
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const activeBatches = useMemo(
    () => batches.filter((b) => selectedBatchIds.includes(b.id) && !hiddenBatches.includes(b.id)),
    [batches, selectedBatchIds, hiddenBatches]
  )

  const metric = METRICS[selectedMetric]

  const chartData = useMemo(() => {
    const rows = activeBatches.map((b) => ({ id: b.id, name: shortName(b.name), value: metric.accessor(b) }))
    // The best batch on this metric is the one bar that gets the accent.
    const candidates = metric.lowerIsBetter ? rows.filter((r) => r.value > 0) : rows
    const best = candidates.reduce<(typeof rows)[number] | null>((top, row) => {
      if (!top) return row
      return metric.lowerIsBetter ? (row.value < top.value ? row : top) : row.value > top.value ? row : top
    }, null)
    return rows.map((row) => ({ ...row, best: row.id === best?.id }))
  }, [activeBatches, metric])

  const financeData = useMemo(
    () =>
      activeBatches.map((b) => ({
        name: shortName(b.name),
        Initial: b.initialInvestment,
        Operating: Math.max(0, b.directExpenses + b.allocatedExpenses),
        Consumption: b.consumptionShare,
        General: b.generalShare,
        Revenue: b.totalRevenue,
      })),
    [activeBatches]
  )

  const eggRanking = useMemo(
    () => [...activeBatches].sort((a, b) => b.totalEggs - a.totalEggs),
    [activeBatches]
  )

  const totals = useMemo(() => {
    return activeBatches.reduce(
      (acc, b) => {
        acc.revenue += b.totalRevenue
        acc.expenses += b.totalExpenses
        acc.profit += b.netProfitability
        acc.eggs += b.totalEggs
        acc.birds += b.currentCount
        return acc
      },
      { revenue: 0, expenses: 0, profit: 0, eggs: 0, birds: 0 }
    )
  }, [activeBatches])

  const leader = useMemo(() => {
    if (activeBatches.length === 0) return null
    const ranked = [...activeBatches].sort((a, b) => {
      if (canViewFinance) return b.netProfitability - a.netProfitability
      return b.totalEggs - a.totalEggs
    })
    return ranked[0]
  }, [activeBatches, canViewFinance])

  const toggleBatch = (id: string) => {
    setSelectedBatchIds((prev) => (prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]))
  }

  const toggleVisibility = (id: string) => {
    setHiddenBatches((prev) => (prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]))
  }

  if (batches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader count={0} canViewFinance={canViewFinance} />
        <div className={cn(card, 'flex flex-col items-center justify-center px-6 py-16 text-center')}>
          <Layers className="mb-4 h-6 w-6 text-fg-3" strokeWidth={1.5} />
          <p className="text-lg font-medium text-fg">No batches yet</p>
          <p className="mt-2 max-w-sm text-sm text-fg-2">
            Add a batch and log its feed, eggs and sales to compare it here.
          </p>
        </div>
      </div>
    )
  }

  const tilt = chartData.length > (wide ? 5 : 2)
  const shown = activeBatches.length

  return (
    <div className="space-y-6">
      <PageHeader count={batches.length} canViewFinance={canViewFinance} />

      {/* Totals for the batches in the comparison */}
      {/* Five figures with two decimals only fit one row on wide screens, so the
          money row gets wider cards below 2xl instead of truncating the values. */}
      <div
        className={cn(
          'grid grid-cols-2 gap-4',
          canViewFinance ? 'md:grid-cols-6 2xl:grid-cols-5' : 'md:grid-cols-3'
        )}
      >
        <Stat label="Batches shown" value={`${shown} of ${batches.length}`} className={canViewFinance ? 'md:col-span-2 2xl:col-span-1' : undefined} />
        <Stat label="Eggs collected" value={fullNumber.format(totals.eggs)} className={canViewFinance ? 'md:col-span-2 2xl:col-span-1' : undefined} />
        {canViewFinance ? (
          <>
            <Stat label="Revenue" value={formatCurrency(totals.revenue, currency)} className="col-span-2 md:col-span-2 2xl:col-span-1" />
            <Stat label="Expenses" value={formatCurrency(totals.expenses, currency)} className="col-span-2 md:col-span-3 2xl:col-span-1" />
            <Stat
              label="Net profit"
              value={formatCurrency(totals.profit, currency)}
              negative={totals.profit < 0}
              className="col-span-2 md:col-span-3 2xl:col-span-1"
            />
          </>
        ) : (
          <Stat label="Live birds" value={fullNumber.format(totals.birds)} />
        )}
      </div>

      {/* Leading batch */}
      {leader ? (
        <div className={cn(card, 'flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between')}>
          <div className="min-w-0">
            <p className="text-sm text-fg-2">Leading batch</p>
            <h2 className="mt-1 truncate text-3xl font-medium leading-tight text-fg">{leader.name}</h2>
            <Ledger batch={leader} className="mt-1" />
            <p className="mt-3 text-sm text-fg-2">
              {shown === 1
                ? 'The only batch shown'
                : canViewFinance
                  ? `Highest net profit of the ${shown} batches shown`
                  : `Most eggs of the ${shown} batches shown`}
            </p>
          </div>
          <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:gap-0 sm:divide-x sm:divide-fg/[0.08]">
            {canViewFinance ? (
              <LeaderFigure
                label="Net profit"
                value={formatCurrency(leader.netProfitability, currency)}
                negative={leader.netProfitability < 0}
              />
            ) : null}
            <LeaderFigure label="Eggs" value={fullNumber.format(leader.totalEggs)} />
            <LeaderFigure label="FCR" value={formatFcr(leader.fcr)} />
            <LeaderFigure label="Mortality" value={formatRate(leader.mortalityRate)} />
          </dl>
        </div>
      ) : null}

      {/* Batch list and the main comparison chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className={cn(card, 'flex flex-col p-4 lg:col-span-1')}>
          <div className="mb-2 flex items-baseline justify-between px-2">
            <h3 className="text-sm font-medium text-fg">Batches</h3>
            <span className="font-mono text-xs tabular-nums text-fg-3">
              {selectedBatchIds.length} selected
            </span>
          </div>
          <ul className="custom-scrollbar max-h-[360px] space-y-0.5 overflow-y-auto">
            {batches.map((batch) => {
              const isSelected = selectedBatchIds.includes(batch.id)
              const isHidden = hiddenBatches.includes(batch.id)
              return (
                <li
                  key={batch.id}
                  className={cn(
                    'flex items-center rounded-lg transition-colors duration-150',
                    isSelected
                      ? 'bg-raised shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'hover:bg-fg/[0.04]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleBatch(batch.id)}
                    aria-pressed={isSelected}
                    className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left', focusRing)}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected ? <Check className="h-4 w-4 text-fg-2" strokeWidth={1.5} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block truncate text-sm',
                          isSelected && !isHidden ? 'font-medium text-fg' : 'text-fg-2'
                        )}
                      >
                        {batch.name}
                      </span>
                      <Ledger batch={batch} />
                    </span>
                  </button>
                  {isSelected ? (
                    <button
                      type="button"
                      onClick={() => toggleVisibility(batch.id)}
                      aria-label={isHidden ? `Show ${batch.name} in charts` : `Hide ${batch.name} from charts`}
                      className={cn(
                        'mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg',
                        focusRing
                      )}
                    >
                      {isHidden ? (
                        <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>

          {metric.benchmark != null ? (
            <div className="mt-4 border-t border-fg/[0.08] px-2 pt-4">
              <button
                type="button"
                role="switch"
                aria-checked={showBenchmark}
                onClick={() => setShowBenchmark((v) => !v)}
                className={cn('flex w-full items-center justify-between rounded-md text-sm text-fg-2', focusRing)}
              >
                Show benchmark
                <span
                  className={cn(
                    'relative h-5 w-9 rounded-[10px] transition-colors duration-150',
                    showBenchmark ? 'bg-accent' : 'bg-fg/[0.12]'
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-fg transition-transform duration-150',
                      showBenchmark ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </span>
              </button>
            </div>
          ) : null}
        </div>

        <div className={cn(card, 'lg:col-span-3')}>
          <div className="flex flex-col gap-4 border-b border-fg/[0.08] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-medium text-fg">{metric.label}</h3>
              <p className="mt-1 text-sm text-fg-2">
                {plural(shown, 'batch')}
                {metric.lowerIsBetter ? ' · lower is better' : ''}
              </p>
            </div>
            <div
              role="tablist"
              aria-label="Metric"
              className="custom-scrollbar flex gap-1 overflow-x-auto rounded-[10px] border border-fg/[0.08] bg-page p-1"
            >
              {availableMetrics.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selectedMetric === key}
                  onClick={() => setSelectedMetric(key)}
                  className={cn(
                    'h-8 whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-150',
                    focusRing,
                    selectedMetric === key
                      ? 'bg-raised-2 font-medium text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'text-fg-2 hover:text-fg'
                  )}
                >
                  {METRICS[key].short}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {chartData.length > 0 ? (
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={INK.grid} vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={axisTick}
                      interval={0}
                      angle={tilt ? -25 : 0}
                      textAnchor={tilt ? 'end' : 'middle'}
                      height={tilt ? 56 : 32}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={axisTick}
                      width={56}
                      tickFormatter={(v) =>
                        metric.finance ? formatCompactMoney(v, currency) : compactNumber.format(Number(v))
                      }
                    />
                    <Tooltip
                      cursor={{ fill: 'color-mix(in srgb, var(--fg) 4%, transparent)' }}
                      content={<MetricTooltip format={(v) => metric.format(v, currency)} label={metric.label} />}
                    />
                    {showBenchmark && metric.benchmark != null ? (
                      <ReferenceLine
                        y={metric.benchmark}
                        stroke="color-mix(in srgb, var(--fg) 40%, transparent)"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{
                          value: `Benchmark ${metric.format(metric.benchmark, currency)}`,
                          position: 'insideTopRight',
                          fill: INK.secondary,
                          fontSize: 12,
                          fontFamily: MONO,
                        }}
                      />
                    ) : null}
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                      animationDuration={400}
                      animationEasing="ease-out"
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.id} fill={entry.best ? INK.accent : INK.bar} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>

      {/* Revenue and costs next to the egg ranking */}
      <div className={cn('grid grid-cols-1 gap-6', canViewFinance && 'xl:grid-cols-3')}>
        {canViewFinance ? (
          <div className={cn(card, 'xl:col-span-2')}>
            <div className="border-b border-fg/[0.08] px-5 py-4">
              <h3 className="text-lg font-medium text-fg">Revenue and costs</h3>
              <p className="mt-1 text-sm text-fg-2">
                Initial cost stays on its batch, feed and medication split by usage, general costs by headcount
              </p>
            </div>
            <div className="p-5">
              {financeData.length > 0 ? (
                <>
                  <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-2">
                    {[{ key: 'Revenue', label: 'Revenue', color: INK.accent }, ...FINANCE_SERIES].map((s) => (
                      <li key={s.key} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </li>
                    ))}
                  </ul>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financeData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={4}>
                        <CartesianGrid stroke={INK.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={axisTick}
                          interval={0}
                          angle={tilt ? -25 : 0}
                          textAnchor={tilt ? 'end' : 'middle'}
                          height={tilt ? 56 : 32}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={axisTick}
                          width={60}
                          tickFormatter={(v) => formatCompactMoney(v, currency)}
                        />
                        <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--fg) 4%, transparent)' }} content={<CurrencyTooltip />} />
                        <Bar
                          dataKey="Revenue"
                          fill={INK.accent}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                          animationDuration={400}
                          animationEasing="ease-out"
                        />
                        {FINANCE_SERIES.map((s, i) => (
                          <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.label}
                            stackId="costs"
                            fill={s.color}
                            radius={i === FINANCE_SERIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            maxBarSize={28}
                            animationDuration={400}
                            animationEasing="ease-out"
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        ) : null}

        <div className={card}>
          <div className="border-b border-fg/[0.08] px-5 py-4">
            <h3 className="text-lg font-medium text-fg">Egg production</h3>
            <p className="mt-1 text-sm tabular-nums text-fg-2">
              {fullNumber.format(totals.eggs)} eggs from {plural(shown, 'batch')}
            </p>
          </div>
          <div className="p-5">
            {eggRanking.some((b) => b.totalEggs > 0) ? (
              <ol className="space-y-4">
                {eggRanking.map((batch, index) => {
                  const top = eggRanking[0].totalEggs || 1
                  const share = Math.max(0, (batch.totalEggs / top) * 100)
                  return (
                    <li key={batch.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm text-fg">{batch.name}</span>
                        <span className="shrink-0 font-mono text-sm tabular-nums text-fg-2">
                          {fullNumber.format(batch.totalEggs)}
                        </span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-fg/[0.06]">
                        <div
                          className="h-1 rounded-full"
                          style={{ width: `${share}%`, backgroundColor: index === 0 ? INK.yolk : INK.bar }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="py-12 text-center text-sm text-fg-2">No eggs logged for the batches shown</p>
            )}
          </div>
        </div>
      </div>

      {/* One card per batch shown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {activeBatches.map((batch) => (
          <div key={batch.id} className={cn(card, 'p-5')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-base font-medium text-fg">{batch.name}</h4>
                <Ledger batch={batch} className="mt-1" />
              </div>
              <span className="flex shrink-0 items-center gap-2 text-xs text-fg-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: batch.status === 'active' ? 'var(--pos)' : INK.muted }}
                />
                {sentence(batch.status)}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-fg/[0.08] pt-4">
              <DetailStat label="FCR" value={formatFcr(batch.fcr)} />
              <DetailStat
                label="Mortality"
                value={formatRate(batch.mortalityRate)}
                negative={batch.mortalityRate > 5}
              />
              <DetailStat label="Eggs" value={fullNumber.format(batch.totalEggs)} />
              {canViewFinance ? (
                <DetailStat
                  label="Net profit"
                  value={formatCurrency(batch.netProfitability, currency)}
                  negative={batch.netProfitability < 0}
                />
              ) : (
                <DetailStat label="Live birds" value={fullNumber.format(batch.currentCount)} />
              )}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

function PageHeader({ count, canViewFinance }: { count: number; canViewFinance: boolean }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 px-1 pt-2 sm:flex-row sm:items-end">
      <div>
        <Link
          href="/dashboard"
          className={cn(
            'mb-4 inline-flex items-center gap-2 rounded-md text-sm text-fg-2 transition-colors duration-150 hover:text-fg',
            focusRing
          )}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Dashboard
        </Link>
        <h1 className="text-3xl font-medium leading-tight text-fg">Batch comparison</h1>
        <p className="mt-2 text-sm text-fg-2">
          {canViewFinance
            ? 'Profit, eggs, feed conversion and mortality, side by side'
            : 'Eggs, feed conversion and mortality, side by side'}
        </p>
      </div>
      <span className="font-mono text-xs tabular-nums text-fg-3">{plural(count, 'batch')} on this farm</span>
    </div>
  )
}

function Stat({
  label,
  value,
  negative = false,
  className,
}: {
  label: string
  value: string
  negative?: boolean
  className?: string
}) {
  return (
    <div className={cn(card, 'min-w-0 p-5', className)}>
      <p className="text-sm text-fg-2">{label}</p>
      <p
        className={cn(
          'mt-2 truncate text-2xl font-medium tabular-nums leading-none',
          negative ? 'text-neg-solid' : 'text-fg'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function LeaderFigure({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-sm text-fg-2">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-xl font-medium tabular-nums',
          negative ? 'text-neg-solid' : 'text-fg'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function DetailStat({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-2">{label}</dt>
      <dd
        className={cn(
          'mt-1 truncate text-base font-medium tabular-nums',
          negative ? 'text-neg-solid' : 'text-fg'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-fg/[0.08] px-6 text-center">
      <p className="text-base font-medium text-fg">No batches shown</p>
      <p className="mt-2 text-sm text-fg-2">Select a batch from the list, or show one you hid</p>
    </div>
  )
}

const tooltipBox = 'rounded-lg border border-fg/[0.08] bg-raised px-3 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.4)]'

function MetricTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className={tooltipBox}>
      <p className="text-fg-2">{payload[0]?.payload?.name ?? label}</p>
      <p className="mt-1 font-medium tabular-nums text-fg">{format(Number(payload[0]?.value || 0))}</p>
    </div>
  )
}

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  const currency = useCurrency()
  if (!active || !payload?.length) return null
  return (
    <div className={tooltipBox}>
      <p className="mb-2 text-fg-2">{label}</p>
      <div className="space-y-1">
        {payload.map((item: any) => (
          <p key={item.dataKey} className="flex items-center justify-between gap-4 text-fg">
            <span className="flex items-center gap-2 text-fg-2">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color || item.fill }} />
              {item.name ?? item.dataKey}
            </span>
            <span className="font-mono tabular-nums">{formatCurrency(Number(item.value || 0), currency)}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
