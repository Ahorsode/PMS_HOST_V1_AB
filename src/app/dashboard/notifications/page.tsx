import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, BellRing, Settings, Wrench } from 'lucide-react';
import prisma from '@/lib/db';
import { getAuthContext } from '@/lib/auth-utils';
import { getFarmAccess } from '@/lib/subscription-utils';
import { getDashboardNotices } from '@/lib/settings/dashboard-notices';
import { AnnouncementBanner } from '@/components/site/AnnouncementBanner';

export const dynamic = 'force-dynamic';

/** Current farm notices (maintenance, announcements, plan reminders) in one list. */
export default async function NotificationsPage() {
  const { activeFarmId, isFarmOwner, role } = await getAuthContext();

  const farm = activeFarmId
    ? await prisma.farm.findUnique({ where: { id: activeFarmId }, select: { id: true, name: true, createdAt: true } }).catch(() => null)
    : null;
  const access = farm ? await getFarmAccess(farm.id).catch(() => null) : null;
  const { maintenanceMessage, announcement, notice } = await getDashboardNotices({ farm, access, isOwner: isFarmOwner });

  const canEditReminders = role === 'OWNER' || role === 'MANAGER';
  const isEmpty = !maintenanceMessage && !announcement && !notice;

  return (
    <div className="max-w-3xl mx-auto space-y-7 px-0 md:px-5 pt-2 pb-9 md:py-9">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 shrink-0">
            <ArrowLeft className="w-6 h-6 text-emerald-400" />
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-normal">Notifications</h1>
            <p className="text-white/70 font-bold uppercase tracking-[0.2em] text-xs md:text-sm mt-2">Notices for your farm</p>
          </div>
        </div>
        {canEditReminders && (
          <Link
            href="/dashboard/settings?tab=notifications"
            className="inline-flex items-center gap-2 self-start rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/85 transition-colors hover:bg-white/10 sm:self-auto"
          >
            <Settings className="h-4 w-4" />
            Reminder settings
          </Link>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-6 py-12 text-center">
          <Bell className="h-10 w-10 text-white/30" />
          <p className="font-bold text-white">You&apos;re all caught up</p>
          <p className="text-sm text-white/60">New notices about your farm will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {maintenanceMessage ? (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-4 text-sm leading-6 text-amber-50">
              <Wrench className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{maintenanceMessage}</p>
            </div>
          ) : null}
          {announcement ? <AnnouncementBanner announcement={announcement} className="py-4" /> : null}
          {notice ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-emerald-50">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold">{notice.title}</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 opacity-90">{notice.body}</p>
                {(notice.kind === 'trialEnding' || notice.kind === 'planExpired') && (
                  <Link href="/dashboard/license-upgrade" className="mt-3 inline-block text-sm font-bold text-emerald-300 underline-offset-4 hover:underline">
                    Choose a plan
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
