'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Info, UserRound, Users } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlMoney } from '@/components/ui/ql/Figure';
import { QlDerived } from '@/components/ui/ql/Derived';
import { qlButton } from '@/components/ui/ql/Button';
import { WorkerStamp } from '@/components/ui/WorkerStamp';
import { SalesRowActions } from './SalesActions';

type Item = { id: string; description: string; quantity: number; unitPrice: number; totalPrice: number; inventoryId?: string | null; livestockId?: string | null };
export type MobileOrder = {
  id: string;
  customerId?: string | null;
  totalAmount: number;
  subtotalAmount: number;
  discountAmount: number;
  status: string;
  orderDate: string | null;
  customer: { name: string; phone: string | null; balanceOwed?: number } | null;
  items: Item[];
  user?: { firstname: string | null; surname: string | null; role: string } | null;
};

const nf = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const typeLabel = (order: MobileOrder) => {
  const labels = [order.items.some((i) => !!i.inventoryId) ? 'Eggs' : null, order.items.some((i) => !!i.livestockId) ? 'Birds' : null].filter(Boolean);
  return labels.length ? labels.join(' · ') : 'Custom';
};
const STATUS_TONE: Record<string, 'mint' | 'amber' | 'coral' | 'neutral'> = { COMPLETED: 'mint', PAID: 'mint', PENDING: 'amber', CANCELLED: 'coral' };
const sentence = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

/** Sales on a phone: this month first, orders by period, the big order flagged, one sticky Record a sale. */
export function MobileSales({
  orders,
  orderCount,
  currency,
  thisMonthRevenue,
  monthChangeLabel,
  totalRevenue,
  netRevenue,
  pendingOrders,
  daySpan,
  avgDailyRevenue,
  topCustomers,
  canViewCustomers,
  canEdit,
  canRecordPayment,
  eggsPerCrate,
}: {
  orders: MobileOrder[];
  orderCount: number;
  currency: string;
  thisMonthRevenue: number;
  monthChangeLabel: string;
  totalRevenue: number;
  netRevenue: number;
  pendingOrders: number;
  daySpan: number;
  avgDailyRevenue: number;
  topCustomers: Array<{ id: string; name: string; revenue: number }>;
  canViewCustomers: boolean;
  canEdit: boolean;
  canRecordPayment: boolean;
  eggsPerCrate: number;
}) {
  const money = (v: number) => formatCurrency(v, currency);
  const [period, setPeriod] = useState<'all' | 'month' | 'earlier'>('all');
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [openOrder, setOpenOrder] = useState<string | null>(null);

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }, []);
  const numbered = orders.map((order, index) => ({ order, number: orderCount - index }));
  const isThisMonth = (order: MobileOrder) => !!order.orderDate && new Date(order.orderDate).getTime() >= monthStart;
  const thisMonth = numbered.filter((row) => isThisMonth(row.order));
  const earlier = numbered.filter((row) => !isThisMonth(row.order));
  const sum = (rows: typeof numbered) => rows.reduce((total, row) => total + Number(row.order.totalAmount || 0), 0);
  const earlierTotal = sum(earlier);
  const monthShare = totalRevenue > 0 ? (thisMonthRevenue / totalRevenue) * 100 : 0;

  // Said once instead of on every row, when every order shares it.
  const allWalkIn = orders.length > 0 && orders.every((order) => !order.customer);
  const allNoPhone = orders.length > 0 && orders.every((order) => !order.customer?.phone);
  const commonStatus = orders.length > 0 && orders.every((order) => order.status === orders[0].status) ? orders[0].status : null;
  const completed = orders.filter((order) => order.status === 'COMPLETED' || order.status === 'PAID').length;

  // Per-unit prices; an order far above the rest gets an amber Check.
  const unitPrice = (order: MobileOrder) => {
    const units = order.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
    return order.items.length === 1 && units > 0 ? Number(order.totalAmount) / units : null;
  };
  const prices = orders.map(unitPrice).filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);
  const median = prices.length >= 3 ? prices[Math.floor(prices.length / 2)] : null;
  const isFlagged = (order: MobileOrder) => {
    const price = unitPrice(order);
    return price !== null && median !== null && price > median * 10;
  };
  const top = numbered.reduce<(typeof numbered)[number] | null>((best, row) => (!best || row.order.totalAmount > best.order.totalAmount ? row : best), null);
  const topShare = top && totalRevenue > 0 ? (Number(top.order.totalAmount) / totalRevenue) * 100 : 0;
  const topPrice = top ? unitPrice(top.order) : null;
  const restPrices = prices.filter((v) => v !== topPrice);

  const renderRow = ({ order, number }: (typeof numbered)[number]) => {
    const units = order.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
    const price = unitPrice(order);
    const flagged = isFlagged(order);
    const open = openOrder === order.id;
    return (
      <li key={order.id} className={cn('relative', flagged && 'bg-ql-amber/[0.04]')}>
        {flagged ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-ql-amber" /> : null}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpenOrder(open ? null : order.id)}
          className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
        >
          <WorkerStamp user={order.user} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-ql-display text-[15px] font-semibold">Order {number}</span>
              {flagged ? <QlChip tone="amber">Check</QlChip> : null}
              {!commonStatus ? <QlChip tone={STATUS_TONE[order.status] ?? 'neutral'}>{sentence(order.status)}</QlChip> : null}
            </span>
            <span className="block truncate text-[12px] text-ql-muted">
              {typeLabel(order)}
              {units > 0 ? ` · ${nf(units)} units` : ''}
              {!allWalkIn ? ` · ${order.customer?.name || 'Walk-in'}` : ''}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-ql-display text-[15px] font-semibold tabular-nums">{money(order.totalAmount)}</span>
            {price !== null ? (
              <span className="block font-ql-mono text-[10px] text-ql-muted"><QlDerived formula="total ÷ units">{money(price)}</QlDerived> / unit</span>
            ) : null}
          </span>
        </button>
        {open ? (
          <div className="space-y-3 px-4 pb-4">
            <p className="text-[12px] text-ql-muted">
              {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'} ·{' '}
              {order.customer?.name || 'Walk-in customer'}
              {order.customer?.phone ? ` · ${order.customer.phone}` : ''}
              {order.discountAmount > 0 ? ` · ${money(order.discountAmount)} discount` : ''}
            </p>
            <SalesRowActions order={order} canEdit={canEdit} canRecordPayment={canRecordPayment} eggsPerCrate={eggsPerCrate} variant="phone" />
            <Link href={`/dashboard/sales/${order.id}`} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-ql-mint">
              Open order
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </li>
    );
  };

  const range = (rows: typeof numbered) => {
    const amounts = rows.map((row) => row.order.totalAmount).sort((a, b) => a - b);
    return amounts.length ? `${money(amounts[0])} to ${money(amounts[amounts.length - 1])}` : '';
  };

  return (
    <div className="space-y-3 pb-24 font-ql-sans text-ql-text">
      <header className="pt-1">
        <QlLabel>Business</QlLabel>
        <h1 className="mt-2 font-ql-display text-[28px] font-semibold leading-none tracking-[-0.02em]">Sales</h1>
        <p className="mt-2 text-[13px] text-ql-muted">Orders, payments and what customers still owe</p>
        {canViewCustomers ? (
          <Link href="/dashboard/sales/customers" className={qlButton('ghost', 'mt-3 rounded-2xl border-ql-line text-ql-text hover:bg-ql-text/[0.04]')}>
            <Users aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            Customers
          </Link>
        ) : null}
      </header>

      <QlHero aria-labelledby="sales-month-label" className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ql-mint)_7%,transparent)_0%,transparent_60%)]">
        <div className="flex items-baseline justify-between gap-2">
          <QlLabel as="h2" id="sales-month-label">This month</QlLabel>
          <QlLabel as="span">{thisMonth.length} {thisMonth.length === 1 ? 'order' : 'orders'}</QlLabel>
        </div>
        <p className="mt-3 text-[clamp(28px,10vw,40px)] leading-none">
          <QlMoney amount={thisMonthRevenue} currency={currency} className="text-ql-mint" />
        </p>
        <p className="mt-2 text-[13px] text-ql-muted">{monthChangeLabel}</p>
        {totalRevenue > 0 ? (
          <>
            <div aria-hidden="true" className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ql-text/[0.06]">
              <span className="h-full rounded-full bg-ql-mint" style={{ width: `${monthShare}%` }} />
              <span className="h-full rounded-full bg-ql-muted/50" style={{ width: `${100 - monthShare}%` }} />
            </div>
            <p className="mt-2 flex justify-between font-ql-mono text-[11px] text-ql-muted">
              <span>This month <QlDerived formula="this month ÷ all time">{monthShare.toFixed(1)}%</QlDerived></span>
              <span>Earlier {(100 - monthShare).toFixed(1)}%</span>
            </p>
          </>
        ) : null}
        <p className="mt-3 border-t border-ql-line pt-3 font-ql-mono text-[11px] uppercase tracking-[0.06em] text-ql-muted">
          All time {money(totalRevenue)} · {totalRevenue === netRevenue ? 'no discounts' : `${money(netRevenue)} after discounts`}
        </p>
      </QlHero>

      <div className="grid grid-cols-2 gap-2">
        <QlTile>
          <QlLabel>Orders</QlLabel>
          <p className="mt-3 font-ql-display text-[28px] font-semibold leading-none tabular-nums">{nf(orderCount)}</p>
          <p className="mt-2 text-[12px] text-ql-muted">{completed === orders.length && orders.length > 0 ? 'All completed' : `${completed} completed`}</p>
        </QlTile>
        <QlTile>
          <QlLabel>Pending</QlLabel>
          <p className={cn('mt-3 font-ql-display text-[28px] font-semibold leading-none tabular-nums', pendingOrders > 0 && 'text-ql-amber')}>{nf(pendingOrders)}</p>
          <p className="mt-2 text-[12px] text-ql-muted">{pendingOrders === 0 ? 'Nothing waiting for payment' : pendingOrders === 1 ? 'Needs payment or completion' : 'Need payment or completion'}</p>
        </QlTile>
      </div>
      <QlTile className="flex items-end justify-between gap-3">
        <div>
          <QlLabel>Avg per day</QlLabel>
          <p className="mt-3 font-ql-display text-xl font-semibold leading-none tabular-nums">{money(avgDailyRevenue)}</p>
        </div>
        <p className="text-right font-ql-mono text-[10px] uppercase tracking-[0.06em] text-ql-muted">
          Total ÷ <QlDerived formula="days between the first and last order">{nf(daySpan)}</QlDerived> days
          <br />
          not per order
        </p>
      </QlTile>

      {top && topShare >= 50 && orders.length >= 3 ? (
        <div className="flex gap-3 rounded-2xl border border-ql-amber/30 bg-ql-amber/[0.06] p-4">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" />
          <p className="text-[13px] text-ql-muted">
            <span className="block font-semibold text-ql-text">One order is <QlDerived formula="largest order ÷ all revenue">{Math.round(topShare)}%</QlDerived> of revenue</span>
            Order {top.number} is {money(top.order.totalAmount)}.
            {topPrice !== null ? ` That is ${money(topPrice)} a unit` : ''}
            {topPrice !== null && restPrices.length > 0 ? `, against ${money(restPrices[0])} to ${money(restPrices[restPrices.length - 1])} on the rest.` : topPrice !== null ? '.' : ''}
          </p>
        </div>
      ) : null}

      <section aria-labelledby="sales-orders">
        <div className="flex items-baseline justify-between">
          <QlLabel as="h2" id="sales-orders">Recent orders</QlLabel>
          <QlLabel as="span">{nf(orderCount)} total</QlLabel>
        </div>
        <div role="tablist" aria-label="Orders by period" className="mt-2 grid grid-cols-3 gap-1 rounded-2xl border border-ql-line bg-ql-surface p-1">
          {([
            ['all', 'All', orders.length],
            ['month', 'This month', thisMonth.length],
            ['earlier', 'Earlier', earlier.length],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={period === value}
              onClick={() => setPeriod(value)}
              className={cn('min-h-11 rounded-xl text-[13px] font-semibold', period === value ? 'bg-ql-raised text-ql-text' : 'text-ql-muted')}
            >
              {label} <span className={cn('font-ql-mono text-[11px]', period === value ? 'text-ql-mint' : 'text-ql-muted')}>{count}</span>
            </button>
          ))}
        </div>
        {orders.length > 0 && (allWalkIn || commonStatus) ? (
          <p className="mt-2 font-ql-mono text-[10px] uppercase tracking-[0.06em] text-ql-muted">
            {[
              allWalkIn ? (orders.length === 1 ? 'Walk-in' : `All ${orders.length} are walk-in`) : null,
              allWalkIn && allNoPhone ? 'No phone' : null,
              commonStatus ? sentence(commonStatus) : null,
            ].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        {orders.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-ql-line px-4 py-8 text-center text-[13px] text-ql-muted">
            No sales recorded yet. {canEdit ? 'Use Record a sale for the first one.' : 'Sales your team records show here.'}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {period !== 'earlier' && thisMonth.length > 0 ? (
              <div>
                <div className="flex justify-between"><QlLabel>This month</QlLabel><QlLabel as="span"><QlDerived formula="this month's orders added up">{money(sum(thisMonth))}</QlDerived></QlLabel></div>
                <ul className="mt-2 divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">{thisMonth.map(renderRow)}</ul>
              </div>
            ) : null}
            {period === 'month' && thisMonth.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ql-line px-4 py-6 text-center text-[13px] text-ql-muted">No orders this month yet.</p>
            ) : null}
            {period !== 'month' && earlier.length > 0 ? (
              <div>
                <div className="flex justify-between"><QlLabel>Earlier</QlLabel><QlLabel as="span"><QlDerived formula="earlier orders added up">{money(earlierTotal)}</QlDerived></QlLabel></div>
                {period === 'earlier' || earlierOpen ? (
                  <ul className="mt-2 divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">{earlier.map(renderRow)}</ul>
                ) : (
                  <button type="button" onClick={() => setEarlierOpen(true)} className="mt-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-ql-line bg-ql-surface px-4 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{earlier.length} earlier {earlier.length === 1 ? 'order' : 'orders'}</span>
                      <span className="block truncate text-[12px] text-ql-muted">
                        Orders {earlier[earlier.length - 1].number} to {earlier[0].number} · <QlDerived formula="smallest to largest earlier order">{range(earlier)}</QlDerived>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ql-mint">Show <ChevronDown aria-hidden="true" className="h-4 w-4" /></span>
                  </button>
                )}
              </div>
            ) : null}
            <p className="font-ql-mono text-[10px] uppercase tracking-[0.06em] text-ql-muted">Initials show who recorded the order. Tap an order for its receipt and actions.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="sales-customers">
        <QlLabel as="h2" id="sales-customers">Top customers</QlLabel>
        {topCustomers.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-dashed border-ql-line px-5 py-6 text-center">
            <span aria-hidden="true" className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-ql-line text-ql-muted"><UserRound className="h-5 w-5" strokeWidth={1.5} /></span>
            <p className="mt-3 text-sm font-semibold">No customer sales yet</p>
            <p className="mt-1 text-[13px] text-ql-muted">
              {allWalkIn ? `All ${orders.length} orders were walk-in, so nobody can owe you yet. ` : ''}Add a customer to track what they owe.
            </p>
            {canViewCustomers ? (
              <Link href="/dashboard/sales/customers" className={qlButton('ghost', 'mt-3 rounded-2xl border-ql-line text-ql-text')}>Add a customer</Link>
            ) : null}
          </div>
        ) : (
          <ol className="mt-2 divide-y divide-ql-line overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {topCustomers.map((customer, index) => (
              <li key={customer.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ql-text/[0.06] font-ql-mono text-[11px] text-ql-muted">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{customer.name}</span>
                <span className="shrink-0 font-ql-display text-[15px] font-semibold tabular-nums">{money(customer.revenue)}</span>
              </li>
            ))}
            {canViewCustomers ? (
              <li><Link href="/dashboard/sales/customers" className="flex min-h-12 items-center justify-center text-[13px] font-semibold text-ql-mint">View all customers</Link></li>
            ) : null}
          </ol>
        )}
      </section>
    </div>
  );
}
