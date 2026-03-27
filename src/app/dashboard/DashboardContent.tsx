"use client";

import React, { useState } from 'react';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RegisterBatchForm } from '@/components/forms/RegisterBatchForm';
import { usePoultryStats } from '@/hooks/usePoultryStats';
import { motion } from 'framer-motion';
import { Bird, Skull, Wheat, TrendingUp, Activity, Plus, Package, Eye, Banknote, Syringe } from 'lucide-react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/Dialog';
import { formatCurrency } from '@/lib/utils';

interface DashboardContentProps {
  stats: {
    totalBirds: number;
    mortalityRate: string;
    overallDead: number;
    todayDead: number;
    totalEggs: number;
    todayEggs: number;
    lowFeedAlertsCount: number;
    lowFeedItems: Array<{ name: string; stockLevel: number; category: string }>;
    eggTrendData: Array<{ date: string; count: number }>;
    feedTrendData: Array<{ date: string; count: number }>;
    revenueTrendData: Array<{ date: string; count: number }>;
    mortalityTrendData: Array<{ date: string; count: number }>;
    alerts: Array<{
      type: 'VACCINE' | 'MEDICATION' | 'EGGS' | 'FEED';
      title: string;
      message: string;
      severity: 'warning' | 'error' | 'info';
    }>;
    activeBatches: Array<{
      id: string;
      breed: string;
      quantity: number;
      hatchDate: string;
      status: string;
      houseNumber: string;
      numericId: number;
    }>;
  };
  houses: Array<{
    id: number;
    name: string;
    currentTemperature: number | null;
    currentHumidity: number | null;
  }>;
}

const FloatingIcon = ({ icon: Icon, className = "" }: { icon: React.ElementType, className?: string }) => (
  <motion.div
    animate={{ y: [0, -8, 0] }}
    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    className={className}
  >
    <Icon className="w-full h-full text-emerald-400 opacity-20" />
  </motion.div>
);

const MiniBarChart = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="flex-1 h-12 mt-4 flex items-end gap-1">
      {data.map((val, i) => {
        const heightPct = max > 0 ? (val / max) * 100 : 0;
        return (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
            style={{ height: `${Math.max(heightPct, 4)}%`, originY: 1 }}
            className={`flex-1 rounded-t-sm opacity-80 ${color}`}
          />
        );
      })}
    </div>
  );
};

export function DashboardContent({ stats, houses }: DashboardContentProps) {
  const { getAgeInDays } = usePoultryStats();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const getGrowthProgress = (hatchDate: string, breed: string) => {
    const daysDiff = getAgeInDays(hatchDate);
    const target = breed === 'Broiler' ? 42 : 700;
    const percent = Math.min(100, Math.max(0, (daysDiff / target) * 100));
    return { days: daysDiff, percent, target };
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 relative pb-12">
      
      {/* Floating Decorative Icons */}
      <FloatingIcon icon={Bird} className="absolute -top-10 -left-10 w-32 h-32 pointer-events-none" />
      <FloatingIcon icon={Package} className="absolute top-1/2 -right-20 w-48 h-48 pointer-events-none opacity-5" />

      {/* Bento Grid Header */}
      <header className="flex items-end justify-between mb-2 px-2">
         <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Farm <span className="text-emerald-400 italic">Overview</span></h1>
            <p className="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2 mb-2">
               <Activity className="w-3 h-3" /> Live Operations Tracking
            </p>
         </div>
         <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-500 text-[#064e3b] px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/50"
            >
              <Plus className="w-4 h-4" />
              Register Batch
            </button>
         </div>
      </header>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 items-start">
        
        {/* Total Population Hero Card */}
        <Card className="md:col-span-2 lg:col-span-2 row-span-2 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardHeader className="pb-0">
            <CardTitle>Total Population</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-full relative z-10 pt-4 pb-6">
            <div className="mt-2">
               <span className="text-7xl font-black text-white tracking-tighter">{stats.totalBirds.toLocaleString()}</span>
               <div className="text-emerald-400 font-black text-xl mt-1 italic">Healthy Birds</div>
            </div>
            
            <div className="flex items-center gap-3 text-emerald-400 px-4 py-2 bg-emerald-500/20 rounded-2xl w-fit mt-6 border border-emerald-500/20">
               <TrendingUp className="w-5 h-5" />
               <span className="text-xs font-black uppercase tracking-widest">+12% growth rate</span>
            </div>

            {/* Mortality Sub-Panel included inside Total Population */}
            <div className="mt-auto pt-6 w-full">
              <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-5 backdrop-blur-md">
                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2">
                     <Skull className="w-4 h-4 text-red-400" />
                     <span className="text-red-400 font-bold text-sm">Mortality Rate</span>
                   </div>
                   <span className="text-white font-black text-xl">{stats.mortalityRate}%</span>
                </div>
                 <div className="grid grid-cols-2 gap-4 mt-2 bg-black/40 p-3 rounded-2xl">
                    <div>
                       <p className="text-[10px] text-white/50 uppercase font-black tracking-widest italic mb-1">Today Dead</p>
                       <p className="text-white font-black text-2xl tracking-tighter">{stats.todayDead}</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-white/50 uppercase font-black tracking-widest italic mb-1">Overall Dead</p>
                       <p className="text-white font-black text-2xl tracking-tighter">{stats.overallDead}</p>
                    </div>
                 </div>
                 <div className="mt-4 pt-4 border-t border-white/5">
                    <MiniBarChart data={stats.mortalityTrendData.map(d => d.count)} color="bg-red-400" />
                    <p className="text-[8px] text-center text-red-400/50 uppercase tracking-widest mt-2 font-black">7 Day Mortality Trend</p>
                 </div>
              </div>
            </div>
            
            <div className="absolute -top-10 -right-10 opacity-10 -z-10">
               <Bird className="w-64 h-64" />
            </div>
          </CardContent>
        </Card>

        {/* Top Row Right: Egg & Revenue */}
        <Card className="md:col-span-2 lg:col-span-2 bg-blue-500/15 border-blue-500/20 relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-blue-400">Egg Production</CardTitle>
            <Package className="w-5 h-5 text-blue-400/50" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex justify-between items-end border-b border-white/5 pb-4 mb-2">
               <div>
                 <p className="text-4xl font-black text-white tracking-tighter">{stats.todayEggs.toLocaleString()}</p>
                 <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 italic">Collected Today</p>
               </div>
               <div className="text-right">
                 <p className="text-2xl font-black text-white tracking-tighter">{stats.totalEggs.toLocaleString()}</p>
                 <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 italic">Overall Total</p>
               </div>
            </div>
            <MiniBarChart data={stats.eggTrendData.map(d => d.count)} color="bg-blue-400" />
            <p className="text-[8px] text-center text-white/40 uppercase tracking-widest mt-2">7 Day Trend</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-2 bg-purple-500/15 border-purple-500/20 relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-purple-400">Revenue (Cedi)</CardTitle>
            <Banknote className="w-5 h-5 text-purple-400/50" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-4xl font-black text-white tracking-tighter mb-1">
                  {formatCurrency(stats.revenueTrendData.reduce((acc, curr) => acc + curr.count, 0))}
                </p>
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 italic">7 Day Sales Volume</p>
              </div>
              <Link 
                href="/dashboard/sales"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-purple-500/20"
              >
                Manage Sales
              </Link>
            </div>
            <MiniBarChart data={stats.revenueTrendData.map(d => d.count)} color="bg-purple-400" />
          </CardContent>
        </Card>

        {/* Second Row: Alerts & Active Batches */}
        <Card className="md:col-span-2 lg:col-span-2 bg-amber-500/15 border-amber-500/20 h-[380px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
            <CardTitle className="text-amber-400">Alerts & Reminders</CardTitle>
            <Activity className="w-5 h-5 text-amber-400/50 flex-shrink-0" />
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mt-2 pr-2">
            {stats.alerts.map((alert, idx) => {
              const Icon = alert.type === 'VACCINE' ? Syringe : 
                           alert.type === 'MEDICATION' ? Activity : 
                           alert.type === 'EGGS' ? Package : Wheat;
              
              const bgClass = alert.severity === 'error' ? 'bg-red-500/15 border-red-500/20' :
                             alert.severity === 'warning' ? 'bg-amber-500/15 border-amber-500/20' :
                             'bg-blue-500/15 border-blue-500/20';
              
              const textClass = alert.severity === 'error' ? 'text-red-400' :
                               alert.severity === 'warning' ? 'text-amber-400' :
                               'text-blue-400';

              return (
                <div key={`alert-${idx}`} className={`flex items-center gap-3 p-3 rounded-2xl border ${bgClass}`}>
                  <Icon className={`w-5 h-5 ${textClass} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{alert.title}</p>
                    <p className={`${textClass} text-[10px] uppercase tracking-widest font-black mt-0.5`}>{alert.message}</p>
                  </div>
                </div>
              );
            })}

            {stats.lowFeedItems.map((item, idx) => (
               <div key={`feed-${idx}`} className="flex items-center gap-3 bg-red-500/15 p-3 rounded-2xl border border-red-500/20">
                  <Wheat className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                     <p className="text-white text-xs font-bold truncate">Low Stock: {item.name}</p>
                     <p className="text-red-500 text-[10px] uppercase tracking-widest font-black mt-0.5">{item.stockLevel} kg remaining</p>
                  </div>
               </div>
            ))}
            
            {stats.alerts.length === 0 && stats.lowFeedItems.length === 0 && (
              <div className="text-center py-8">
                 <p className="text-white/40 text-xs italic font-bold">No urgent alerts.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feed Trends Card */}
        <Card className="md:col-span-2 lg:col-span-2 bg-[#064e3b]/30 border-emerald-500/20 h-[380px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
            <CardTitle className="text-emerald-400">Feed Consumption</CardTitle>
            <Wheat className="w-5 h-5 text-emerald-400/50" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-2 relative z-10">
             <div>
                <p className="text-4xl font-black text-white tracking-tighter">
                  {stats.feedTrendData.reduce((sum, d) => sum + d.count, 0).toLocaleString()} <span className="text-lg">kg</span>
                </p>
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 italic">Weekly Consumption</p>
             </div>
             <div>
               <MiniBarChart data={stats.feedTrendData.map(d => d.count)} color="bg-emerald-400" />
               <p className="text-[8px] text-center text-white/40 uppercase tracking-widest mt-2">Daily Breakdown (Last 7 Days)</p>
             </div>
          </CardContent>
        </Card>

      </div>

      {/* Active Batches List */}
      <div className="mt-8 space-y-4">
         <div className="flex items-center justify-between px-4">
            <h3 className="text-white font-black text-2xl tracking-tighter">Active <span className="text-emerald-400 italic">Batches</span></h3>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-6" />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {stats.activeBatches.map((batch) => {
             const progress = getGrowthProgress(batch.hatchDate, batch.breed);
             return (
               <div key={batch.id} className="p-6 rounded-[2.5rem] bg-white/15 border border-white/10 group/batch relative overflow-hidden transition-all duration-300 shadow-2xl">
                 <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 mb-2">
                          <span className="text-emerald-400 font-black text-[10px] uppercase tracking-tighter bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/20">{batch.id}</span>
                          <span className="text-white/40 font-bold text-[10px] uppercase tracking-widest">House #{batch.houseNumber}</span>
                       </div>
                       <h4 className="text-white font-black text-2xl tracking-tight">{batch.breed}</h4>
                       <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                          Hatched {new Date(batch.hatchDate).toLocaleDateString()}
                       </div>
                    </div>
                     <div className="flex flex-col items-end gap-3">
                       <HealthBadge status="Healthy" />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-6 bg-black/40 p-4 rounded-2xl">
                    <div className="flex flex-col">
                       <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">Total Quantity</span>
                       <span className="text-white font-black text-xl tracking-tight leading-none">{batch.quantity.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">Growth Target</span>
                       <span className="text-white font-black text-xl tracking-tight leading-none">{progress.target} Days</span>
                    </div>
                 </div>

                 <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                       <span className="text-white/70 italic">Progress (Day {progress.days})</span>
                       <span className="text-emerald-400 font-black">{Math.round(progress.percent)}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${progress.percent}%` }}
                         transition={{ duration: 1.5, ease: "easeOut" }}
                         className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                       />
                    </div>
                 </div>
                 
                 <Link 
                   href={`/dashboard/flocks/${batch.numericId}`}
                   className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm transition-all"
                 >
                    <Eye className="w-4 h-4" />
                    MANAGE FLOCK
                 </Link>
               </div>
             );
           })}
         </div>
      </div>

      <Dialog 
        isOpen={isRegisterModalOpen} 
        onOpenChange={setIsRegisterModalOpen}
        title="Register New Batch"
      >
        <div className="p-1">
          <RegisterBatchForm houses={houses} onSuccess={() => setIsRegisterModalOpen(false)} />
        </div>
      </Dialog>
    </div>
  );
}
