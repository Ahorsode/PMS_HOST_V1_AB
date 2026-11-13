'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider'
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
  const currency = useCurrency()
  const itemCount = sale.items?.length || 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Total" value={formatCurrency(sale.totalAmount, currency)} />
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
            badge={(item: any) => <span className="text-sm font-medium tabular-nums text-fg">{formatCurrency(item.totalPrice, currency)}</span>}
            fields={(item: any) => [
              { label: 'Quantity', value: item.quantity },
              { label: 'Unit price', value: formatCurrency(item.unitPrice, currency) },
            ]}
          />
          <table className="hidden w-full text-left md:table">
            <thead className={`border-b ${g.hairline}`}>
              <tr>
                <th className="px-5 py-3 text-xs font-normal text-fg-3">Description</th>
                <th className="px-5 py-3 text-right text-xs font-normal text-fg-3">Quantity</th>
                <th className="px-5 py-3 text-right text-xs font-normal text-fg-3">Unit price</th>
                <th className="px-5 py-3 text-right text-xs font-normal text-fg-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-fg/[0.06] transition-colors duration-150 hover:bg-fg/[0.03]">
                  <td className="px-5 py-3 text-sm text-fg">{item.description}</td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-fg">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-fg-2">{formatCurrency(item.unitPrice, currency)}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium tabular-nums text-fg">{formatCurrency(item.totalPrice, currency)}</td>
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
                <dt className="text-xs text-fg-2">Name</dt>
                <dd className="mt-1 text-sm text-fg">{sale.customerName || 'Walk-in customer'}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-2">Status</dt>
                <dd className="mt-1 text-sm text-fg">{statusLabel(sale.status)}</dd>
              </div>
            </dl>
          </section>

          <Link href="/dashboard/sales" className={`${g.buttonSecondary} w-full`}>
            <ArrowLeft className="h-4 w-4 text-fg-2" strokeWidth={1.5} />
            Back to sales
          </Link>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-xl border border-fg/[0.08] bg-card p-5">
    <p className="text-sm text-fg-2">{label}</p>
    <p className="mt-2 truncate text-2xl font-medium leading-none tabular-nums text-fg">{value}</p>
  </div>
);
