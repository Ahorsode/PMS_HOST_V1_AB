"use client";

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { FinancialOverview } from '@/components/dashboard/FinancialOverview';
import { g } from '@/components/ui/graphite';

interface AccountantDashboardProps {
  summary: any;
  stats: any;
  currency?: string;
}

export function AccountantDashboard({ summary, stats, currency = 'GHS' }: AccountantDashboardProps) {
  const events = [
    ...(stats.recentOrders || []).map((o: any) => ({ ...o, type: 'ORDER', date: new Date(o.orderDate) })),
    ...(stats.recentSales || []).map((s: any) => ({ ...s, type: 'SALE', date: new Date(s.saleDate) })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      <header className="px-1">
        <h1 className={g.title}>Finances</h1>
        <p className={`mt-2 text-sm ${g.secondary}`}>Revenue, expenses and recent sales this month</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <FinancialOverview data={summary} currency={currency} />

        <section className={g.card}>
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className={g.sectionTitle}>Recent sales and orders</h2>
          </div>
          {events.length === 0 ? (
            <p className={`px-5 py-12 text-center text-sm ${g.secondary}`}>No sales or orders yet</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {events.map((item: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#ededed]">
                      {item.type === 'ORDER' ? 'Order' : 'Sale'} · {item.customerName || 'Walk-in customer'}
                    </p>
                    <p className={`${g.ledger} tabular-nums`}>
                      {item.date.toLocaleDateString('en-GB')}{item.status ? ` · ${String(item.status).toLowerCase()}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-[#ededed]">{formatCurrency(item.totalAmount, currency)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
