import React from 'react'; // Re-triggering build to resolve import lint
import { getSaleDetails } from '@/lib/actions/dashboard-actions';
import { notFound } from 'next/navigation';
import { SaleDetailClient } from './SaleDetailClient';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSaleDetails(id);

  if (!sale) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-3 pt-2 pb-7 md:py-7 relative">
      <Breadcrumbs 
        items={[
          { label: 'Sales & finance', href: '/dashboard/sales' },
          { label: sale.customerName ? `${sale.customerName} order` : 'Order details' }
        ]} 
      />
      
      <div className="flex justify-between items-center mb-9 bg-fg/10 p-7 rounded-lg border border-fg/10 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-medium leading-tight text-fg">Sale details</h1>
          <p className="mt-2 text-sm text-fg-2">
             {sale.customerName || 'Walk-in customer'} · payments
          </p>
        </div>
      </div>

      <SaleDetailClient sale={sale} />
    </div>
  );
}
