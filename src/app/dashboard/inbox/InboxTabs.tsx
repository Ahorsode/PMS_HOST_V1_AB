import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type InboxTab = 'all' | 'alerts' | 'messages' | 'team';

const TABS: { id: InboxTab; label: string; href: string }[] = [
  { id: 'all', label: 'All', href: '/dashboard/inbox' },
  { id: 'alerts', label: 'Notifications', href: '/dashboard/inbox?show=alerts' },
  { id: 'messages', label: 'Messages', href: '/dashboard/inbox?show=messages' },
  { id: 'team', label: 'Team chat', href: '/dashboard/inbox/team' },
];

/**
 * Filter tabs shared by the Inbox and Team chat pages. `counts` shows a total
 * next to a tab; `unreadTeam` shows a highlighted unread count on Team chat.
 */
export function InboxTabs({
  active,
  counts,
  unreadTeam = 0,
}: {
  active: InboxTab;
  counts?: Partial<Record<InboxTab, number>>;
  unreadTeam?: number;
}) {
  return (
    <nav aria-label="Inbox sections" className="-mx-1 flex gap-1 overflow-x-auto rounded-lg border border-fg/10 bg-fg/5 p-1">
      {TABS.map((tab) => {
        const count = counts?.[tab.id];
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? 'page' : undefined}
            className={cn(
              'flex shrink-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
              active === tab.id ? 'bg-fg/10 text-fg' : 'text-fg/60 hover:text-fg',
            )}
          >
            {tab.label}
            {tab.id === 'team' && unreadTeam > 0 ? (
              <span className="rounded-full bg-pos px-1.5 text-[11px] font-semibold tabular-nums text-page" aria-label={`${unreadTeam} unread`}>
                {unreadTeam}
              </span>
            ) : count !== undefined ? (
              <span className="tabular-nums text-fg/50">{count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
