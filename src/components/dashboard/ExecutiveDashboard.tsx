'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  AlertTriangle,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react'

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
}

export function ExecutiveDashboard({ stats }: ExecutiveDashboardProps) {
  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Executive Summary</h1>
          <p className="text-slate-400 mt-1">Global performance and financial health metrics</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Operational Mode: Healthy</span>
          </div>
        </div>
      </div>

      {/* Financial Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Net Projected Profit" 
          value={`GHS ${stats.totalProfit.toLocaleString()}`}
          trend={stats.profitTrend}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          description="EBITDA matching current cycle performance"
        />
        <MetricCard 
          title="Global efficiency (FCR)" 
          value={stats.globalFcr.toFixed(2)}
          trend={-2.4} // Negative is good for FCR
          isNegativeTrendBetter
          icon={<Activity className="w-5 h-5 text-blue-400" />}
          description="Average feed conversion across all active batches"
        />
        <MetricCard 
          title="Total Outstanding Debt" 
          value={`GHS ${stats.totalDebt.toLocaleString()}`}
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          description={`Suppliers: ${stats.supplierDebt.toLocaleString()} | Customers: ${stats.customerDebt.toLocaleString()}`}
        />
        <MetricCard 
          title="Live Asset Value" 
          value={`${stats.activeLivestock.toLocaleString()} units`}
          icon={<Users className="w-5 h-5 text-amber-400" />}
          description="Total active livestock across all houses"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Strategic Alerts */}
        <Card className="lg:col-span-1 bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Strategic Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PriorityItem 
              title="Supplier Payment Due" 
              detail="Debt to TopFeeds GHS 12,500 due in 3 days" 
              type="finance"
            />
            <PriorityItem 
              title="Inventory Shortfall" 
              detail="Phase 2 Grower Feed below 48-hour reserve" 
              type="stock"
            />
            <PriorityItem 
              title="Batch Optimization" 
              detail="Batch #2401 FCR 1.85 (Target 1.70)" 
              type="performance"
            />
          </CardContent>
        </Card>

        {/* Multi-Batch Comparison Context placeholder or other high level charts */}
        <Card className="lg:col-span-2 bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Revenue Velocity
            </CardTitle>
            <CardDescription>Daily revenue generation against cycle targets</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center border-t border-white/5">
             <p className="text-slate-500 text-sm italic italic">Integration with Batch Performance Analytics Complete. Access via Analytics Hub.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, trend, icon, description, isNegativeTrendBetter }: any) {
  const isPositive = trend > 0
  const isGood = isNegativeTrendBetter ? !isPositive : isPositive

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all border-l-4 border-l-emerald-500/50">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-bold ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-4 min-w-0">
          <p className="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-xl md:text-2xl font-bold text-white mt-1 tabular-nums tracking-tight truncate">{value}</h3>
          <p className="text-slate-500 text-[10px] mt-2 leading-relaxed truncate">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityItem({ title, detail, type }: any) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex gap-3 items-start group hover:bg-white/10 transition-colors">
      <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
        type === 'finance' ? 'bg-rose-500' : type === 'stock' ? 'bg-amber-500' : 'bg-blue-500'
      }`} />
      <div>
        <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
