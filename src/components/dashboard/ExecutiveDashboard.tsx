'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { RevenueVelocityPoint, StrategicPriority } from '@/lib/analytics/executive-metrics'

interface ExecutiveDashboardProps {
  stats: {
    totalProfit: number
    profitTrend: number
    globalFcr: number
    totalDebt: number
    activeLivestock: number
    mortalityRate: number
    supplierDebt: number
    customerDebt: number
  }
  strategicPriorities?: StrategicPriority[]
  revenueVelocityData?: RevenueVelocityPoint[]
  currency?: string
}

function formatChartDate(date: string) {
  if (!date) return ''
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function ExecutiveDashboard({
  stats,
  strategicPriorities = [],
  revenueVelocityData = [],
  currency = 'GHS',
}: ExecutiveDashboardProps) {
  const hasRevenueData = revenueVelocityData.some((point) => point.revenue > 0 || point.target > 0)
  const displayPriorities =
    strategicPriorities.length > 0
      ? strategicPriorities
      : [
          {
            title: 'Nothing urgent',
            detail: 'No supplier, stock or performance issues right now',
            type: 'performance' as const,
          },
        ]

  return (
    <div className="space-y-6 pb-12">
      <header className="px-1">
        <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Farm summary</h1>
        <p className="mt-2 text-sm text-[#a1a1a6]">Profit, feed conversion, debts and head count across the farm</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Net profit, last 7 days"
          value={formatCurrency(stats.totalProfit, currency)}
          trend={stats.profitTrend}
          description="Revenue minus operating expenses"
        />
        <MetricCard
          title="Feed conversion (FCR)"
          value={stats.globalFcr > 0 ? stats.globalFcr.toFixed(2) : '–'}
          description="Average across active batches"
        />
        <MetricCard
          title="Outstanding debt"
          value={formatCurrency(stats.totalDebt, currency)}
          description={`Suppliers ${formatCurrency(stats.supplierDebt, currency)} · customers ${formatCurrency(stats.customerDebt, currency)}`}
        />
        <MetricCard
          title="Live animals"
          value={stats.activeLivestock.toLocaleString()}
          description="Across all houses"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-lg">Priorities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {displayPriorities.map((priority) => (
              <PriorityItem
                key={`${priority.title}-${priority.detail}`}
                title={priority.title}
                detail={
                  priority.type === 'finance'
                    ? priority.detail.replace(
                        /([\d,]+\.\d{2})/,
                        (amount) => formatCurrency(Number(amount.replace(/,/g, '')), currency)
                      )
                    : priority.detail
                }
                type={priority.type}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-lg">Daily revenue</CardTitle>
            <CardDescription className="mt-1">Against the recent cycle average</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-5">
            {hasRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueVelocityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(237,237,237,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fill: '#85858b', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#85858b', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    tickFormatter={(value) => formatCurrency(Number(value), currency)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(237,237,237,0.04)' }}
                    contentStyle={{
                      background: '#232325',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      color: '#ededed',
                      fontSize: 12,
                    }}
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value, name) => [
                      formatCurrency(Number(value ?? 0), currency),
                      name === 'target' ? 'Cycle average' : 'Revenue',
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={400} />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#85858b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="target"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-[#a1a1a6]">No sales or orders in the last 7 days</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, trend, description, isNegativeTrendBetter }: any) {
  const isPositive = trend > 0
  const isGood = isNegativeTrendBetter ? !isPositive : isPositive

  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
      <p className="truncate text-sm text-[#a1a1a6]">{title}</p>
      <p className="mt-2 truncate text-2xl font-medium leading-none tabular-nums text-[#ededed]">{value}</p>
      {typeof trend === 'number' && (
        <p className={`mt-2 text-xs tabular-nums ${isGood ? 'text-[#4cc38a]' : 'text-[#f2777b]'}`}>
          {isPositive ? '+' : '−'}{Math.abs(trend).toFixed(1)}% revenue vs the previous period
        </p>
      )}
      <p className="mt-2 truncate font-mono text-xs text-[#85858b]">{description}</p>
    </div>
  )
}

function PriorityItem({ title, detail, type }: { title: string; detail: string; type: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2">
      <div
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          type === 'finance' ? 'bg-[#e5484d]' : type === 'stock' ? 'bg-[#d9a441]' : 'bg-[#85858b]'
        }`}
      />
      <div>
        <p className="text-sm text-[#ededed]">{title}</p>
        <p className="mt-0.5 text-xs text-[#a1a1a6]">{detail}</p>
      </div>
    </div>
  )
}
