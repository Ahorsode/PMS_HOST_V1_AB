import React from 'react';
export const revalidate = 3600; // Cache for 1 hour
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
    <div className="max-w-7xl mx-auto px-3 py-7 space-y-7">
      <Breadcrumbs items={[{ label: 'Livestock', href: '/dashboard/flocks' }, { label: 'Unit Analytics' }]} />
      
      <div className="flex justify-between items-center bg-white/10 backdrop-blur-md p-7 rounded-lg border border-white/10 relative overflow-hidden">
        <div className="relative z-10 font-bold">
          <h2 className="text-4xl font-bold text-white tracking-normal italic uppercase">
            Livestock <span className="text-emerald-400">Intelligence</span>
          </h2>
          <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-2 italic flex items-center gap-2">
             Analytics Engine Active • Real-time Monitoring
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricBox title="Total Population" value={totalBirds.toLocaleString()} icon={Bird} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <MetricBox title="Historical Mortality" value={totalMortality.toLocaleString()} icon={Skull} color="text-red-400" bgColor="bg-red-500/10" />
        <MetricBox title="Active Units" value={activeBatches.length.toString()} icon={TrendingUp} color="text-blue-400" bgColor="bg-blue-500/10" />
        <MetricBox title="Overall Health" value="98.2%" icon={Activity} color="text-emerald-400" bgColor="bg-emerald-500/10" />
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden shadow-2xl">
         <div className="px-7 py-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-bold italic uppercase tracking-widest text-sm">Unit Performance Ledger</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-white/10 border-b border-white/10">
                     <th className="px-7 py-3 text-xs font-bold uppercase tracking-widest text-white/70 italic">Unit Name</th>
                     <th className="px-7 py-3 text-xs font-bold uppercase tracking-widest text-white/70 italic text-center">Current Qty</th>
                     <th className="px-7 py-3 text-xs font-bold uppercase tracking-widest text-white/70 italic text-center">Mortality %</th>
                     <th className="px-7 py-3 text-xs font-bold uppercase tracking-widest text-white/70 italic text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/10">
                  {batches.map((batch: any) => {
                    const mortalityRate = batch.initialQuantity > 0 ? (batch.totalMortality / batch.initialQuantity * 100).toFixed(1) : 0;
                    return (
                      <tr key={batch.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-7 py-5">
                           <p className="text-white font-bold text-sm tracking-normal">{batch.batchName || batch.breedType}</p>
                           <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest mt-1 italic">{batch.house?.name || 'Unassigned House'}</p>
                        </td>
                        <td className="px-7 py-5 text-center">
                           <span className="text-emerald-400 font-bold text-lg tracking-normal">{batch.currentQuantity}</span>
                        </td>
                        <td className="px-7 py-5 text-center">
                           <span className={`font-bold tracking-normal ${Number(mortalityRate) > 5 ? 'text-red-400' : 'text-white/70'}`}>{mortalityRate}%</span>
                        </td>
                        <td className="px-7 py-5 text-right">
                           <Link 
                             href={`/dashboard/flocks/${batch.id}`}
                             className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-all font-bold uppercase text-xs tracking-widest"
                           >
                               Unit Detail <ChevronRight className="w-3 h-3" />
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
  <div className="p-5 rounded-lg bg-white/10 border-white/10 border backdrop-blur-md shadow-2xl flex flex-col justify-between h-40 hover:bg-white/[0.08] transition-all duration-500">
     <div className={`p-2 rounded-md w-fit ${bgColor} ${color}`}>
        <Icon className="w-5 h-5" />
     </div>
     <div>
        <h3 className="text-white font-bold text-3xl tracking-normal">{value}</h3>
        <p className="text-white/20 font-bold uppercase tracking-widest text-[9px] mt-1 italic">{title}</p>
     </div>
  </div>
);
