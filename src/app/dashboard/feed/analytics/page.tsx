import { getGlobalFeedStats } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Wheat, AlertTriangle, Activity, Package, Battery, ChevronRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import Link from 'next/link';
import { getBreedDisplayName } from '@/lib/livestock-breed-options';
import { getReorderThreshold, isFeedCategory, isLowStock } from '@/lib/inventory/feed-categories';

export default async function FeedAnalyticsPage() {
  const inventory = await getGlobalFeedStats();
  const feedInventory = inventory.filter((item: any) => isFeedCategory(item.category));
  const lowStock = feedInventory.filter((item: any) => isLowStock(item));

  return (
    <div className="max-w-7xl mx-auto px-1 md:px-4 pt-2 pb-8 md:py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Feed & inventory', href: '/dashboard/feed' }, { label: 'Feed analytics' }]} />
      
      <header className="px-1">
        <h1 className="text-3xl font-medium leading-tight text-fg">Feed analytics</h1>
        <p className="mt-2 text-sm text-fg-2">Stock levels and low-stock alerts for feed</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricBox title="Inventory items" value={feedInventory.length.toString()} icon={Package} color="text-fg" bgColor="bg-fg/[0.04]" />
        <MetricBox title="Low stock alerts" value={lowStock.length.toString()} icon={AlertTriangle} color="text-neg" bgColor="bg-fg/[0.04]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="rounded-xl border border-fg/[0.08] bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-fg/[0.08]">
               <h2 className="text-lg font-medium text-fg">Stock levels</h2>
            </div>
            <div className="p-5 space-y-5">
               {feedInventory.map((item: any) => {
                 const threshold = getReorderThreshold(item);
                 const low = isLowStock(item);
                 return (
                 <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                       <p className="text-fg font-medium text-sm">{item.itemName}</p>
                       <span className={`text-xs font-medium ${low ? 'text-neg' : 'text-emerald-400'}`}>
                          {item.stockLevel} {item.unit || 'bags'} left
                       </span>
                    </div>
                    <div className="h-1.5 bg-fg/[0.06] rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full ${low ? 'bg-neg-solid' : 'bg-bar'}`}
                         style={{ width: `${Math.min(100, threshold > 0 ? (item.stockLevel / threshold) * 100 : 0)}%` }}
                       />
                    </div>
                 </div>
               )})}
            </div>
         </div>

         <div className="rounded-xl border border-fg/[0.08] bg-card overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-fg/[0.08]">
               <h2 className="text-lg font-medium text-fg">Consumption insights (recent)</h2>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-fg/10">
                  {inventory
                    .flatMap((i: any) => i.feedingLogs)
                    .sort((a: any, b: any) =>
                      new Date(b.logDate).getTime() - new Date(a.logDate).getTime() ||
                      String(b.id ?? '').localeCompare(String(a.id ?? '')),
                    )
                    .slice(0, 10)
                    .map((log: any, idx: number) => (
                    <div key={idx} className="hover:bg-fg/[0.02] px-5 py-3 flex items-center justify-between">
                       <div>
                          <p className="text-fg font-medium text-xs">{getBreedDisplayName(log.batch?.breedType)}</p>
                          <p className="text-fg/60 text-xs font-medium">{log.feedType}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-fg font-medium text-sm tracking-normal">{log.amountConsumed} bags</p>
                          <p className="text-fg/60 text-xs">Logged consumption</p>
                       </div>
                    </div>
                  ))}
            </div>
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
