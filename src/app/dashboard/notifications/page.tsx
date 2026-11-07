import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bell, BellRing, ClipboardList, Egg, Package, Settings, Syringe, Wheat, Wrench } from 'lucide-react';
import prisma from '@/lib/db';
import { getAuthContext } from '@/lib/auth-utils';
import { getFarmAccess } from '@/lib/subscription-utils';
import { getDashboardNotices } from '@/lib/settings/dashboard-notices';
import { getFarmAlerts, type FarmAlert } from '@/lib/notifications/farm-alerts';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const KIND_ICONS: Record<FarmAlert['kind'], typeof Bell> = {
  EGGS: Egg,
  FEED: Wheat,
  VACCINE: Syringe,
  MEDICATION: ClipboardList,
  LOW_FEED: Package,
};

const SEVERITY_STYLES: Record<FarmAlert['severity'], { card: string; icon: string }> = {
  urgent: { card: 'border-neg/40', icon: 'text-neg' },
  warning: { card: 'border-yolk/40', icon: 'text-yolk' },
  info: { card: 'border-fg/[0.08]', icon: 'text-fg/60' },
};

/**
 * What needs attention on this farm right now: missing daily logs, health
 * tasks due, low feed, plus service and plan notices. Messages written by the
 * Poultry Ledger team live on the Messages page instead.
 */
export default async function NotificationsPage() {
  const { activeFarmId, isFarmOwner, role } = await getAuthContext();

  const farm = activeFarmId
    ? await prisma.farm.findUnique({ where: { id: activeFarmId }, select: { id: true, name: true, createdAt: true } }).catch(() => null)
    : null;
  const [access, alerts] = await Promise.all([
    farm ? getFarmAccess(farm.id).catch(() => null) : Promise.resolve(null),
    farm ? getFarmAlerts() : Promise.resolve([]),
  ]);
  const { maintenanceMessage, notice } = await getDashboardNotices({ farm, access, isOwner: isFarmOwner });

  const canEditReminders = role === 'OWNER' || role === 'MANAGER';
  const hasAccountNotices = Boolean(maintenanceMessage || notice);
  const isEmpty = alerts.length === 0 && !hasAccountNotices;

  return (
    <div className="max-w-3xl mx-auto space-y-7 px-0 md:px-5 pt-2 pb-9 md:py-9">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="p-3 bg-fg/5 hover:bg-fg/10 rounded-full transition-colors border border-fg/10 shrink-0">
            <ArrowLeft className="w-6 h-6 text-fg-3" />
          </Link>
          <div>
            <h1 className="text-3xl font-medium leading-tight text-fg">Notifications</h1>
            <p className="text-fg/70 font-medium text-xs md:text-sm mt-2">What needs attention on your farm</p>
          </div>
        </div>
        {canEditReminders && (
          <Link
            href="/dashboard/settings?tab=notifications"
            className="inline-flex items-center gap-2 self-start rounded-md border border-fg/10 bg-fg/5 px-4 py-2.5 text-sm font-medium text-fg/85 transition-colors hover:bg-fg/10 sm:self-auto"
          >
            <Settings className="h-4 w-4" />
            Reminder settings
          </Link>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-fg/10 bg-fg/5 px-6 py-12 text-center">
          <Bell className="h-10 w-10 text-fg/30" />
          <p className="font-medium text-fg">You&apos;re all caught up</p>
          <p className="text-sm text-fg/60">Reminders, health tasks and stock alerts will show up here.</p>
        </div>
      ) : (
        <>
          {hasAccountNotices ? (
            <section className="space-y-3">
              {maintenanceMessage ? (
                <div role="alert" className="flex items-start gap-3 rounded-lg border border-yolk/40 bg-fg/[0.04] px-4 py-4 text-sm leading-6 text-fg">
                  <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-yolk" />
                  <p>{maintenanceMessage}</p>
                </div>
              ) : null}
              {notice ? (
                <div className="flex items-start gap-3 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-4 py-4 text-fg">
                  <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-fg/60" />
                  <div className="min-w-0">
                    <p className="font-medium">{notice.title}</p>
                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-fg/80">{notice.body}</p>
                    {(notice.kind === 'trialEnding' || notice.kind === 'planExpired') && (
                      <Link href="/dashboard/license-upgrade" className="mt-3 inline-block text-sm font-medium text-fg underline-offset-4 hover:underline">
                        Choose a plan
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {alerts.length > 0 ? (
            <section aria-labelledby="farm-alerts-heading" className="space-y-3">
              <h2 id="farm-alerts-heading" className="px-2 text-sm font-medium text-fg/70">
                On the farm · {alerts.length}
              </h2>
              <ul className="space-y-3">
                {alerts.map((alert) => {
                  const Icon = KIND_ICONS[alert.kind];
                  const style = SEVERITY_STYLES[alert.severity];
                  return (
                    <li key={alert.id} className={cn('flex items-start gap-3 rounded-lg border bg-fg/[0.04] px-4 py-4 text-fg', style.card)}>
                      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{alert.title}</p>
                        <p className="mt-1 break-words text-sm leading-6 text-fg/80">{alert.message}</p>
                        <Link
                          href={alert.href}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-fg underline-offset-4 hover:underline"
                        >
                          {alert.actionLabel}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
