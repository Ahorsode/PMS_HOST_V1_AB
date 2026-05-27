'use client'

import React, { useState } from 'react'
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Egg, 
  Wheat, 
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  User,
  Activity,
  CheckCircle,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ComprehensiveReport } from '@/lib/actions/reports'

export function ReportsClient({
  initialReport,
  onDateChange
}: {
  initialReport: ComprehensiveReport
  onDateChange: (start: string, end: string) => Promise<ComprehensiveReport | null>
}) {
  const [report, setReport] = useState<ComprehensiveReport>(initialReport)
  const [loading, setLoading] = useState(false)

  // Date Range states
  const [startDate, setStartDate] = useState(
    new Date(initialReport.startDate).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date(initialReport.endDate).toISOString().split('T')[0]
  )

  // Handle preset clicks
  const applyPreset = async (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)

    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    setStartDate(startStr)
    setEndDate(endStr)
    await handleFetch(startStr, endStr)
  }

  const applyThisMonth = async () => {
    const end = new Date()
    const start = new Date(end.getFullYear(), end.getMonth(), 1)

    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    setStartDate(startStr)
    setEndDate(endStr)
    await handleFetch(startStr, endStr)
  }

  const handleFetch = async (sDate = startDate, eDate = endDate) => {
    if (loading) return
    setLoading(true)
    try {
      const newReport = await onDateChange(sDate, eDate)
      if (newReport) {
        setReport(newReport)
      }
    } finally {
      setLoading(false)
    }
  }

  const triggerPdfDownload = () => {
    const url = `/api/reports/pdf?startDate=${startDate}&endDate=${endDate}`
    window.open(url, '_blank')
  }

  const triggerCsvDownload = () => {
    // Generate CSV for KPIs, Financials, and Audit Logs
    const rows = [
      ['GAAP Financial KPI Summary', '', ''],
      ['KPI Name', 'Value', ''],
      ['Total Revenue', `GH₵ ${report.kpis.totalRevenue.toFixed(2)}`, ''],
      ['Total Expense', `GH₵ ${report.kpis.totalExpense.toFixed(2)}`, ''],
      ['Net Income', `GH₵ ${report.kpis.netIncome.toFixed(2)}`, ''],
      ['Total Feed Consumed', `${report.kpis.totalFeedConsumed} kg`, ''],
      ['Total Eggs Collected', `${report.kpis.totalEggsCollected} eggs`, ''],
      ['Total Mortality', `${report.kpis.totalMortality} birds`, ''],
      ['Mortality Rate', `${report.kpis.mortalityRate.toFixed(2)}%`, ''],
      ['Average Feed Conversion Ratio (FCR)', `${report.kpis.averageFcr.toFixed(2)}`, ''],
      [],
      ['Consolidated Ledger Statements', '', '', '', '', '', '', ''],
      ['Transaction', 'Date', 'Type', 'Category', 'Amount (GHS)', 'Payment Status', 'Payment Method', 'Reference', 'Description'],
      ...report.financials.map((f, index) => [
        `Transaction ${index + 1}`,
        new Date(f.transactionDate).toLocaleDateString(),
        f.type,
        f.category,
        f.amount.toString(),
        f.paymentStatus,
        f.paymentMethod,
        f.referenceNum || '',
        f.description || ''
      ]),
      [],
      ['Operational & Deletion Audit Logs', '', '', '', ''],
      ['Log', 'Timestamp', 'Action Type', 'Description', 'Logged By'],
      ...report.auditTimeline.map((l, index) => [
        `Log ${index + 1}`,
        new Date(l.createdAt).toLocaleString(),
        l.actionType || '',
        l.description || '',
        l.userName
      ])
    ]

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `farm_intelligence_report_${startDate}_to_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper to draw clean SVG charts for trends
  const renderTrendChart = () => {
    const trends = report.dailyTrends
    if (trends.length < 2) {
      return (
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs italic font-bold uppercase tracking-wider">
          Insufficient data points to plot trend line.
        </div>
      )
    }

    const maxVal = Math.max(
      ...trends.map(t => Math.max(t.revenue, t.expense, 100))
    )

    const width = 600
    const height = 180
    const padding = 20

    const pointsRevenue = trends.map((t, idx) => {
      const x = padding + (idx / (trends.length - 1)) * (width - padding * 2)
      const y = height - padding - (t.revenue / maxVal) * (height - padding * 2)
      return `${x},${y}`
    }).join(' ')

    const pointsExpense = trends.map((t, idx) => {
      const x = padding + (idx / (trends.length - 1)) * (width - padding * 2)
      const y = height - padding - (t.expense / maxVal) * (height - padding * 2)
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grids */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ffffff10" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#ffffff05" strokeWidth="1" />

          {/* Revenue Line */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsRevenue}
          />

          {/* Expense Line */}
          <polyline
            fill="none"
            stroke="#f43f5e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsExpense}
          />

          {/* Dots */}
          {trends.map((t, idx) => {
            const x = padding + (idx / (trends.length - 1)) * (width - padding * 2)
            const yRev = height - padding - (t.revenue / maxVal) * (height - padding * 2)
            const yExp = height - padding - (t.expense / maxVal) * (height - padding * 2)
            return (
              <g key={idx} className="group cursor-pointer">
                <circle cx={x} cy={yRev} r="4" className="fill-emerald-400 hover:r-6 transition-all" />
                <circle cx={x} cy={yExp} r="4" className="fill-rose-400 hover:r-6 transition-all" />
              </g>
            )
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 mt-2">
          <span>{new Date(trends[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span>{new Date(trends[trends.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Intelligence <span className="text-emerald-400">Reports</span>
          </h1>
          <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase mt-1">
            GAAP Analytics & Consolidated Performance
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={triggerCsvDownload}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-blue-600/20 flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </Button>
          <Button 
            onClick={triggerPdfDownload}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
          >
            <Download className="w-5 h-5" />
            Export PDF Report
          </Button>
        </div>
      </div>

      {/* Date Range Pre-sets & Filter Pane */}
      <Card className="bg-[#1e1e1e]/60 border-white/10 backdrop-blur-xl">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={() => applyPreset(7)}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset(30)}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last 30 Days
            </button>
            <button
              onClick={applyThisMonth}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              This Month
            </button>
          </div>

          {/* Custom Datepicker inputs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-4 h-4 text-emerald-400" />
                From:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <Button
              onClick={() => handleFetch()}
              isLoading={loading}
              loadingText="Aggregating..."
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-lg w-full sm:w-auto"
            >
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards Layer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Net Income */}
        <Card className="bg-[#1e1e1e]/80 border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-black ${report.kpis.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              GH₵ {report.kpis.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Conolidated Ledger Profit</p>
          </CardContent>
        </Card>

        {/* FCR */}
        <Card className="bg-[#1e1e1e]/80 border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Wheat className="w-3.5 h-3.5 text-amber-400" />
              Feed Conversion Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">
              {report.kpis.averageFcr.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Avg feed weight conversion</p>
          </CardContent>
        </Card>

        {/* Egg Yield */}
        <Card className="bg-[#1e1e1e]/80 border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Egg className="w-3.5 h-3.5 text-blue-400" />
              Egg Yield
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-white">
              {report.kpis.totalEggsCollected.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Total collected eggs</p>
          </CardContent>
        </Card>

        {/* Mortality % */}
        <Card className="bg-[#1e1e1e]/80 border-white/10 backdrop-blur-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Mortality Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-black ${report.kpis.mortalityRate < 5 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {report.kpis.mortalityRate.toFixed(2)}%
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
              {report.kpis.totalMortality} Death{report.kpis.totalMortality === 1 ? '' : 's'} logged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Charts & Split Categories Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart Panel */}
        <Card className="bg-[#1a1a1a]/80 border-white/10 backdrop-blur-xl lg:col-span-2">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-md font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Ledger Inflow / Outflow Trends
              </CardTitle>
              <div className="flex gap-3 text-[10px] font-bold uppercase">
                <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" /> Revenue</span>
                <span className="flex items-center gap-1 text-rose-400"><span className="w-2.5 h-2.5 bg-rose-400 rounded-full" /> Expenses</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {renderTrendChart()}
          </CardContent>
        </Card>

        {/* Categories Breakdown */}
        <Card className="bg-[#1a1a1a]/80 border-white/10 backdrop-blur-xl">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle className="text-white text-md font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Chart of Accounts Split
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 max-h-[220px] overflow-y-auto custom-scrollbar">
            {Object.keys(report.revenueByCategory).length === 0 && Object.keys(report.expenseByCategory).length === 0 ? (
              <p className="text-slate-400 text-xs italic font-bold uppercase tracking-widest text-center py-8">No category data logged.</p>
            ) : (
              <>
                {/* Revenue categories list */}
                {Object.entries(report.revenueByCategory).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold truncate max-w-[150px]">{cat}</span>
                    <span className="text-emerald-400 font-black">GH₵ {val.toLocaleString()}</span>
                  </div>
                ))}

                {/* Expenses categories list */}
                {Object.entries(report.expenseByCategory).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold truncate max-w-[150px]">{cat}</span>
                    <span className="text-rose-400 font-black">GH₵ {val.toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline Audit Logs */}
      <Card className="bg-[#1a1a1a]/80 border-white/10 backdrop-blur-xl">
        <CardHeader className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
          <CardTitle className="text-white text-md font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Operational & Deletion Audit Logs (What, When, Who)
          </CardTitle>
          <span className="text-xs text-slate-400 font-bold bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 uppercase">
            {report.auditTimeline.length} entries
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar">
            {report.auditTimeline.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic font-bold uppercase tracking-wider">
                No system activity or operational logs found for this date range.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5">
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-6 text-right">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {report.auditTimeline.map((log) => {
                    const isDeletion = log.actionType?.includes('DELET') || log.actionType?.includes('FAIL')
                    return (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 text-white text-xs font-mono">
                          {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="py-4 px-4 text-xs font-black">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                            isDeletion 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {log.actionType?.replace(/_/g, ' ') || 'SYSTEM LOG'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-300 max-w-[350px] leading-relaxed">
                          {log.description}
                        </td>
                        <td className="py-4 px-6 text-right text-xs text-slate-400 font-bold uppercase">
                          <span className="inline-flex items-center gap-1.5 justify-end">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {log.userName}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
