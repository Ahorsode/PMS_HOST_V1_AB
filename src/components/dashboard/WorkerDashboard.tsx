"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Bird, Wheat, Skull, Activity, Plus, Package, Syringe, Clock } from 'lucide-react';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { motion } from 'framer-motion';

interface WorkerDashboardProps {
  stats: any;
  houses: any[];
}

export function WorkerDashboard({ stats, houses }: WorkerDashboardProps) {
  const alerts = stats.alerts || [];
  const lowFeed = stats.lowFeedItems || [];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tighter">Operational <span className="text-amber-400 italic">Hub</span></h1>
        <p className="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
           <Activity className="w-3 h-3" /> Live Task Management
        </p>
      </header>

      {/* Primary Task Actions (Large Buttons for easy tapping) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <button className="flex flex-col items-center justify-center gap-3 h-40 bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] hover:bg-emerald-500/20 transition-all duration-300 group">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
               <Wheat className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-white font-black text-xs uppercase tracking-widest">Log Feed</span>
         </button>
         <button className="flex flex-col items-center justify-center gap-3 h-40 bg-blue-500/10 border border-blue-500/20 rounded-[2.5rem] hover:bg-blue-500/20 transition-all duration-300 group">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
               <Package className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-white font-black text-xs uppercase tracking-widest">Log Eggs</span>
         </button>
         <button className="flex flex-col items-center justify-center gap-3 h-40 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] hover:bg-red-500/20 transition-all duration-300 group">
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
               <Skull className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-white font-black text-xs uppercase tracking-widest">Mortality</span>
         </button>
         <button className="flex flex-col items-center justify-center gap-3 h-40 bg-purple-500/10 border border-purple-500/20 rounded-[2.5rem] hover:bg-purple-500/20 transition-all duration-300 group">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
               <Syringe className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-white font-black text-xs uppercase tracking-widest">Medical</span>
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Urgent Attention / Alerts */}
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2 italic">
               <Clock className="w-5 h-5" /> Due Tasks & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {alerts.length === 0 && lowFeed.length === 0 ? (
                <div className="text-center py-12 text-white/40 italic font-bold">No urgent tasks. System is healthy.</div>
             ) : (
                <>
                  {alerts.map((alert: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
                       <Activity className="w-5 h-5 text-amber-500" />
                       <div>
                         <p className="text-white text-sm font-bold truncate">{alert.title}</p>
                         <p className="text-amber-500 text-[9px] uppercase tracking-widest font-black mt-1 italic">{alert.message}</p>
                       </div>
                    </div>
                  ))}
                  {lowFeed.map((item: any, idx: number) => (
                    <div key={`feed-${idx}`} className="flex items-center gap-4 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                       <Wheat className="w-5 h-5 text-red-500" />
                       <div>
                         <p className="text-white text-sm font-bold truncate underline decoration-red-500/50">LOW STOCK: {item.name}</p>
                         <p className="text-red-400 text-[9px] uppercase tracking-widest font-black mt-1">{item.stockLevel} kg remaining</p>
                       </div>
                    </div>
                  ))}
                </>
             )}
          </CardContent>
        </Card>

        {/* Active Batches List (Simplified) */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Unit Health Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
             {stats.activeBatches.map((batch: any) => (
               <div key={batch.numericId} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-black text-lg tracking-tight uppercase italic">{batch.id}</h4>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-1">House: {batch.houseNumber} • {batch.breed}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className="text-emerald-400 font-black text-xl tracking-tighter">{batch.quantity.toLocaleString()}</span>
                     <HealthBadge status="Healthy" />
                  </div>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
