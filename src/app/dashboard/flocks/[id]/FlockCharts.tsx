'use client'

import React from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Banknote, ChevronRight, Egg, Skull, TrendingUp } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

const chartText = '#94a3b8'
const gridStroke = 'rgba(255,255,255,0.07)'
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const fullNumber = new Intl.NumberFormat('en-US')

type FinancePoint = { label: string; revenue: number; expenses: number; profit: number }
type EggPoint = { label: string; eggs: number }
type MortalityPoint = { label: string; deaths: number; rate: number }
type SalesPoint = { label: string; revenue: number; units: number }

export function ChartCard({
  title,
  icon: Icon,
  iconClass,
  right,
  children,
}: {
  title: string
  icon: React.ElementType
  iconClass?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="glass-morphism overflow-hidden rounded-lg shadow-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-6 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase italic tracking-normal text-white">
          <Icon className={cn('h-4 w-4', iconClass)} />
          {title}
        </h3>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 text-center">
      <p className="px-6 text-xs font-bold uppercase italic tracking-widest text-white/50">{label}</p>
    </div>
  )
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur-md">
      <p className="mb-1 font-bold text-white">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} style={{ color: item.color || item.stroke }} className="font-bold">
          {item.name}: {formatCurrency(Number(item.value || 0), 'GHS')}
        </p>
      ))}
    </div>
  )
}

export function FinanceTrendPanel({ data, locked }: { data: FinancePoint[]; locked?: boolean }) {
  return (
    <ChartCard
      title="Expenses vs Revenue"
      icon={Banknote}
      iconClass="text-sky-400"
      right={
        <span className="hidden text-[10px] font-bold uppercase tracking-widest text-white/40 sm:block">
          Monthly · Net profit overlay
        </span>
      }
    >
      {locked ? (
        <ChartEmpty label="Finance permission is required to view revenue & expenses." />
      ) : data.length > 0 ? (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 6 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `₵${compact.format(Number(v))}`}
              />
              <Tooltip content={<MoneyTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Legend wrapperStyle={{ color: chartText, fontSize: 12, fontWeight: 700, paddingTop: 8 }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#38bdf8" strokeWidth={2} fill="url(#revFill)" />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#fb923c" strokeWidth={2} fill="url(#expFill)" />
              <Line
                type="monotone"
                dataKey="profit"
                name="Net Profit"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ r: 3, fill: '#0f172a', stroke: '#34d399', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty label="No revenue or expense activity recorded yet." />
      )}
    </ChartCard>
  )
}

export function EggTrendPanel({ data }: { data: EggPoint[] }) {
  const total = data.reduce((s, d) => s + d.eggs, 0)
  return (
    <ChartCard
      title="Egg Production Trend"
      icon={Egg}
      iconClass="text-amber-300"
      right={
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {fullNumber.format(total)} eggs
        </span>
      }
    >
      {data.length > 0 ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 6 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => compact.format(Number(v))}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                contentStyle={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#fff', fontWeight: 700 }}
                formatter={(value: any) => [`${fullNumber.format(Number(value))} eggs`, 'Collected']}
              />
              <Line
                type="monotone"
                dataKey="eggs"
                stroke="#fbbf24"
                strokeWidth={3}
                dot={{ r: 3, fill: '#0f172a', stroke: '#fbbf24', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty label="No egg production logged yet." />
      )}
    </ChartCard>
  )
}

export function MortalityTrendPanel({ data }: { data: MortalityPoint[] }) {
  return (
    <ChartCard
      title="Mortality Rate Trend"
      icon={Skull}
      iconClass="text-red-400"
      right={
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Deaths · Cumulative %</span>
      }
    >
      {data.length > 0 ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 6 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#fff', fontWeight: 700 }}
              />
              <Bar yAxisId="left" dataKey="deaths" name="Deaths" fill="#ef4444" radius={[5, 5, 0, 0]} barSize={24} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rate"
                name="Cumulative %"
                stroke="#fb7185"
                strokeWidth={3}
                dot={{ r: 3, fill: '#0f172a', stroke: '#fb7185', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty label="No mortality recorded — flock is healthy." />
      )}
    </ChartCard>
  )
}

export function SalesTrendPanel({ data }: { data: SalesPoint[] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0)
  return (
    <ChartCard
      title="Sales Rate"
      icon={TrendingUp}
      iconClass="text-emerald-400"
      right={
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {formatCurrency(total, 'GHS')}
        </span>
      }
    >
      {data.length > 0 ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 6 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: chartText, fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `₵${compact.format(Number(v))}`}
              />
              <Tooltip content={<MoneyTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#34d399" strokeWidth={3} fill="url(#salesFill)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty label="No sales recorded for this batch yet." />
      )}
    </ChartCard>
  )
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: 'emerald' | 'amber' | 'red' | 'blue' | 'sky' | 'orange'
  subtext?: string
}) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  }

  return (
    <div className="group relative flex h-36 flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-md transition-all duration-500 hover:bg-white/[0.08]">
      <div className="flex items-start justify-between">
        <div className={cn('rounded-md border p-2', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-white/10 transition-all group-hover:translate-x-1 group-hover:text-white/40" />
      </div>
      <div>
        <h3 className="truncate text-2xl font-bold tracking-normal text-white">{value}</h3>
        <p className="mt-1 flex items-center justify-between gap-2 text-[9px] font-bold uppercase italic tracking-widest text-white/70">
          <span className="truncate">{title}</span>
          {subtext ? <span className="shrink-0 text-[8px] opacity-70">{subtext}</span> : null}
        </p>
      </div>
    </div>
  )
}
