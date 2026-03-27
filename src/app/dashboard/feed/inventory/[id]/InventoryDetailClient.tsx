'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Package, 
  History, 
  TrendingDown, 
  AlertTriangle, 
  ArrowRight,
  ChevronRight,
  Clock,
  Wheat,
  Activity,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';

interface InventoryDetailClientProps {
  item: any;
}

export const InventoryDetailClient = ({ item }: InventoryDetailClientProps) => {
  // Calculations
  const logs = item.feedingLogs || [];
  const last7DaysLogs = logs.filter((log: any) => {
    const diff = new Date().getTime() - new Date(log.logDate).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  const avgUsagePerDay = last7DaysLogs.length > 0
    ? last7DaysLogs.reduce((sum: number, log: any) => sum + Number(log.amountConsumed), 0) / 7
    : 0;

  const daysRemaining = avgUsagePerDay > 0 
    ? Math.floor(Number(item.stockLevel) / avgUsagePerDay) 
    : Infinity;

  const lowStockThreshold = 500;
  const isLowStock = Number(item.stockLevel) < lowStockThreshold;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Current Stock" 
          value={`${Number(item.stockLevel).toLocaleString()} ${item.unit}`} 
          icon={Package} 
          color={isLowStock ? 'red' : 'emerald'} 
          subtext={isLowStock ? "Below Critical Level" : "Adequate Supply"}
        />
        <MetricCard 
          title="Forecasted Lifespan" 
          value={daysRemaining === Infinity ? "---" : `~${daysRemaining} Days`} 
          icon={Clock} 
          color="amber" 
          subtext={`Avg ${avgUsagePerDay.toFixed(1)} ${item.unit}/day`}
        />
        <MetricCard 
          title="Avg Weekly Usage" 
          value={`${(avgUsagePerDay * 7).toFixed(0)} ${item.unit}`} 
          icon={Activity} 
          color="blue" 
          subtext="Last 7 days data"
        />
        <MetricCard 
          title="Last Restock" 
          value="-- --" 
          icon={Calendar} 
          color="emerald" 
          subtext="No recent replenishment"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Usage Breakdown & Trends */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-white/5 border-b border-white/10 px-8 py-6">
                <CardTitle className="text-white italic font-black flex items-center gap-3">
                   <TrendingDown className="w-5 h-5 text-amber-400" /> Recent Usage Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="relative space-y-0 translate-x-3">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />
                    
                    {logs.length > 0 ? logs.slice(0, 10).map((log: any, idx: number) => (
                      <div key={idx} className="relative pb-8 pl-10 group">
                         <div className="absolute left-0 top-0 w-2.5 h-2.5 -translate-x-1/2 rounded-full border-2 border-slate-900 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] group-hover:scale-125 transition-transform" />
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                               <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 italic">
                                  {formatDate(log.logDate)}
                               </p>
                               <div className="flex items-center gap-3">
                                  <span className="text-white font-black tracking-tight text-sm">
                                     Consumed <span className="text-emerald-400">{log.amountConsumed} {item.unit}</span>
                                  </span>
                                  <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                                     Batch FLK-{log.batchId?.toString().padStart(3, '0')}
                                  </span>
                               </div>
                            </div>
                         </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center">
                         <History className="w-12 h-12 text-white/5 mx-auto mb-4" />
                         <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] italic">No usage records found.</p>
                      </div>
                    )}
                 </div>
              </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
           {isLowStock && (
             <motion.div 
               animate={{ scale: [1, 1.02, 1] }}
               transition={{ duration: 2, repeat: Infinity }}
             >
                <Card className="rounded-[2.5rem] bg-red-500/10 border-red-500/20 backdrop-blur-xl p-8 shadow-2xl">
                   <div className="flex items-center gap-4 mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                      <h4 className="text-red-500 font-black italic text-xl">Stock Alert</h4>
                   </div>
                   <p className="text-white/60 text-xs font-bold leading-relaxed mb-6">
                      Your {item.itemName} stock is below the {lowStockThreshold} {item.unit} safety threshold. Replenishment is recommended within {daysRemaining} days.
                   </p>
                   <Button className="w-full py-4 text-xs font-black uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white rounded-2xl">
                      Reorder Now
                   </Button>
                </Card>
             </motion.div>
           )}

           <Card className="rounded-[2.5rem] bg-white/5 border-white/10 backdrop-blur-xl p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                 <Wheat className="w-56 h-56 text-amber-400" />
              </div>
              <h4 className="text-white font-black italic text-xl mb-6">Item Attributes</h4>
              <div className="space-y-5">
                 <MetaItem label="Item Name" value={item.itemName} />
                 <MetaItem label="Category" value={item.category || 'N/A'} />
                 <MetaItem label="Unit of Measure" value={item.unit} />
                 <MetaItem label="Unique ID" value={`INV-${item.id.toString().padStart(3, '0')}`} />
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, subtext }: any) => {
  const colors: any = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className="p-6 rounded-[2rem] bg-white/5 border-white/10 border backdrop-blur-md shadow-2xl flex flex-col justify-between h-40 hover:bg-white/[0.08] transition-all duration-500 group">
       <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl border ${colors[color]}`}>
             <Icon className="w-5 h-5" />
          </div>
          <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
       </div>
       <div>
          <h3 className="text-white font-black text-2xl tracking-tighter">{value}</h3>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[9px] mt-1 italic flex justify-between items-center">
             {title} <span className="text-[8px] opacity-70">{subtext}</span>
          </p>
       </div>
    </div>
  );
};

const MetaItem = ({ label, value }: any) => (
  <div className="flex flex-col gap-1">
     <span className="text-white/20 text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
     <span className="text-white font-bold text-sm tracking-tight">{value}</span>
  </div>
);
