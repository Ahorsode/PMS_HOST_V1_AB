import React from 'react';
import { getGlobalFeedStats } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Wheat, AlertTriangle, Activity, Package, Battery, ChevronRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import Link from 'next/link';

export default async function FeedAnalyticsPage() {
  const inventory = await getGlobalFeedStats();
  const lowStock = inventory.filter((item: any) => item.stockLevel < 50);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Feed & Inventory', href: '/dashboard/feed' }, { label: 'Inventory Intelligence' }]} />
      
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="relative z-10 font-bold">
          <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">
            Inventory <span className="text-emerald-400">Intelligence</span>
          </h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 italic flex items-center gap-2">
             Stock Monitoring Active • Consumption Rate Analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricBox title="Inventory Items" value={inventory.length.toString()} icon={Package} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <MetricBox title="Low Stock Alerts" value={lowStock.length.toString()} icon={AlertTriangle} color="text-red-400" bgColor="bg-red-500/10" />
        <MetricBox title="Active Consumption" value="7.2kg / day" icon={Activity} color="text-blue-400" bgColor="bg-blue-500/10" />
        <MetricBox title="Avg. Stock Depth" value="84%" icon={Battery} color="text-emerald-400" bgColor="bg-emerald-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-white/10">
               <h3 className="text-white font-black italic uppercase tracking-widest text-sm">Strategic Stock Levels</h3>
            </div>
            <div className="p-8 space-y-6">
               {inventory.map((item: any) => (
                 <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                       <p className="text-white font-bold text-sm">{item.name}</p>
                       <span className={`text-[10px] font-black ${item.stockLevel < 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.stockLevel}kg left
                       </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                       <div 
                         className={`h-full transition-all duration-1000 ${item.stockLevel < 50 ? 'bg-gradient-to-r from-red-500 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                         style={{ width: `${Math.min(100, (item.stockLevel / 200) * 100)}%` }}
                       />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col">
            <div className="px-8 py-6 border-b border-white/10">
               <h3 className="text-white font-black italic uppercase tracking-widest text-sm">Consumption Insights (Recent)</h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-white/10">
                  {inventory.flatMap((i: any) => i.feedingLogs).slice(0, 10).map((log: any, idx: number) => (
                    <div key={idx} className="hover:bg-white/[0.02] px-8 py-4 flex items-center justify-between">
                       <div>
                          <p className="text-white font-bold text-xs">{log.batch?.breedType}</p>
                          <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest italic">{log.feedType}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-emerald-400 font-black text-sm tracking-tighter">{log.amountConsumed}kg</p>
                          <p className="text-white/10 text-[8px] italic">Logged consumption</p>
                       </div>
                    </div>
                  ))}
            </div>
         </div>
      </div>
    </div>
  );
}

const MetricBox = ({ title, value, icon: Icon, color, bgColor }: any) => (
  <div className="p-6 rounded-[2rem] bg-white/5 border-white/10 border backdrop-blur-md shadow-2xl flex flex-col justify-between h-40">
     <div className={`p-3 rounded-2xl w-fit ${bgColor} ${color}`}>
        <Icon className="w-5 h-5" />
     </div>
     <div>
        <h3 className="text-white font-black text-3xl tracking-tighter">{value}</h3>
        <p className="text-white/20 font-bold uppercase tracking-widest text-[9px] mt-1 italic">{title}</p>
     </div>
  </div>
);
