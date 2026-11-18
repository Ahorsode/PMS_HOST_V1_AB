'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { QlChip } from '@/components/ui/ql/Chip';
import { QlHero, QlLabel, QlTile } from '@/components/ui/ql/Surface';
import { QlMoney } from '@/components/ui/ql/Figure';
import { QlDerived } from '@/components/ui/ql/Derived';
import { QlSegmented } from '@/components/ui/ql/Segmented';
import { compactMoney } from '@/components/ui/ql/format';

export type MobileCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  balanceOwed: number;
  orderCount: number;
  totalSpent: number;
};

type Filter = 'all' | 'owes' | 'vip';

/** Customers on a phone: what you're owed first, then one row per customer with a call button. */
export function MobileCustomers({
  customers,
  currency,
  totalOwed,
  totalSpent,
  vipThreshold,
  canEdit,
}: {
  customers: MobileCustomer[];
  currency: string;
  totalOwed: number;
  totalSpent: number;
  /** A customer is VIP once they've spent more than this (same rule as desktop). */
  vipThreshold: number;
  canEdit: boolean;
}) {
  const money = (v: number) => formatCurrency(v, currency);
  const [filter, setFilter] = useState<Filter>('all');

  const debtors = customers.filter((c) => c.balanceOwed > 0);
  const vips = customers.filter((c) => c.totalSpent > vipThreshold);
  const largest = debtors.reduce<MobileCustomer | null>((top, c) => (!top || c.balanceOwed > top.balanceOwed ? c : top), null);
  const largestShare = largest && totalOwed > 0 ? Math.round((largest.balanceOwed / totalOwed) * 100) : null;

  const shown = useMemo(() => {
    const list = filter === 'owes' ? debtors : filter === 'vip' ? vips : customers;
    // Who owes the most first, then who spends the most.
    return [...list].sort((a, b) => b.balanceOwed - a.balanceOwed || b.totalSpent - a.totalSpent);
  }, [filter, customers, debtors, vips]);

  if (customers.length === 0) {
    return (
      <div className="space-y-3 pb-28 font-ql-sans">
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Customers</h1>
        <QlTile>
          <p className="text-[15px] font-semibold text-ql-text">No customers yet</p>
          <p className="mt-1 text-[13px] leading-snug text-ql-muted">
            {canEdit
              ? 'Add the people and businesses who buy from you, then pick them when you record a sale.'
              : 'Ask the farm owner to add a customer. You need edit access to customers to add one.'}
          </p>
        </QlTile>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 font-ql-sans', canEdit ? 'pb-28' : 'pb-4')}>
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Customers</h1>
        <p className="text-[13px] text-ql-muted">Who buys from you, and what they still owe</p>
      </div>

      <QlHero aria-labelledby="ql-owed-label">
        <QlLabel id="ql-owed-label">Owed to you</QlLabel>
        <QlMoney
          amount={totalOwed}
          currency={currency}
          className={cn('mt-2 block font-ql-display text-[36px] font-semibold leading-none', totalOwed > 0 ? 'text-ql-coral' : 'text-ql-text')}
        />
        <p className="mt-2 text-[13px] text-ql-muted">
          {totalOwed > 0 ? (
            <>
              <QlDerived formula="customers with a balance above 0, out of all customers">
                {debtors.length} of {customers.length}
              </QlDerived>{' '}
              customers owe you
              {largest && largestShare !== null && debtors.length > 1 ? (
                <>
                  {' · '}
                  {largest.name} holds{' '}
                  <QlDerived formula={`${largest.name}'s balance ÷ total owed`}>{largestShare}%</QlDerived>
                </>
              ) : null}
            </>
          ) : (
            'Everyone is paid up.'
          )}
        </p>
      </QlHero>

      <div className="grid grid-cols-2 gap-3">
        <QlTile>
          <QlLabel>Customers</QlLabel>
          <p className="mt-2 font-ql-display text-[22px] font-semibold leading-none text-ql-text">{customers.length}</p>
          <p className="mt-1 text-xs text-ql-muted">{vips.length} VIP</p>
        </QlTile>
        <QlTile>
          <QlLabel>Total spent</QlLabel>
          <p className="mt-2 truncate font-ql-display text-[22px] font-semibold leading-none text-ql-text">
            <QlDerived formula="sum of every customer's sales">{money(totalSpent)}</QlDerived>
          </p>
          <p className="mt-1 text-xs text-ql-muted">All their sales</p>
        </QlTile>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <QlLabel as="h2">People</QlLabel>
        <QlSegmented
          label="Filter customers"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'owes', label: `Owes ${debtors.length}` },
            { value: 'vip', label: `VIP ${vips.length}` },
          ]}
        />
      </div>
      {filter === 'vip' ? (
        <p className="font-ql-mono text-[11px] text-ql-muted">VIP = spent more than {money(vipThreshold)}</p>
      ) : null}

      {shown.length === 0 ? (
        <QlTile>
          <p className="text-[13px] leading-snug text-ql-muted">
            {filter === 'owes' ? 'Nobody owes you anything right now.' : `No customer has spent more than ${money(vipThreshold)} yet.`}{' '}
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="relative font-semibold text-ql-mint after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
            >
              Show everyone
            </button>
          </p>
        </QlTile>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
          {shown.map((customer) => {
            const owes = customer.balanceOwed > 0;
            return (
              <li key={customer.id} className={cn('relative flex items-center border-b border-ql-line last:border-b-0', owes && 'shadow-[inset_3px_0_0_var(--ql-coral)]')}>
                <Link
                  href={`/dashboard/sales/customers/${customer.id}/statement`}
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
                >
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ql-text/[0.06] font-ql-display text-[14px] font-semibold text-ql-text"
                  >
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[15px] font-semibold leading-snug text-ql-text">{customer.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {owes ? (
                        <span className="font-ql-mono text-[13px] font-semibold text-ql-coral">Owes {money(customer.balanceOwed)}</span>
                      ) : customer.orderCount === 0 ? (
                        <QlChip>No sales yet</QlChip>
                      ) : (
                        <QlChip tone="mint">Paid up</QlChip>
                      )}
                      {customer.orderCount > 0 ? (
                        <span className="font-ql-mono text-[11px] text-ql-muted">
                          {customer.orderCount} {customer.orderCount === 1 ? 'sale' : 'sales'} · {compactMoney(customer.totalSpent, currency)} spent
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    aria-label={`Call ${customer.name}`}
                    className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ql-line text-ql-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
                  >
                    <Phone className="h-4 w-4" strokeWidth={1.5} />
                  </a>
                ) : (
                  <span
                    role="img"
                    aria-label={`No phone number saved for ${customer.name}`}
                    title="No phone number saved"
                    className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-ql-line text-ql-muted/60"
                  >
                    <Phone className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!canEdit ? (
        <p className="font-ql-mono text-[11px] text-ql-muted">Adding customers needs edit access to customers.</p>
      ) : null}
      {/* The one Add customer button is the page's sticky bar (see page.tsx). */}
    </div>
  );
}
