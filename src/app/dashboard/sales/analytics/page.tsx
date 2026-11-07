import React from 'react';
import { getGlobalSalesStats } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Banknote, TrendingUp, ShoppingBag, Users, Calendar, ChevronRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { MobileCardList } from '@/components/ui/MobileCardList';

export default async function SalesAnalyticsPage() {
  const sales = await getGlobalSalesStats();
  const totalRevenue = sales.reduce((acc: number, s: any) => acc + s.totalAmount, 0);
  const avgOrderValue = sales.length > 0 ? (totalRevenue / sales.length) : 0;

  return (
    <div className="max-w-7xl mx-auto px-1 md:px-4 pt-2 pb-8 md:py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Sales', href: '/dashboard/sales' }, { label: 'Sales analytics' }]} />
      
      <header className="px-1">
        <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Sales analytics</h1>
        <p className="mt-2 text-sm text-[#a1a1a6]">Revenue, order value and the latest sales</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBox title="Total revenue" value={formatCurrency(totalRevenue)} icon={Banknote} color="text-[#ededed]" bgColor="bg-white/[0.04]" />
        <MetricBox title="Avg. order value" value={formatCurrency(avgOrderValue)} icon={TrendingUp} color="text-[#ededed]" bgColor="bg-white/[0.04]" />
        <MetricBox title="Total transactions" value={sales.length.toString()} icon={ShoppingBag} color="text-[#ededed]" bgColor="bg-white/[0.04]" />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] overflow-hidden">
         <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-lg font-medium text-[#ededed]">Recent financial flows</h2>
         </div>
         <MobileCardList
            items={sales}
            getKey={(sale: any) => sale.id}
            title={(sale: any) => sale.customerName || 'Walk-in Customer'}
            subtitle={(sale: any, index: number) => `${formatDate(sale.saleDate)} · Order ${index + 1}`}
            badge={(sale: any) => <span className="text-[#ededed] font-medium text-sm">{formatCurrency(sale.totalAmount)}</span>}
            fields={(sale: any) => [
              { label: 'Items', value: sale.items?.length || 0 },
            ]}
            actions={(sale: any) => (
              <Link
                href={`/dashboard/sales/${sale.id}`}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white/10 border border-white/10 text-white/70 rounded-md text-xs font-medium"
              >
                View <ChevronRight className="w-4 h-4" />
              </Link>
            )}
         />
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-white/[0.08]">
                     <th className="px-5 py-3 text-xs font-medium text-white/70">Date</th>
                     <th className="px-5 py-3 text-xs font-medium text-white/70 text-left">Customer</th>
                     <th className="px-5 py-3 text-xs font-medium text-white/70 text-center">Items</th>
                     <th className="px-5 py-3 text-xs font-medium text-white/70 text-right">Amount</th>
                     <th className="px-5 py-3 text-xs font-medium text-white/70 text-right">View</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/10">
                  {sales.map((sale: any, index: number) => (
                    <tr key={sale.id} className="transition-colors">
                      <td className="px-7 py-5 text-white font-medium text-sm tracking-normal">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-7 py-5">
                         <p className="text-white font-medium text-sm tracking-normal">{sale.customerName || 'Walk-in Customer'}</p>
                         <p className="text-white/60 text-xs font-medium">Order {index + 1}</p>
                      </td>
                      <td className="px-7 py-5 text-center">
                         <span className="text-white/70 font-medium text-sm tracking-normal">{sale.items?.length || 0}</span>
                      </td>
                      <td className="px-7 py-5 text-right">
                         <span className="text-[#ededed] font-medium text-lg tracking-normal">{formatCurrency(sale.totalAmount)}</span>
                      </td>
                      <td className="px-7 py-5 text-right">
                         <Link 
                           href={`/dashboard/sales/${sale.id}`}
                           className="p-2 bg-white/10 border border-white/10 text-white/70 rounded-md transition-colors inline-flex"
                         >
                            <ChevronRight className="w-4 h-4" />
                         </Link>
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
  <div className="min-w-0 rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
    <p className="text-sm text-[#a1a1a6]">{title}</p>
    <p className="mt-2 truncate text-2xl font-medium leading-none tabular-nums text-[#ededed]">{value}</p>
  </div>
);
