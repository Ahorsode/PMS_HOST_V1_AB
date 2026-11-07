"use client";

import React from 'react';
import Link from 'next/link';
import { Wheat, Skull, Activity, Egg, Syringe, Banknote, ShoppingBag, Home, HeartPulse } from 'lucide-react';
import { getBreedDisplayName } from '@/lib/livestock-breed-options';
import { g, ink } from '@/components/ui/graphite';

interface WorkerDashboardProps {
  stats: any;
  houses: any[];
  permissions?: any;
}

export function WorkerDashboard({ stats, houses, permissions }: WorkerDashboardProps) {
  const alerts = stats.alerts || [];
  const lowFeed = stats.lowFeedItems || [];
  const quickActions = [
    { label: 'Log feed', href: '/dashboard/feed?quick=log', canShow: !!permissions?.canEditFeeding, icon: Wheat },
    { label: 'Log eggs', href: '/dashboard/eggs?quick=log', canShow: !!permissions?.canEditEggs, icon: Egg },
    { label: 'Log deaths', href: '/dashboard/mortality#quick-logger', canShow: !!permissions?.canEditMortality, icon: Skull },
    { label: 'Isolate birds', href: '/dashboard/quarantine#quick-logger', canShow: !!permissions?.canEditMortality, icon: Syringe },
    { label: 'Record a sale', href: '/dashboard/sales?quick=sell', canShow: !!permissions?.canEditSales, icon: Banknote },
    { label: 'Add stock', href: '/dashboard/inventory?quick=add', canShow: !!permissions?.canEditInventory, icon: ShoppingBag },
    { label: 'Add house', href: '/dashboard/houses?quick=add', canShow: !!permissions?.canEditHouses, icon: Home },
    { label: 'Health', href: '/dashboard/health', canShow: !!permissions?.canEditHealth, icon: HeartPulse },
  ].filter((action) => action.canShow);

  const taskCount = alerts.length + lowFeed.length;

  return (
    <div className="space-y-6 pb-12">
      <header className="px-1">
        <h1 className={g.title}>Today&apos;s work</h1>
        <p className={`mt-2 text-sm ${g.secondary}`}>Log what happened on the farm and see what is due</p>
      </header>

      {quickActions.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {quickActions.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                className={`${g.tile} flex h-24 flex-col items-center justify-center gap-2 px-2 text-center transition-colors duration-150 hover:bg-[#232325] ${g.focus}`}
              >
                <Icon className="h-5 w-5 text-[#a1a1a6]" strokeWidth={1.5} />
                <span className="text-sm text-[#ededed]">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={g.card}>
          <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <h2 className={g.sectionTitle}>Due tasks and alerts</h2>
            <span className={`${g.ledger} tabular-nums`}>{taskCount}</span>
          </div>
          <ul className="space-y-1 p-2">
            {taskCount === 0 ? (
              <li className={`px-3 py-12 text-center text-sm ${g.secondary}`}>Nothing is due</li>
            ) : (
              <>
                {alerts.map((alert: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 rounded-lg px-3 py-2">
                    <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#85858b]" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm text-[#ededed]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ink.warning }} />
                        <span className="truncate">{alert.title}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-[#a1a1a6]">{alert.message}</p>
                    </div>
                  </li>
                ))}
                {lowFeed.map((item: any, idx: number) => (
                  <li key={`feed-${idx}`} className="flex items-start gap-3 rounded-lg px-3 py-2">
                    <Wheat className="mt-0.5 h-4 w-4 shrink-0 text-[#85858b]" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm text-[#ededed]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ink.negative }} />
                        <span className="truncate">Low stock: {item.name}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-xs tabular-nums text-[#a1a1a6]">{item.stockLevel} bags left</p>
                    </div>
                  </li>
                ))}
              </>
            )}
          </ul>
        </section>

        <section className={g.card}>
          <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <h2 className={g.sectionTitle}>Active units</h2>
            <span className={`${g.ledger} tabular-nums`}>{stats.activeBatches.length}</span>
          </div>
          <ul className="custom-scrollbar max-h-[500px] space-y-2 overflow-y-auto p-4">
            {stats.activeBatches.map((batch: any, index: number) => (
              <li key={batch.numericId} className={`${g.tile} flex items-center justify-between gap-4 px-4 py-3`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#ededed]">{batch.batchName || `Unit ${index + 1}`}</p>
                  <p className={`truncate ${g.ledger}`}>House {batch.houseNumber} · {getBreedDisplayName(batch.breed)}</p>
                </div>
                <span className="shrink-0 text-base font-medium tabular-nums text-[#ededed]">{batch.quantity.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
