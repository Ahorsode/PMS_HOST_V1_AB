'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, 
  Legend, ResponsiveContainer,
  Cell, LineChart, Line, AreaChart, Area, ReferenceLine
} from 'recharts'
import { format } from 'date-fns'
import { Check, Info, TrendingUp, AlertTriangle, Trophy, Target, Eye, EyeOff, Sparkles } from 'lucide-react'

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
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>(
    batches.slice(0, 3).map(b => b.id)
  )
  const [showBenchmark, setShowBenchmark] = useState(true)
  const [hiddenBatches, setHiddenBatches] = useState<number[]>([])

  const metricLabels = {
    fcr: 'Feed Conversion Ratio (FCR)',
    mortalityRate: 'Mortality Rate (%)',
    productionIndex: 'Production Index (EPEF)'
  }

  const benchmarks = {
    fcr: 1.6,
    mortalityRate: 3.5,
    productionIndex: 380
  }

  const toggleBatch = (id: number) => {
    setSelectedBatchIds(prev => 
      prev.includes(id) 
        ? prev.filter(bid => bid !== id) 
        : [...prev, id]
    )
  }

  const toggleVisibility = (id: number) => {
    setHiddenBatches(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    )
  }

  const filteredData = useMemo(() => {
    return batches
      .filter(b => selectedBatchIds.includes(b.id) && !hiddenBatches.includes(b.id))
      .map(batch => ({
        name: batch.batchName,
        value: batch[selectedMetric],
        full: batch,
        date: format(new Date(batch.arrivalDate), 'MMM d, yyyy')
      }))
  }, [batches, selectedBatchIds, selectedMetric, hiddenBatches])

  const winner = useMemo(() => {
    if (batches.length === 0) return null;
    return [...batches].sort((a, b) => b.productionIndex - a.productionIndex)[0];
  }, [batches]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Quick Comparison Card - Winner Summary */}
      {winner && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl p-8 shadow-2xl shadow-emerald-200/50">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy className="w-40 h-40 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Performance Leader
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight">{winner.batchName}</h2>
              <p className="text-emerald-50 font-medium text-lg max-w-md">
                This unit is <span className="font-black text-white italic">{(winner.productionIndex / 300 * 100 - 100).toFixed(0)}% more efficient</span> than the regional average, setting a new operational gold standard.
              </p>
            </div>
            <div className="flex gap-6 items-center">
              <div className="text-center px-6 py-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 min-w-[120px]">
                <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1">EPEF Score</p>
                <p className="text-3xl font-black text-white">{winner.productionIndex}</p>
              </div>
              <div className="text-center px-6 py-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 min-w-[120px]">
                <p className="text-[10px] font-bold text-emerald-100 uppercase mb-1">FCR Focus</p>
                <p className="text-3xl font-black text-white">{winner.fcr.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Advanced Interactive Selection Sidebar */}
        <Card className="lg:col-span-1 bg-white/80 backdrop-blur-md border-gray-100 shadow-xl shadow-gray-200/30 rounded-3xl overflow-hidden border-none ring-1 ring-gray-100">
          <CardHeader className="bg-gray-50/50 pb-6 pt-8">
            <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Intelligence Hub
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-black text-gray-400 tracking-wider">
              Multivariate Batch Analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <div className="space-y-1 pr-1 custom-scrollbar">
              {batches.map((batch) => (
                <div key={batch.id} className="group relative">
                  <button
                    onClick={() => toggleBatch(batch.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-300 ${
                      selectedBatchIds.includes(batch.id)
                        ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                        : 'hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black truncate">{batch.batchName}</span>
                      <span className="text-[10px] font-bold opacity-60">
                        {format(new Date(batch.arrivalDate), 'MMMM yyyy')}
                      </span>
                    </div>
                    {selectedBatchIds.includes(batch.id) && (
                      <Check className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>
                  {selectedBatchIds.includes(batch.id) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(batch.id); }}
                      className="absolute right-12 top-1/2 -translate-y-1/2 p-2 hover:bg-emerald-100 rounded-full transition-colors"
                    >
                      {hiddenBatches.includes(batch.id) ? <EyeOff className="w-3.5 h-3.5 text-emerald-300" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Settings</span>
              </div>
              <button
                onClick={() => setShowBenchmark(!showBenchmark)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                  showBenchmark ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-gray-50 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Target className={`w-4 h-4 ${showBenchmark ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="text-xs font-black">Industry Benchmark</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${showBenchmark ? 'bg-blue-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${showBenchmark ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* World-Class Glassmorphism Chart Container */}
        <Card className="lg:col-span-3 bg-white border-none shadow-2xl shadow-gray-200/60 rounded-3xl overflow-hidden ring-1 ring-gray-100">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 border-b border-gray-50">
            <div>
              <CardTitle className="text-2xl font-black text-gray-900 tracking-tight">
                {metricLabels[selectedMetric]}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-gray-400 mt-1">
                Comparative performance across <span className="text-emerald-600 font-bold">{selectedBatchIds.length - hiddenBatches.length}</span> active data streams.
              </CardDescription>
            </div>
            <div className="flex gap-2 p-1.5 bg-gray-100/80 backdrop-blur-sm rounded-2xl mt-6 md:mt-0">
              {Object.keys(metricLabels).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key as any)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                    selectedMetric === key
                      ? 'bg-white text-emerald-600 shadow-xl shadow-gray-200 shadow-emerald-100'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {key === 'fcr' ? 'FCR' : key === 'mortalityRate' ? 'Mortality' : 'EPEF'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {filteredData.length > 0 ? (
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                    <defs>
                      {COLORS.map((color, i) => (
                        <linearGradient key={`grad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                      <linearGradient id="benchmarkGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                      tickFormatter={(value) => selectedMetric === 'mortalityRate' ? `${value}%` : value}
                    />

                    {showBenchmark && (
                      <ReferenceLine 
                        y={benchmarks[selectedMetric]} 
                        stroke="#3b82f6" 
                        strokeDasharray="8 8" 
                        strokeWidth={2}
                        label={{ 
                          value: 'Industry Standard', 
                          position: 'right', 
                          fill: '#3b82f6', 
                          fontSize: 9, 
                          fontWeight: 900
                        }} 
                      />
                    )}
                    <Bar 
                      dataKey="value" 
                      radius={[12, 12, 12, 12]} 
                      barSize={40}
                      animationBegin={200}
                      animationDuration={2000}
                    >
                      {filteredData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#barGrad-${index % COLORS.length})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[450px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-100">
                <div className="p-6 bg-white rounded-full shadow-xl shadow-gray-100 mb-6">
                  <AlertTriangle className="w-12 h-12 text-amber-300" />
                </div>
                <p className="font-black text-gray-900 text-xl tracking-tight">Intelligence Feed Empty</p>
                <p className="text-sm font-medium text-gray-400 mt-2">Select and unhide units from the sidebar to visualize trends.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {batches.filter(b => selectedBatchIds.includes(b.id)).map((batch, index) => (
          <div 
            key={batch.id} 
            className={`relative p-6 bg-white rounded-[32px] border-none shadow-xl shadow-gray-200/40 transition-all duration-500 hover:-translate-y-2 group overflow-hidden ${hiddenBatches.includes(batch.id) ? 'opacity-40 grayscale' : ''}`}
          >
            <div 
              className="absolute top-0 left-0 w-2 h-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <div className="flex justify-between items-start mb-6">
              <h4 className="font-black text-gray-900 truncate pr-4 text-lg">
                {batch.batchName}
              </h4>
              <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-emerald-50 transition-colors">
                <Sparkles className="w-4 h-4 text-gray-300 group-hover:text-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FCR Efficiency</p>
                <p className="text-xl font-black text-gray-700">{batch.fcr.toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance</p>
                <p className="text-xl font-black text-emerald-600">{batch.productionIndex}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 italic">
                Started {format(new Date(batch.arrivalDate), 'MMM yyyy')}
              </span>
              <div className="flex -space-x-2">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-gray-100" />
                 ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
