import React from 'react';
import { getGlobalEggStats } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Egg, TrendingUp, Calendar, Target, Activity } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatDate } from '@/lib/utils';

export default async function EggsAnalyticsPage() {
  const logs = await getGlobalEggStats();
  const totalEggs = logs.reduce((acc: number, log: any) => acc + log.quantity, 0);
  const avgYield = logs.length > 0 ? (totalEggs / logs.length).toFixed(1) : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Eggs', href: '/dashboard/eggs' }, { label: 'Production Intelligence' }]} />
      
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="relative z-10 font-bold">
          <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">
            Production <span className="text-emerald-400">Intelligence</span>
          </h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 italic flex items-center gap-2">
             Yield Analytics Active • Seasonal Trend Tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricBox title="Total Eggs Collected" value={totalEggs.toLocaleString()} icon={Egg} color="text-yellow-400" bgColor="bg-yellow-500/10" />
        <MetricBox title="Avg. Daily Yield" value={avgYield} icon={Activity} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <MetricBox title="Collection Events" value={logs.length.toString()} icon={Calendar} color="text-blue-400" bgColor="bg-blue-500/10" />
      </div>

      <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
         <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-black italic uppercase tracking-widest text-sm">Historical Yield Record</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic">Date</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic">Batch</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-center">Cracked</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-right">Quantity</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/10">
                  {logs.slice(0, 15).map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6 text-white font-bold text-sm tracking-tight italic">
                        {formatDate(log.logDate)}
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-white font-black text-sm tracking-tight">{log.batch?.breedType}</p>
                         <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest">FLK-{log.batchId?.toString().padStart(3, '0')}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                         <span className="text-red-400/40 font-black text-sm tracking-tighter">{log.cracked || 0}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <span className="text-emerald-400 font-black text-2xl tracking-tighter">{log.quantity}</span>
                         <span className="text-[10px] text-white/20 ml-2 italic">units</span>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
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
