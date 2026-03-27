import React from 'react';
import { getGlobalFlockStats } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Bird, Skull, Wheat, TrendingUp, Activity, ChevronRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import Link from 'next/link';

export default async function FlocksAnalyticsPage() {
  const batches = await getGlobalFlockStats();
  const activeBatches = batches.filter((b: any) => b.status === 'active');
  const totalBirds = activeBatches.reduce((acc: number, b: any) => acc + b.currentQuantity, 0);
  const totalMortality = batches.reduce((acc: number, b: any) => acc + b.totalMortality, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Flocks', href: '/dashboard/flocks' }, { label: 'Indept Analytics' }]} />
      
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="relative z-10 font-bold">
          <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">
            Global Flock <span className="text-emerald-400">Intelligence</span>
          </h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 italic flex items-center gap-2">
             Analytics Engine Active • Real-time Monitoring
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricBox title="Total Active Birds" value={totalBirds.toLocaleString()} icon={Bird} color="text- emerald-400" bgColor="bg-emerald-500/10" />
        <MetricBox title="Historical Mortality" value={totalMortality.toLocaleString()} icon={Skull} color="text-red-400" bgColor="bg-red-500/10" />
        <MetricBox title="Active Batches" value={activeBatches.length.toString()} icon={TrendingUp} color="text-blue-400" bgColor="bg-blue-500/10" />
        <MetricBox title="Overall Health" value="98.2%" icon={Activity} color="text-emerald-400" bgColor="bg-emerald-500/10" />
      </div>

      <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
         <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-black italic uppercase tracking-widest text-sm">Batch Performance Ledger</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic">Batch Name</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-center">Current Qty</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-center">Mortality %</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/10">
                  {batches.map((batch: any) => {
                    const mortalityRate = batch.initialQuantity > 0 ? (batch.totalMortality / batch.initialQuantity * 100).toFixed(1) : 0;
                    return (
                      <tr key={batch.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                           <p className="text-white font-black text-sm tracking-tight">{batch.breedType}</p>
                           <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest mt-1 italic">{batch.house?.name || 'Unassigned House'}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <span className="text-emerald-400 font-black text-lg tracking-tighter">{batch.currentQuantity}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <span className={`font-black tracking-tighter ${Number(mortalityRate) > 5 ? 'text-red-400' : 'text-white/40'}`}>{mortalityRate}%</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <Link 
                             href={`/dashboard/flocks/${batch.id}`}
                             className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-all font-black uppercase text-[10px] tracking-widest"
                           >
                              Indept View <ChevronRight className="w-3 h-3" />
                           </Link>
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

const MetricBox = ({ title, value, icon: Icon, color, bgColor }: any) => (
  <div className="p-6 rounded-[2rem] bg-white/5 border-white/10 border backdrop-blur-md shadow-2xl flex flex-col justify-between h-40 hover:bg-white/[0.08] transition-all duration-500">
     <div className={`p-3 rounded-2xl w-fit ${bgColor} ${color}`}>
        <Icon className="w-5 h-5" />
     </div>
     <div>
        <h3 className="text-white font-black text-3xl tracking-tighter">{value}</h3>
        <p className="text-white/20 font-bold uppercase tracking-widest text-[9px] mt-1 italic">{title}</p>
     </div>
  </div>
);
