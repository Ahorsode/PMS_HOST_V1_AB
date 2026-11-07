import React from 'react';
import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { sendTeamBroadcast } from '@/lib/actions/team-message-actions';
import { getTeamChatList, getTeamChatThread, getTeamChatViewer, getTeamUnreadCount } from '@/lib/team-messages/team-chat';
import { cn } from '@/lib/utils';
import { InboxTabs } from '../InboxTabs';
import { TeamChatAutoRefresh, TeamMessageComposer } from './TeamChatClient';
import { TeamChatHeader } from './TeamChatHeader';
import { TeamThread } from './TeamThread';

export const dynamic = 'force-dynamic';

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const shortTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

function when(date: Date, now = new Date()) {
  return date.toDateString() === now.toDateString() ? shortTime.format(date) : shortDate.format(date);
}

/**
 * Owners see everyone on the team and can message one person or all of them.
 * Staff go straight to their chat with the owner.
 */
export default async function TeamChatPage() {
  const viewer = await getTeamChatViewer();

  if (!viewer) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-0 md:px-5 pt-2 pb-9 md:py-9">
        <TeamChatHeader subtitle="Messages between the farm owner and the team" />
        <p className="rounded-lg border border-fg/10 bg-fg/5 px-6 py-10 text-center text-sm text-fg/60">Choose a farm to see its team chat.</p>
      </div>
    );
  }

  if (!viewer.isOwner) {
    // Load the thread first: it marks the chat read before the unread count.
    const thread = await getTeamChatThread(viewer);
    const unread = await getTeamUnreadCount(viewer);
    return (
      <div className="max-w-3xl mx-auto space-y-6 px-0 md:px-5 pt-2 pb-9 md:py-9">
        <TeamChatHeader subtitle={`Your messages with ${viewer.ownerName}`} />
        <div className="px-2">
          <InboxTabs active="team" unreadTeam={unread} />
        </div>
        {thread ? (
          <TeamThread thread={thread} />
        ) : (
          <p className="rounded-lg border border-fg/10 bg-fg/5 px-6 py-10 text-center text-sm text-fg/60">Team chat is only available to members of this farm.</p>
        )}
      </div>
    );
  }

  const rows = await getTeamChatList(viewer);
  const unread = rows.reduce((sum, row) => sum + row.unread, 0);
  const reachable = rows.filter((row) => row.status === 'active').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-0 md:px-5 pt-2 pb-9 md:py-9">
      <TeamChatAutoRefresh seconds={30} />
      <TeamChatHeader subtitle="Message your team, one person or everyone at once" />
      <div className="px-2">
        <InboxTabs active="team" unreadTeam={unread} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-fg/10 bg-fg/5 px-6 py-12 text-center">
          <Users className="h-10 w-10 text-fg/30" />
          <p className="font-medium text-fg">No one on your team yet</p>
          <p className="text-sm text-fg/60">Invite staff from the Team page, then you can message them here.</p>
          <Link href="/dashboard/team" className="mt-1 text-sm font-medium text-fg underline-offset-4 hover:underline">
            Go to Team
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-fg/10 overflow-hidden rounded-lg border border-fg/10 bg-fg/[0.03]">
            {rows.map((row) => (
              <li key={row.memberUserId}>
                <Link
                  href={`/dashboard/inbox/team/${row.memberUserId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-fg/[0.05]"
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      row.status === 'active' ? 'bg-pos/15 text-pos' : 'bg-fg/10 text-fg/50',
                    )}
                  >
                    {row.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={cn('truncate text-fg', row.unread > 0 ? 'font-semibold' : 'font-medium')}>{row.name}</p>
                      {row.lastMessage ? (
                        <time dateTime={row.lastMessage.createdAt.toISOString()} className="shrink-0 text-xs text-fg/50">
                          {when(row.lastMessage.createdAt)}
                        </time>
                      ) : null}
                    </div>
                    <p className={cn('truncate text-sm', row.unread > 0 ? 'text-fg' : 'text-fg/60')}>
                      {row.lastMessage
                        ? `${row.lastMessage.fromMe ? 'You: ' : ''}${row.lastMessage.body}`
                        : `${row.roleLabel}${row.status === 'paused' ? ' · access paused' : ''}`}
                    </p>
                  </div>
                  {row.unread > 0 ? (
                    <span className="shrink-0 rounded-full bg-pos px-2 py-0.5 text-xs font-semibold tabular-nums text-page" aria-label={`${row.unread} unread`}>
                      {row.unread}
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-fg/30" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {reachable > 0 ? (
            <section aria-labelledby="team-broadcast-heading" className="space-y-3 rounded-lg border border-fg/10 bg-fg/[0.03] px-4 py-4">
              <div>
                <h2 id="team-broadcast-heading" className="font-medium text-fg">Message everyone</h2>
                <p className="text-sm text-fg/60">
                  Sends the same message to each of your {reachable === 1 ? 'team member' : `${reachable} team members`} in their own chat. Replies come back to you one by one.
                </p>
              </div>
              <TeamMessageComposer action={sendTeamBroadcast} placeholder="Write to the whole team" submitLabel="Send to all" successNote="Sent to everyone." />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
