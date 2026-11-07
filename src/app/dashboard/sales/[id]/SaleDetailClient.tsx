'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { MobileCardList } from '@/components/ui/MobileCardList';
import { g } from '@/components/ui/graphite';

interface SaleDetailClientProps {
  sale: any;
}

function statusLabel(status: string | null | undefined) {
  const text = String(status || 'completed').replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const SaleDetailClient = ({ sale }: SaleDetailClientProps) => {
  const itemCount = sale.items?.length || 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Total" value={formatCurrency(sale.totalAmount)} />
        <Stat label="Items" value={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`} />
        <Stat label="Sale date" value={formatDate(sale.saleDate)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className={`${g.card} overflow-hidden lg:col-span-2`}>
          <div className={`border-b ${g.hairline} px-5 py-4`}>
            <h2 className={g.sectionTitle}>Items</h2>
          </div>
          <MobileCardList
            items={sale.items ?? []}
            getKey={(_item: any, idx: number) => idx}
            title={(item: any) => item.description}
            badge={(item: any) => <span className="text-sm font-medium tabular-nums text-[#ededed]">{formatCurrency(item.totalPrice)}</span>}
            fields={(item: any) => [
              { label: 'Quantity', value: item.quantity },
              { label: 'Unit price', value: formatCurrency(item.unitPrice) },
            ]}
          />
          <table className="hidden w-full text-left md:table">
            <thead className={`border-b ${g.hairline}`}>
              <tr>
                <th className="px-5 py-3 text-xs font-normal text-[#85858b]">Description</th>
                <th className="px-5 py-3 text-right text-xs font-normal text-[#85858b]">Quantity</th>
                <th className="px-5 py-3 text-right text-xs font-normal text-[#85858b]">Unit price</th>
                <th className="px-5 py-3 text-right text-xs font-normal text-[#85858b]">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-white/[0.06] transition-colors duration-150 hover:bg-white/[0.03]">
                  <td className="px-5 py-3 text-sm text-[#ededed]">{item.description}</td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-[#ededed]">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-[#a1a1a6]">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium tabular-nums text-[#ededed]">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="space-y-4">
          <section className={`${g.card} p-5`}>
            <h2 className={g.sectionTitle}>Customer</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs text-[#a1a1a6]">Name</dt>
                <dd className="mt-1 text-sm text-[#ededed]">{sale.customerName || 'Walk-in customer'}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#a1a1a6]">Status</dt>
                <dd className="mt-1 text-sm text-[#ededed]">{statusLabel(sale.status)}</dd>
              </div>
            </dl>
          </section>

          <Link href="/dashboard/sales" className={`${g.buttonSecondary} w-full`}>
            <ArrowLeft className="h-4 w-4 text-[#a1a1a6]" strokeWidth={1.5} />
            Back to sales
          </Link>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-xl border border-white/[0.08] bg-[#19191b] p-5">
    <p className="text-sm text-[#a1a1a6]">{label}</p>
    <p className="mt-2 truncate text-2xl font-medium leading-none tabular-nums text-[#ededed]">{value}</p>
  </div>
);
