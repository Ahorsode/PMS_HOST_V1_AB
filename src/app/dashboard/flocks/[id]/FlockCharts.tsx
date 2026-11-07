'use client'

import React, { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { Panel, PanelHeader, tone } from '../flock-ui'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const tick = { fill: '#85858b', fontSize: 11, fontFamily: MONO }
const gridStroke = 'rgba(255,255,255,0.06)'
const cursorFill = { fill: 'rgba(255,255,255,0.03)' }
const cursorLine = { stroke: 'rgba(255,255,255,0.12)' }
const ACCENT = '#34d399'
const NEGATIVE = '#e5484d'
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const fullNumber = new Intl.NumberFormat('en-US')
const cedi = (v: number) => `₵${compact.format(Number(v))}`

/** True below the sm breakpoint, so category labels can tilt instead of overlapping. */
function useIsNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return narrow
}

type FinancePoint = {
  label: string
  revenue: number
  initial: number
  operating: number
  consumption: number
  general: number
  expenses: number
  profit: number
}
type FinanceSummaryPoint = { label: string; key: string; amount: number }
type EggPoint = { label: string; eggs: number }
type MortalityPoint = { label: string; deaths: number; rate: number }
type SalesPoint = { label: string; revenue: number; units: number }

export function ChartCard({
  title,
  right,
  children,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Panel>
      <PanelHeader title={title} right={right} />
      <div className="p-5">{children}</div>
    </Panel>
  )
}

function HeaderMeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-xs', tone.muted, className)}>{children}</span>
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-white/[0.08] px-6 text-center">
      <p className={cn('text-[13px]', tone.text2)}>{label}</p>
    </div>
  )
}

function TooltipBox({ label, rows }: { label: React.ReactNode; rows: { key: string; name: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#232325] px-3 py-2 text-xs">
      <p className={cn('mb-1 font-medium', tone.text)}>{label}</p>
      {rows.map((row) => (
        <p key={row.key} className={cn('flex items-center gap-2', tone.text2)}>
          {row.color ? <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} /> : null}
          {row.name}
          <span className={cn('ml-auto pl-4 tabular-nums', tone.text)}>{row.value}</span>
        </p>
      ))}
    </div>
  )
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <TooltipBox
      label={label}
      rows={payload.map((item: any) => ({
        key: String(item.dataKey),
        name: item.payload?.name && payload.length === 1 ? item.payload.name : item.name,
        value: formatCurrency(Number(item.value || 0), 'GHS'),
        color: item.color || item.payload?.fill || item.stroke,
      }))}
    />
  )
}

function summaryAmount(summary: FinanceSummaryPoint[], key: string) {
  return summary.find((r) => r.key === key)?.amount ?? 0
}

/**
 * Fixed category order — must match batch-finance financeSummary keys.
 * Revenue leads in the accent; the cost types are graded neutrals.
 */
const LIFETIME_CATEGORIES = [
  { key: 'initial', shortLabel: 'Initial', fill: '#a1a1a6', name: 'Initial (batch only)' },
  { key: 'consumption', shortLabel: 'Feed & med', fill: '#7c7c82', name: 'Feed & med (by usage)' },
  { key: 'operating', shortLabel: 'Operating', fill: '#606066', name: 'Operating' },
  { key: 'general', shortLabel: 'General', fill: '#48484d', name: 'General share' },
  { key: 'revenue', shortLabel: 'Revenue', fill: ACCENT, name: 'Revenue' },
] as const

function categoryFill(key: string) {
  return LIFETIME_CATEGORIES.find((c) => c.key === key)?.fill ?? '#7c7c82'
}

function buildLifetimeBars(summary: FinanceSummaryPoint[]) {
  return LIFETIME_CATEGORIES.map((category) => {
    const amount = summaryAmount(summary, category.key)
    return {
      key: category.key,
      label: category.shortLabel,
      fill: category.fill,
      name: category.name,
      amount,
      // Log scale cannot plot 0 — use null so the slot stays on the axis without breaking scale.
      chartAmount: amount > 0 ? amount : null,
    }
  })
}

/** Totals per category; doubles as the legend for both finance charts. */
function CategoryTotals({ summary }: { summary: FinanceSummaryPoint[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
      {LIFETIME_CATEGORIES.map((category) => {
        const amount = summaryAmount(summary, category.key)
        return (
          <div key={category.key} className={cn('min-w-0', amount <= 0 && 'opacity-50')}>
            <dt className={cn('flex items-center gap-2 text-xs', tone.text2)}>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: category.fill }} />
              {category.key === 'general' ? 'General share' : category.shortLabel}
            </dt>
            <dd
              className={cn(
                'mt-1 truncate text-sm tabular-nums',
                category.key === 'revenue' ? tone.accent : tone.text
              )}
            >
              {formatCurrency(amount, 'GHS')}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className={cn('text-[13px]', tone.text2)}>{children}</p>
}

export function FinanceTrendPanel({
  summary,
  monthly,
  locked,
}: {
  summary: FinanceSummaryPoint[]
  monthly: FinancePoint[]
  locked?: boolean
}) {
  const netProfit = summary.reduce((sum, row) => {
    if (row.key === 'revenue') return sum + row.amount
    return sum - row.amount
  }, 0)

  const lifetimeBars = buildLifetimeBars(summary)
  const positiveAmounts = lifetimeBars.map((row) => row.amount).filter((amount) => amount > 0)
  const useLogScale =
    positiveAmounts.length >= 2 &&
    Math.max(...positiveAmounts) / Math.min(...positiveAmounts) >= 25
  const hasAnyActivity = positiveAmounts.length > 0 || monthly.length > 0
  const narrow = useIsNarrow()

  return (
    <ChartCard title="Revenue and expenses" right={<HeaderMeta className="hidden sm:block">Lifetime and by month</HeaderMeta>}>
      {locked ? (
        <ChartEmpty label="You need finance access to see revenue and expenses" />
      ) : hasAnyActivity || summary.length > 0 ? (
        <div className="space-y-8">
          <CategoryTotals summary={summary} />

          <div>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <SubLabel>Lifetime cost structure</SubLabel>
              {useLogScale ? <HeaderMeta>Log scale, so smaller costs stay visible</HeaderMeta> : null}
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifetimeBars} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={tick}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tickMargin={8}
                    angle={narrow ? -35 : 0}
                    textAnchor={narrow ? 'end' : 'middle'}
                    height={narrow ? 56 : 30}
                  />
                  <YAxis
                    scale={useLogScale ? 'log' : 'auto'}
                    domain={
                      useLogScale
                        ? [Math.max(1, Math.min(...positiveAmounts) * 0.5), 'auto']
                        : [0, 'auto']
                    }
                    tick={tick}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={cedi}
                    allowDataOverflow
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.[0]) return null
                      const row = payload[0].payload as (typeof lifetimeBars)[number]
                      return (
                        <TooltipBox
                          label={label}
                          rows={[{ key: row.key, name: row.name, value: formatCurrency(row.amount, 'GHS'), color: row.fill }]}
                        />
                      )
                    }}
                    cursor={cursorFill}
                  />
                  <Bar
                    dataKey={useLogScale ? 'chartAmount' : 'amount'}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    minPointSize={4}
                    isAnimationActive={false}
                  >
                    {lifetimeBars.map((row) => (
                      <Cell key={row.key} fill={row.fill} fillOpacity={row.amount > 0 ? 1 : 0.3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn('flex flex-wrap items-baseline justify-between gap-2 border-t pt-5', tone.hairline)}>
            <SubLabel>Net position</SubLabel>
            <span className={cn('text-xl tabular-nums', netProfit >= 0 ? tone.accent : tone.negative)}>
              {formatCurrency(netProfit, 'GHS')}
            </span>
          </div>

          {monthly.length > 0 ? (
            <div>
              <div className="mb-4">
                <SubLabel>Monthly activity</SubLabel>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} tickMargin={8} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} width={48} tickFormatter={cedi} />
                    <Tooltip content={<MoneyTooltip />} cursor={cursorFill} />
                    <Legend
                      iconType="square"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                      formatter={(value) => <span style={{ color: '#a1a1a6' }}>{value}</span>}
                    />
                    <Bar dataKey="revenue" fill={ACCENT} name="Revenue" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                    <Bar dataKey="initial" stackId="monthlyExp" fill={categoryFill('initial')} name="Initial" maxBarSize={20} isAnimationActive={false} />
                    <Bar dataKey="operating" stackId="monthlyExp" fill={categoryFill('operating')} name="Operating" maxBarSize={20} isAnimationActive={false} />
                    <Bar dataKey="consumption" stackId="monthlyExp" fill={categoryFill('consumption')} name="Feed & med (by usage)" maxBarSize={20} isAnimationActive={false} />
                    <Bar dataKey="general" stackId="monthlyExp" fill={categoryFill('general')} name="General share" radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <ChartEmpty label="No revenue or expenses recorded yet" />
      )}
    </ChartCard>
  )
}

export function EggTrendPanel({ data, eggsPerCrate = 30 }: { data: EggPoint[]; eggsPerCrate?: number }) {
  const total = data.reduce((s, d) => s + d.eggs, 0)
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30
  const crates = Math.floor(total / epc)
  const rem = total % epc
  const totalLabel = rem > 0
    ? `${fullNumber.format(crates)} ${crates === 1 ? 'crate' : 'crates'} and ${rem} eggs`
    : `${fullNumber.format(crates)} ${crates === 1 ? 'crate' : 'crates'}`
  return (
    <ChartCard title="Egg production" right={<HeaderMeta className="tabular-nums">{totalLabel}</HeaderMeta>}>
      {data.length > 0 ? (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} tickMargin={8} minTickGap={16} />
              <YAxis
                tick={tick}
                axisLine={false}
                tickLine={false}
                width={44}
                // A laying flock moves within a narrow band; start near the lowest day so the trend reads.
                domain={[(min: number) => Math.max(0, Math.floor((min * 0.9) / 10) * 10), 'auto']}
                tickFormatter={(v) => compact.format(Number(v))}
              />
              <Tooltip
                cursor={cursorLine}
                content={({ active, payload, label }) =>
                  active && payload?.[0] ? (
                    <TooltipBox
                      label={label}
                      rows={[{ key: 'eggs', name: 'Collected', value: `${fullNumber.format(Number(payload[0].value))} eggs`, color: ACCENT }]}
                    />
                  ) : null
                }
              />
              <Line
                type="monotone"
                dataKey="eggs"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: ACCENT, stroke: '#19191b', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty label="No egg production logged yet" />
      )}
    </ChartCard>
  )
}

export function MortalityTrendPanel({ data }: { data: MortalityPoint[] }) {
  return (
    <ChartCard
      title="Mortality"
      right={
        <span className="flex items-center gap-3 text-xs">
          <span className={cn('flex items-center gap-1.5', tone.text2)}>
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: NEGATIVE }} /> Deaths
          </span>
          <span className={cn('flex items-center gap-1.5', tone.text2)}>
            <span className="h-px w-3 bg-[#a1a1a6]" /> Cumulative %
          </span>
        </span>
      }
    >
      {data.length > 0 ? (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} tickMargin={8} minTickGap={16} />
              <YAxis yAxisId="left" tick={tick} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={tick}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                cursor={cursorFill}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      label={label}
                      rows={payload.map((item: any) => ({
                        key: String(item.dataKey),
                        name: item.name,
                        value: item.dataKey === 'rate' ? `${Number(item.value).toFixed(2)}%` : fullNumber.format(Number(item.value)),
                        color: item.dataKey === 'rate' ? '#a1a1a6' : NEGATIVE,
                      }))}
                    />
                  ) : null
                }
              />
              <Bar yAxisId="left" dataKey="deaths" name="Deaths" fill={NEGATIVE} fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={16} isAnimationActive={false} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rate"
                name="Cumulative %"
                stroke="#a1a1a6"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: '#a1a1a6', stroke: '#19191b', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty label="No deaths recorded" />
      )}
    </ChartCard>
  )
}

export function SalesTrendPanel({ data }: { data: SalesPoint[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0)
  return (
    <ChartCard title="Sales" right={<HeaderMeta className="tabular-nums">{formatCurrency(total, 'GHS')}</HeaderMeta>}>
      {data.length > 0 ? (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridStroke} vertical={false} />
              <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} tickMargin={8} minTickGap={16} />
              <YAxis tick={tick} axisLine={false} tickLine={false} width={48} tickFormatter={cedi} />
              <Tooltip content={<MoneyTooltip />} cursor={cursorLine} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: ACCENT, stroke: '#19191b', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty label="No sales recorded for this batch yet" />
      )}
    </ChartCard>
  )
}
