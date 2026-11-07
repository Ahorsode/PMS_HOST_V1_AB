import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  ClipboardList,
  Egg,
  Inbox,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Package,
  Settings,
  Syringe,
  Wheat,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import prisma from '@/lib/db';
import { getAuthContext } from '@/lib/auth-utils';
import { getFarmAccess } from '@/lib/subscription-utils';
import { getAppSettings } from '@/lib/settings/app-settings';
import { getDashboardNotices } from '@/lib/settings/dashboard-notices';
import { getDashboardMessages } from '@/lib/settings/farm-messages';
import { activeAnnouncement } from '@/lib/settings/schemas';
import { getFarmAlerts, type FarmAlert } from '@/lib/notifications/farm-alerts';
import { getTeamChatViewer, getTeamUnreadCount } from '@/lib/team-messages/team-chat';
import { cn } from '@/lib/utils';
import { InboxTabs } from './InboxTabs';

export const dynamic = 'force-dynamic';

type Filter = 'all' | 'messages' | 'alerts';

/**
 * The colour tells you who it is from: steel for the Poultry Ledger team,
 * green for your own team, yolk for something the farm needs to do, red when
 * it is urgent.
 */
const STYLES = {
  team: { card: 'border-l-pos', dot: 'bg-pos', icon: 'text-pos', badge: 'bg-pos/15 text-pos', label: 'Team' },
  message: { card: 'border-l-steel', dot: 'bg-steel', icon: 'text-steel', badge: 'bg-steel/15 text-steel', label: 'Poultry Ledger' },
  alert: { card: 'border-l-yolk', dot: 'bg-yolk', icon: 'text-yolk', badge: 'bg-yolk/15 text-yolk', label: 'Notification' },
  urgent: { card: 'border-l-neg', dot: 'bg-neg', icon: 'text-neg', badge: 'bg-neg/15 text-neg', label: 'Urgent' },
} as const;

type InboxItem = {
  id: string;
  group: 'messages' | 'alerts';
  style: keyof typeof STYLES;
  icon: LucideIcon;
  title: string;
  body: string;
  date?: Date;
  action?: { href: string; label: string };
};

const ALERT_ICONS: Record<FarmAlert['kind'], LucideIcon> = {
  EGGS: Egg,
  FEED: Wheat,
  VACCINE: Syringe,
  MEDICATION: ClipboardList,
  LOW_FEED: Package,
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** Messages from the Poultry Ledger team and alerts about the farm, in one list. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter: Filter = show === 'messages' || show === 'alerts' ? show : 'all';
  const { activeFarmId, isFarmOwner, role } = await getAuthContext();

  const farm = activeFarmId
    ? await prisma.farm.findUnique({ where: { id: activeFarmId }, select: { id: true, name: true, createdAt: true } }).catch(() => null)
    : null;
  const [access, alerts, messages, site, teamViewer] = await Promise.all([
    farm ? getFarmAccess(farm.id).catch(() => null) : Promise.resolve(null),
    farm ? getFarmAlerts() : Promise.resolve([]),
    farm ? getDashboardMessages(farm.id, isFarmOwner, new Date(), 50) : Promise.resolve([]),
    getAppSettings('site'),
    farm ? getTeamChatViewer().catch(() => null) : Promise.resolve(null),
  ]);
  const teamUnread = teamViewer ? await getTeamUnreadCount(teamViewer) : 0;
  const { maintenanceMessage, notice } = await getDashboardNotices({ farm, access, isOwner: isFarmOwner });
  const announcement = activeAnnouncement(site, 'dashboard');

  // Unread team chat first, then alerts (most urgent at the top), then messages from Poultry Ledger, newest first.
  const items: InboxItem[] = [];
  if (teamUnread > 0) {
    items.push({
      id: 'team-unread',
      group: 'messages',
      style: 'team',
      icon: MessagesSquare,
      title: teamUnread === 1 ? '1 unread team message' : `${teamUnread} unread team messages`,
      body: isFarmOwner ? 'Your team has written to you.' : 'The farm owner has written to you.',
      action: { href: '/dashboard/inbox/team', label: 'Open team chat' },
    });
  }
  if (maintenanceMessage) {
    items.push({ id: 'maintenance', group: 'alerts', style: 'alert', icon: Wrench, title: 'Maintenance', body: maintenanceMessage });
  }
  for (const alert of alerts) {
    items.push({
      id: alert.id,
      group: 'alerts',
      style: alert.severity === 'urgent' ? 'urgent' : 'alert',
      icon: ALERT_ICONS[alert.kind],
      title: alert.title,
      body: alert.message,
      action: { href: alert.href, label: alert.actionLabel },
    });
  }
  if (notice) {
    const needsPlan = notice.kind === 'trialEnding' || notice.kind === 'planExpired';
    items.push({
      id: `notice:${notice.kind}`,
      group: 'alerts',
      style: notice.kind === 'planExpired' ? 'urgent' : 'alert',
      icon: BellRing,
      title: notice.title,
      body: notice.body,
      action: needsPlan ? { href: '/dashboard/license-upgrade', label: 'Choose a plan' } : undefined,
    });
  }
  if (announcement) {
    items.push({ id: 'announcement', group: 'messages', style: 'message', icon: Megaphone, title: 'Announcement', body: announcement.message });
  }
  for (const message of messages) {
    items.push({
      id: `message:${message.id}`,
      group: 'messages',
      style: 'message',
      icon: MessageSquare,
      title: message.title,
      body: message.body,
      date: message.createdAt,
    });
  }

  const counts = {
    all: items.length,
    messages: items.filter((item) => item.group === 'messages').length,
    alerts: items.filter((item) => item.group === 'alerts').length,
  };
  const visible = filter === 'all' ? items : items.filter((item) => item.group === filter);
  const canEditReminders = role === 'OWNER' || role === 'MANAGER';

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-0 md:px-5 pt-2 pb-9 md:py-9">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" aria-label="Back to dashboard" className="p-3 bg-fg/5 hover:bg-fg/10 rounded-full transition-colors border border-fg/10 shrink-0">
            <ArrowLeft className="w-6 h-6 text-fg-3" />
          </Link>
          <div>
            <h1 className="text-3xl font-medium leading-tight text-fg">Inbox</h1>
            <p className="text-fg/70 font-medium text-xs md:text-sm mt-2">Farm notifications, team chat and messages from Poultry Ledger</p>
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

      <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <InboxTabs active={filter} counts={counts} unreadTeam={teamUnread} />
        <ul aria-label="Colour key" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg/60">
          {(['alert', 'urgent', 'message', 'team'] as const).map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', STYLES[key].dot)} />
              {STYLES[key].label}
            </li>
          ))}
        </ul>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-fg/10 bg-fg/5 px-6 py-12 text-center">
          <Inbox className="h-10 w-10 text-fg/30" />
          <p className="font-medium text-fg">{filter === 'messages' ? 'No messages' : "You're all caught up"}</p>
          <p className="text-sm text-fg/60">
            {filter === 'messages'
              ? 'Messages from the Poultry Ledger team will show up here.'
              : 'Reminders, health tasks, stock alerts and messages will show up here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const style = STYLES[item.style];
            const Icon = item.icon;
            return (
              <li key={item.id} className={cn('flex items-start gap-3 rounded-lg border border-l-4 border-fg/[0.08] bg-fg/[0.04] px-4 py-4 text-fg', style.card)}>
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', style.badge)}>{style.label}</span>
                    <p className="font-medium">{item.title}</p>
                    {item.date ? (
                      <time dateTime={item.date.toISOString()} className="ml-auto text-xs text-fg/50">
                        {formatDate(item.date)}
                      </time>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-fg/80">{item.body}</p>
                  {item.action ? (
                    <Link href={item.action.href} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-fg underline-offset-4 hover:underline">
                      {item.action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
