'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Box, ChevronRight, Egg, Home, Loader2, Monitor, Shield, ShoppingCart, SlidersHorizontal, Trash2, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countryName } from '@/lib/farm/countries';
import { qlButton } from '@/components/ui/ql/Button';
import { QL_PRIMARY_ATTR } from '@/components/ui/ql/primary';

type Row = { href: string; label: string; value: string; icon: React.ElementType };

const DISCOUNT_LABEL: Record<string, string> = { item: 'free items', flat: 'amount', percent: 'percent' };

/** The phone settings home: plan, then three short groups that show each setting's value today. */
export function SettingsHomePhone({
  farm,
  plan,
  loading,
  growthTargetName,
  eggUnit,
  eggSorted,
  discountsOn,
  discountType,
  eggReminderTime,
  feedReminderTime,
  inventory,
  showDevices,
}: {
  farm: { name?: string | null; location?: string | null; capacity?: number | null; country?: string | null } | null;
  plan?: React.ReactNode;
  loading: boolean;
  growthTargetName: string | null;
  eggUnit: 'crate' | 'individual';
  eggSorted: boolean;
  discountsOn: boolean;
  discountType: string;
  eggReminderTime: string;
  feedReminderTime: string;
  inventory: Array<{ id: string; itemName: string; unit: string; reorderLevel?: number }>;
  showDevices: boolean;
}) {
  const wait = 'Loading…';
  const stockValue =
    inventory.length === 0
      ? 'No feed in stock yet'
      : inventory.length === 1
        ? `${inventory[0].itemName}: alert below ${inventory[0].reorderLevel ?? 500} ${inventory[0].unit || 'units'}`
        : `${inventory.length} feeds have alert levels`;

  const groups: Array<{ title: string; rows: Row[] }> = [
    {
      title: 'Farm',
      rows: [
        {
          href: '/dashboard/settings?tab=farm',
          label: 'Farm info',
          icon: Home,
          value: [farm?.name || 'No name', farm?.location || 'no town', farm?.capacity ? `${Number(farm.capacity).toLocaleString('en-US')} birds` : null]
            .filter(Boolean)
            .join(' · '),
        },
        {
          href: '/dashboard/settings?tab=farm#farm-defaults',
          label: 'Farm defaults',
          icon: SlidersHorizontal,
          value: loading
            ? wait
            : `${farm?.country ? countryName(farm.country) : 'Country not set'} · ${growthTargetName ? growthTargetName : 'growth standard not set'}`,
        },
        { href: '/dashboard/houses', label: 'Houses', icon: Warehouse, value: 'Add, rename or remove' },
      ],
    },
    {
      title: 'Rules for workers',
      rows: [
        {
          href: '/dashboard/settings?tab=egg-logging',
          label: 'Egg logging',
          icon: Egg,
          value: loading ? wait : `${eggUnit === 'crate' ? 'Crates' : 'Single eggs'} · ${eggSorted ? 'sorted by size' : 'not sorted'}`,
        },
        {
          href: '/dashboard/settings?tab=sales',
          label: 'Sales',
          icon: ShoppingCart,
          value: loading ? wait : discountsOn ? `Discounts on · by ${DISCOUNT_LABEL[discountType] ?? discountType}` : 'Discounts off',
        },
        {
          href: '/dashboard/settings?tab=notifications',
          label: 'Reminders',
          icon: Bell,
          value: loading ? wait : `Eggs ${eggReminderTime} · Feeding ${feedReminderTime}`,
        },
        { href: '/dashboard/settings?tab=preferences', label: 'Stock levels', icon: Box, value: stockValue },
      ],
    },
    {
      title: 'Account and data',
      rows: [
        { href: '/dashboard/settings?tab=security', label: 'Security', icon: Shield, value: 'Password and sign-in' },
        ...(showDevices ? [{ href: '/dashboard/settings/desktop-licenses', label: 'Connected devices', icon: Monitor, value: 'Desktop app sign-ins' }] : []),
        { href: '/dashboard/settings/trash', label: 'Deleted records', icon: Trash2, value: 'Restore batches and logs' },
      ],
    },
  ];

  return (
    <div className="space-y-3 font-ql-sans md:hidden">
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Settings</h1>
        <p className="text-[13px] text-ql-muted">Farm details, preferences and defaults</p>
      </div>
      {plan}
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title} className="space-y-2 pt-1">
          <h2 className="px-1 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">{group.title}</h2>
          <ul className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface">
            {group.rows.map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.label} className="border-b border-ql-line last:border-b-0">
                  <Link
                    href={row.href}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
                  >
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ql-line bg-ql-ground text-ql-muted">
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ql-text">{row.label}</span>
                      <span className="block truncate text-[12px] text-ql-muted">{row.value}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * The one Save on a phone settings screen, fixed above the tab bar. It stays
 * dim until something changes, and says so.
 */
export function PhoneSaveBar({
  dirty,
  busy,
  onClick,
  type = 'button',
}: {
  dirty: boolean;
  busy: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+max(env(safe-area-inset-bottom),6px))] z-40 border-t border-ql-line bg-ql-ground/95 px-4 pb-3 pt-2 font-ql-sans backdrop-blur md:hidden">
      {!dirty && !busy ? (
        <p id="ql-save-reason" className="mb-2 text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">
          No changes yet
        </p>
      ) : null}
      <button
        type={type}
        onClick={onClick}
        disabled={!dirty || busy}
        aria-describedby={!dirty && !busy ? 'ql-save-reason' : undefined}
        className={cn(qlButton('filled', 'min-h-12 w-full rounded-2xl'))}
        {...QL_PRIMARY_ATTR}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {busy ? 'Saving' : 'Save changes'}
      </button>
    </div>
  );
}
