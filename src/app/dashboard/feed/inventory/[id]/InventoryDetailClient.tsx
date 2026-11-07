'use client';

import React, { useMemo } from 'react';
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
import { compareNewestFirst } from '@/lib/utils/chronological-sort';
import { getReorderThreshold, isLowStock } from '@/lib/inventory/feed-categories';

interface InventoryDetailClientProps {
  item: any;
}

export const InventoryDetailClient = ({ item }: InventoryDetailClientProps) => {
  const logs = useMemo(
    () =>
      [...(item.feedingLogs || [])].sort((a: any, b: any) =>
        compareNewestFirst({ date: a.logDate, id: a.id }, { date: b.logDate, id: b.id }),
      ),
    [item.feedingLogs],
  );
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

  const lowStockThreshold = getReorderThreshold(item);
  const isLowStockItem = isLowStock(item);

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard 
          title="Current stock" 
          value={`${Number(item.stockLevel).toLocaleString()} ${item.unit}`} 
          icon={Package} 
          color={isLowStockItem ? 'red' : 'emerald'} 
          subtext={isLowStockItem ? "Below critical level" : "Adequate supply"}
        />
        <MetricCard 
          title="Forecasted lifespan" 
          value={daysRemaining === Infinity ? "---" : `~${daysRemaining} Days`} 
          icon={Clock} 
          color="amber" 
          subtext={`Avg ${avgUsagePerDay.toFixed(1)} ${item.unit}/day`}
        />
        <MetricCard 
          title="Avg weekly usage" 
          value={`${(avgUsagePerDay * 7).toFixed(0)} ${item.unit}`} 
          icon={Activity} 
          color="blue" 
          subtext="Last 7 days data"
        />
        <MetricCard 
          title="Last restock" 
          value="-- --" 
          icon={Calendar} 
          color="emerald" 
          subtext="No recent replenishment"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Usage Breakdown & Trends */}
        <div className="lg:col-span-2 space-y-7">
          <Card className="rounded-lg bg-fg/10 border-fg/10 overflow-hidden">
              <CardHeader className="bg-fg/10 border-b border-fg/10 px-7 py-5">
                <CardTitle className="text-fg font-medium flex items-center gap-2">
                   <TrendingDown className="w-5 h-5 text-fg-3" /> Recent usage timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-7">
                 <div className="relative space-y-0 translate-x-3">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-fg/10" />
                    
                    {logs.length > 0 ? logs.slice(0, 10).map((log: any, idx: number) => (
                      <div key={idx} className="relative pb-7 pl-9 group">
                         <div className="absolute left-0 top-0 w-2.5 h-2.5 -translate-x-1/2 rounded-full border-2 border-fg/[0.08] bg-emerald-400 transition-transform" />
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                               <p className="text-fg/70 text-xs font-medium mb-1">
                                  {formatDate(log.logDate)}
                               </p>
                               <div className="flex items-center gap-2">
                                  <span className="text-fg font-medium tracking-normal text-sm">
                                     Consumed <span className="text-fg">{log.amountConsumed} {item.unit}</span>
                                  </span>
                                  <span className="text-fg/70 text-xs font-medium bg-fg/10 px-2 py-0.5 rounded-lg border border-fg/10">
                                     {log.batch?.batchName || `Usage ${idx + 1}`}
                                  </span>
                               </div>
                            </div>
                         </div>
                      </div>
                    )) : (
                      <div className="py-16 text-center">
                         <History className="w-12 h-12 text-fg/5 mx-auto mb-3" />
                         <p className="text-fg/70 font-medium text-xs">No usage records found.</p>
                      </div>
                    )}
                 </div>
              </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-7">
           {isLowStockItem && (
             <motion.div 
               
               
             >
                <Card className="rounded-lg bg-fg/[0.04] border-fg/[0.08] p-7">
                   <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 text-neg" />
                      <h4 className="text-neg font-medium text-xl">Stock alert</h4>
                   </div>
                   <p className="text-fg/80 text-xs font-medium leading-relaxed mb-5">
                      Your {item.itemName} stock is below the {lowStockThreshold} {item.unit} safety threshold. Replenishment is recommended within {daysRemaining} days.
                   </p>
                   <Button className="w-full py-3 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-md">
                      Reorder now
                   </Button>
                </Card>
             </motion.div>
           )}

           <Card className="rounded-lg bg-fg/10 border-fg/10 p-7 relative overflow-hidden">
              <h4 className="text-fg font-medium text-xl mb-5">Item attributes</h4>
              <div className="space-y-4">
                 <MetaItem label="Item name" value={item.itemName} />
                 <MetaItem label="Category" value={item.category || 'N/A'} />
                 <MetaItem label="Unit of measure" value={item.unit} />
                 <MetaItem label="Inventory label" value={item.itemName} />
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, subtext }: any) => {
  const colors: any = {
    emerald: "text-fg bg-fg/[0.04] border-fg/[0.08]",
    amber: "text-fg bg-fg/[0.04] border-fg/[0.08]",
    red: "text-neg bg-fg/[0.04] border-fg/[0.08]",
    blue: "text-fg-2 bg-fg/[0.06] border-fg/[0.08]",
  };

  return (
    <div className="p-5 rounded-lg bg-fg/10 border-fg/10 border flex flex-col justify-between h-40 hover:bg-fg/[0.08] transition-colors duration-200 group">
       <div className="flex justify-between items-start">
          <div className={`p-2 rounded-md border ${colors[color]}`}>
             <Icon className="w-5 h-5" />
          </div>
          <ChevronRight className="w-4 h-4 text-fg/10 group-hover:text-fg/40 transition-colors" />
       </div>
       <div>
          <h3 className="text-fg font-medium text-2xl tracking-normal">{value}</h3>
          <p className="text-fg/70 font-medium text-xs mt-1 flex justify-between items-center">
             {title} <span className="text-xs opacity-70">{subtext}</span>
          </p>
       </div>
    </div>
  );
};

const MetaItem = ({ label, value }: any) => (
  <div className="flex flex-col gap-1">
     <span className="text-fg/60 text-xs font-medium">{label}</span>
     <span className="text-fg font-medium text-sm tracking-normal">{value}</span>
  </div>
);
