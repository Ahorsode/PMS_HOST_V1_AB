import React from 'react';
import { getGlobalEggStats } from '@/lib/actions/dashboard-actions';
import { Egg, Calendar, Activity } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatDate } from '@/lib/utils';
import { getBreedDisplayName } from '@/lib/livestock-breed-options';
import { getFarmSettings } from '@/lib/actions/preference-actions';
import { MobileCardList } from '@/components/ui/MobileCardList';

function formatCratesAndEggs(eggs: number, eggsPerCrate: number) {
  const epc = eggsPerCrate > 0 ? eggsPerCrate : 30;
  const total = Math.max(0, Math.floor(Number(eggs) || 0));
  const crates = Math.floor(total / epc);
  const remainder = total % epc;
  const crateLabel = crates === 1 ? 'crate' : 'crates';
  if (remainder === 0) return `${crates} ${crateLabel}`;
  return `${crates} ${crateLabel} / ${remainder} eggs`;
}

export default async function EggsAnalyticsPage() {
  const [logs, farmSettings] = await Promise.all([
    getGlobalEggStats(),
    getFarmSettings(),
  ]);
  const eggsPerCrate = farmSettings?.eggsPerCrate ?? 30;
  const totalEggs = logs.reduce((acc: number, log: any) => acc + log.quantity, 0);
  const avgYield = logs.length > 0 ? (totalEggs / logs.length) : 0;

  return (
    <div className="max-w-7xl mx-auto px-1 md:px-4 pt-2 pb-8 md:py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Eggs', href: '/dashboard/eggs' }, { label: 'Egg analytics' }]} />
      
      <header className="px-1">
        <h1 className="text-3xl font-semibold leading-tight text-fg">Egg analytics</h1>
        <p className="mt-2 text-sm text-fg-2">Totals and the latest collections across your layer flocks</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricBox title="Total collected" value={formatCratesAndEggs(totalEggs, eggsPerCrate)} icon={Egg} color="text-fg" bgColor="bg-fg/[0.04]" />
        <MetricBox title="Avg. daily yield" value={formatCratesAndEggs(avgYield, eggsPerCrate)} icon={Activity} color="text-fg" bgColor="bg-fg/[0.04]" />
        <MetricBox title="Collection events" value={logs.length.toString()} icon={Calendar} color="text-fg-2" bgColor="bg-fg/[0.06]" />
      </div>

      <div className="rounded-xl border border-fg/[0.08] bg-card overflow-hidden">
         <div className="px-5 py-4 border-b border-fg/[0.08] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">Historical yield record</h2>
         </div>
         <MobileCardList
            items={logs.slice(0, 15)}
            getKey={(log: any) => log.id}
            title={(log: any) => formatDate(log.logDate)}
            badge={(log: any) => <span className="text-fg font-medium text-sm">{formatCratesAndEggs(log.quantity, eggsPerCrate)}</span>}
            fields={(log: any, index: number) => [
              { label: 'Batch', value: <>{getBreedDisplayName(log.batch?.breedType)}<span className="block text-fg/60 text-xs font-medium">{log.batch?.batchName || `Collection ${index + 1}`}</span></> },
              { label: 'Cracked', value: <span className="text-neg font-medium">{log.cracked || 0}</span> },
            ]}
         />
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-fg/[0.08]">
                     <th className="px-5 py-3 text-xs font-semibold text-fg/70">Date</th>
                     <th className="px-5 py-3 text-xs font-semibold text-fg/70">Batch</th>
                     <th className="px-5 py-3 text-xs font-semibold text-fg/70 text-center">Cracked</th>
                     <th className="px-5 py-3 text-xs font-semibold text-fg/70 text-right">Quantity</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-fg/10">
                  {logs.slice(0, 15).map((log: any, index: number) => (
                    <tr key={log.id} className="hover:bg-fg/[0.02] transition-colors">
                      <td className="px-7 py-5 text-fg font-medium text-sm tracking-normal">
                        {formatDate(log.logDate)}
                      </td>
                      <td className="px-7 py-5">
                         <p className="text-fg font-medium text-sm tracking-normal">{getBreedDisplayName(log.batch?.breedType)}</p>
                         <p className="text-fg/60 text-xs font-medium mt-1">{log.batch?.batchName || `Collection ${index + 1}`}</p>
                      </td>
                      <td className="px-7 py-5 text-center">
                         <span className="text-neg font-medium text-sm tracking-normal">{log.cracked || 0}</span>
                      </td>
                      <td className="px-7 py-5 text-right">
                         <span className="text-fg font-medium text-lg tracking-normal">{formatCratesAndEggs(log.quantity, eggsPerCrate)}</span>
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

const MetricBox = ({ title, value }: any) => (
  <div className="min-w-0 rounded-xl border border-fg/[0.08] bg-card p-5">
    <p className="text-sm text-fg-2">{title}</p>
    <p className="mt-2 truncate text-2xl font-medium leading-none tabular-nums text-fg">{value}</p>
  </div>
);
