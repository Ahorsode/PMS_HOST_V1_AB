'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area
} from 'recharts'
import { format } from 'date-fns'

interface BatchData {
  id: number
  batchName: string
  arrivalDate: string
  fcr: number
  mortalityRate: number
  productionIndex: number
}

interface BatchComparisonProps {
  batches: BatchData[]
}

export function BatchComparison({ batches }: BatchComparisonProps) {
  const [selectedMetric, setSelectedMetric] = useState<'fcr' | 'mortalityRate' | 'productionIndex'>('productionIndex')

  const metricLabels = {
    fcr: 'Feed Conversion Ratio (FCR)',
    mortalityRate: 'Mortality Rate (%)',
    productionIndex: 'Production Index (EPEF)'
  }

  const chartData = batches.map(batch => ({
    name: batch.batchName,
    value: batch[selectedMetric],
    date: format(new Date(batch.arrivalDate), 'MMM yyyy')
  }))

  return (
    <Card className="w-full bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              Batch Performance Intelligence
            </CardTitle>
            <CardDescription className="text-slate-400">
              Side-by-side comparison of historical and active batch metrics
            </CardDescription>
          </div>
          <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg border border-white/10">
            {Object.keys(metricLabels).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedMetric(key as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedMetric === key
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {key === 'fcr' ? 'FCR' : key === 'mortalityRate' ? 'Mortality' : 'Performance'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                interval={0}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => selectedMetric === 'mortalityRate' ? `${value}%` : value}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff' 
                }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar 
                dataKey="value" 
                fill="url(#colorValue)" 
                radius={[6, 6, 0, 0]}
                barSize={40}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {batches.map((batch) => (
            <div key={batch.id} className="p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-emerald-500/30 transition-all group">
              <h4 className="text-slate-300 font-semibold mb-2 group-hover:text-emerald-400 transition-colors">
                {batch.batchName}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">FCR</span>
                  <span className="text-white font-mono">{batch.fcr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Mortality</span>
                  <span className="text-rose-400 font-mono">{batch.mortalityRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">EPEF</span>
                  <span className="text-amber-400 font-mono">{batch.productionIndex}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
