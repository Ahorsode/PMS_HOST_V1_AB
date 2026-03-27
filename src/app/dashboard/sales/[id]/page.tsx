import React from 'react'; // Re-triggering build to resolve import lint
import { getSaleDetails } from '@/lib/actions/dashboard-actions';
import { notFound } from 'next/navigation';
import { SaleDetailClient } from './SaleDetailClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSaleDetails(Number(id));

  if (!sale) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      <Breadcrumbs 
        items={[
          { label: 'Sales & Finance', href: '/dashboard/sales' },
          { label: `Order ORD-${sale.id.toString().padStart(4, '0')}` }
        ]} 
      />
      
      <div className="flex justify-between items-center mb-10 bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter">
            Transaction <span className="text-green-400 italic">Analysis</span>
          </h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2 italic">
             {sale.customerName || 'Walk-in Customer'} • Payment Ledger
          </p>
        </div>
      </div>

      <SaleDetailClient sale={sale} />
    </div>
  );
}
