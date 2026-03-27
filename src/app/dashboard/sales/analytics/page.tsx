import React from 'react';
import { getGlobalSalesStats } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Banknote, TrendingUp, ShoppingBag, Users, Calendar, ChevronRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default async function SalesAnalyticsPage() {
  const sales = await getGlobalSalesStats();
  const totalRevenue = sales.reduce((acc: number, s: any) => acc + s.totalAmount, 0);
  const avgOrderValue = sales.length > 0 ? (totalRevenue / sales.length) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Sales', href: '/dashboard/sales' }, { label: 'Financial Intelligence' }]} />
      
      <div className="flex justify-between items-center bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="relative z-10 font-bold">
          <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">
            Financial <span className="text-emerald-400">Intelligence</span>
          </h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 italic flex items-center gap-2">
             Revenue Tracking Active • Transaction Flow Monitoring
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricBox title="Total Revenue" value={formatCurrency(totalRevenue)} icon={Banknote} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <MetricBox title="Avg. Order Value" value={formatCurrency(avgOrderValue)} icon={TrendingUp} color="text-emerald-400" bgColor="bg-emerald-500/10" />
        <MetricBox title="Total Transactions" value={sales.length.toString()} icon={ShoppingBag} color="text-amber-400" bgColor="bg-amber-500/10" />
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
         <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-black italic uppercase tracking-widest text-sm">Recent Financial Flows</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-white/10 border-b border-white/10">
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic">Date</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-left">Customer</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-center">Items</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-right">Amount</th>
                     <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 italic text-right">View</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/10">
                  {sales.map((sale: any) => (
                    <tr key={sale.id} className="transition-colors">
                      <td className="px-8 py-6 text-white font-bold text-sm tracking-tight italic">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-white font-black text-sm tracking-tight">{sale.customerName || 'Walk-in Customer'}</p>
                         <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest">ORD-{sale.id.toString().padStart(4, '0')}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                         <span className="text-white/40 font-black text-sm tracking-tighter">{sale.items?.length || 0}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <span className="text-emerald-400 font-black text-lg tracking-tighter">{formatCurrency(sale.totalAmount)}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <Link 
                           href={`/dashboard/sales/${sale.id}`}
                           className="p-2 bg-white/10 border border-white/10 text-white/40 rounded-xl transition-all inline-flex"
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

const MetricBox = ({ title, value, icon: Icon, color, bgColor }: any) => (
  <div className="p-6 rounded-[2rem] bg-white/10 border-white/10 border backdrop-blur-md shadow-2xl flex flex-col justify-between h-40">
     <div className={`p-3 rounded-2xl w-fit ${bgColor} ${color}`}>
        <Icon className="w-5 h-5" />
     </div>
     <div>
        <h3 className="text-white font-black text-3xl tracking-tighter">{value}</h3>
        <p className="text-white/20 font-bold uppercase tracking-widest text-[9px] mt-1 italic">{title}</p>
     </div>
  </div>
);
