import React from 'react';
import Link from 'next/link';
import { AlertTriangle, FileDown, Mail, MapPin, Phone } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlMoney } from '@/components/ui/ql/Figure';
import { QlDerived } from '@/components/ui/ql/Derived';

export type StatementOrder = {
  id: string;
  number: number;
  status: string;
  date: string;
  totalAmount: number;
  discountAmount: number;
  cashReceived: number;
  isDeleted: boolean;
  items: Array<{ description: string; quantity: number; totalPrice: number }>;
};

const STATUS_TONE: Record<string, 'mint' | 'amber' | 'coral' | 'neutral'> = { COMPLETED: 'mint', PAID: 'mint', PENDING: 'amber', CANCELLED: 'coral' };
const sentence = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
const EPSILON = 0.01;

/** One customer's account on a phone: what they owe, how to reach them, every order. */
export function MobileStatement({
  name,
  phone,
  email,
  address,
  createdAt,
  balanceOwed,
  orders,
  currency,
}: {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  balanceOwed: number;
  orders: StatementOrder[];
  currency: string;
}) {
  const money = (v: number) => formatCurrency(v, currency);
  const live = orders.filter((o) => !o.isDeleted && o.status !== 'CANCELLED');
  const spent = live.reduce((sum, o) => sum + o.totalAmount, 0);
  const openOrders = live.filter((o) => o.status === 'PENDING');
  const unpaidOnOrders = openOrders.reduce((sum, o) => sum + Math.max(0, o.totalAmount - o.cashReceived), 0);
  const noOrderBehindBalance = balanceOwed > EPSILON && live.length === 0;
  const balanceMismatch = !noOrderBehindBalance && Math.abs(balanceOwed - unpaidOnOrders) > EPSILON;
  const since = new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  return (
    <div className="space-y-3 pb-4 font-ql-sans">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ql-text/[0.06] font-ql-display text-lg font-semibold text-ql-text">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-ql-display text-[24px] font-semibold leading-tight text-ql-text">{name}</h1>
          <p className="font-ql-mono text-[11px] text-ql-muted">Customer since {since}</p>
        </div>
      </div>

      <QlHero aria-labelledby="ql-account-label">
        <QlLabel id="ql-account-label">{balanceOwed > EPSILON ? 'Owes you' : 'Account'}</QlLabel>
        <QlMoney
          amount={balanceOwed}
          currency={currency}
          className={cn('mt-2 block font-ql-display text-[36px] font-semibold leading-none', balanceOwed > EPSILON ? 'text-ql-coral' : 'text-ql-text')}
        />
        <p className="mt-2 text-[13px] text-ql-muted">
          {balanceOwed > EPSILON ? 'Outstanding balance' : 'Paid up'} · {live.length} {live.length === 1 ? 'sale' : 'sales'} ·{' '}
          <QlDerived formula="sum of this customer's orders, not counting cancelled or deleted ones">{money(spent)}</QlDerived> spent
        </p>
      </QlHero>

      {noOrderBehindBalance ? (
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug text-ql-text">
            <span className="font-semibold">No order behind this balance.</span>{' '}
            <span className="text-ql-muted">The account says {money(balanceOwed)} is owed, but there are no sales for this customer. Check whether a sale was deleted.</span>
          </p>
        </div>
      ) : balanceMismatch ? (
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug text-ql-text">
            <span className="font-semibold">Balance and open orders differ.</span>{' '}
            <span className="text-ql-muted">
              The account says {money(balanceOwed)}; pending orders leave{' '}
              <QlDerived formula="pending orders: total − cash received">{money(unpaidOnOrders)}</QlDerived> unpaid.
            </span>
          </p>
        </div>
      ) : null}

      <QlTile className="p-0">
        <QlLabel as="h2" className="px-4 pb-1 pt-4">Contact</QlLabel>
        <ul>
          <ContactRow icon={<Phone className="h-4 w-4" strokeWidth={1.5} />} label="Phone" value={phone} href={phone ? `tel:${phone}` : undefined} action="Call" />
          <ContactRow icon={<Mail className="h-4 w-4" strokeWidth={1.5} />} label="Email" value={email} href={email ? `mailto:${email}` : undefined} action="Email" />
          <ContactRow icon={<MapPin className="h-4 w-4" strokeWidth={1.5} />} label="Address" value={address} />
        </ul>
        {/* TODO(concept): the board's "Add email / Add address" needs a customer edit form; none exists yet. */}
        {!email || !address || !phone ? (
          <p className="border-t border-ql-line px-4 py-3 font-ql-mono text-[11px] text-ql-muted">Editing a customer's details isn't available yet.</p>
        ) : null}
      </QlTile>

      <div className="flex items-center justify-between gap-2 pt-1">
        <QlLabel as="h2">Order history</QlLabel>
        {openOrders.length > 0 ? <QlChip tone="amber">{openOrders.length} pending</QlChip> : null}
      </div>

      {orders.length === 0 ? (
        <QlTile>
          <p className="text-[13px] leading-snug text-ql-muted">
            No sales to {name} yet.{' '}
            <Link
              href="/dashboard/sales?quick=sell"
              className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
            >
              Record a sale
            </Link>
          </p>
        </QlTile>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => {
            const owing = order.status === 'PENDING' ? Math.max(0, order.totalAmount - order.cashReceived) : 0;
            return (
              <li key={order.id} className={cn('rounded-2xl border border-ql-line bg-ql-surface p-4', order.isDeleted && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ql-text">Order {order.number}</p>
                    <p className="font-ql-mono text-[11px] text-ql-muted">
                      {new Date(order.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-ql-mono text-[15px] font-semibold text-ql-text">{money(order.totalAmount)}</p>
                    <div className="mt-1 flex justify-end gap-1">
                      {order.isDeleted ? <QlChip>Deleted</QlChip> : null}
                      <QlChip tone={STATUS_TONE[order.status] ?? 'neutral'}>{sentence(order.status)}</QlChip>
                    </div>
                  </div>
                </div>
                {order.items.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-ql-line pt-3">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-ql-muted">
                          {item.description} <span className="font-ql-mono">×{item.quantity}</span>
                        </span>
                        <span className="shrink-0 font-ql-mono text-ql-text">{money(item.totalPrice)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {order.discountAmount > 0 || owing > 0 ? (
                  <p className="mt-2 font-ql-mono text-[11px] text-ql-muted">
                    {order.discountAmount > 0 ? `${money(order.discountAmount)} off` : null}
                    {order.discountAmount > 0 && owing > 0 ? ' · ' : null}
                    {owing > 0 ? (
                      <span className="text-ql-coral">
                        <QlDerived formula="order total − cash received">{money(owing)}</QlDerived> still owed
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <QlTile className="flex items-center gap-3">
        <FileDown className="h-5 w-5 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ql-text">Statement PDF</p>
          <p className="text-xs text-ql-muted">Downloading a statement isn't built yet.</p>
        </div>
        <QlChip>Coming soon</QlChip>
      </QlTile>

      {/* TODO(concept): the board's account-level "Record payment". recordPayment() without an orderId only lowers
          the balance (no ledger entry, no order marked paid), so payments stay per order on Sales. */}
      {balanceOwed > EPSILON ? (
        <p className="font-ql-mono text-[11px] leading-relaxed text-ql-muted">
          Record a payment against its order on{' '}
          <Link href="/dashboard/sales" className="relative text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60">
            Sales
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

function ContactRow({ icon, label, value, href, action }: { icon: React.ReactNode; label: string; value: string | null; href?: string; action?: string }) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-t border-ql-line px-4 py-2 first:border-t-0">
      <span className="text-ql-muted" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">{label}</span>
        <span className={cn('block break-words text-[14px]', value ? 'text-ql-text' : 'text-ql-muted')}>{value || 'Not saved'}</span>
      </span>
      {value && href && action ? (
        <a
          href={href}
          className="flex min-h-11 shrink-0 items-center rounded-full border border-ql-line px-4 text-[13px] font-semibold text-ql-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
          aria-label={`${action} ${value}`}
        >
          {action}
        </a>
      ) : null}
    </li>
  );
}
