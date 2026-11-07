import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getTeamChatThread, getTeamChatViewer, getTeamUnreadCount } from '@/lib/team-messages/team-chat';
import { InboxTabs } from '../../InboxTabs';
import { TeamChatHeader } from '../TeamChatHeader';
import { TeamThread } from '../TeamThread';

export const dynamic = 'force-dynamic';

/** Owner's chat with one team member. Staff only have one chat, so they go back to it. */
export default async function TeamMemberChatPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const viewer = await getTeamChatViewer();
  if (!viewer || !viewer.isOwner) redirect('/dashboard/inbox/team');

  const thread = await getTeamChatThread(viewer, memberId);
  if (!thread) notFound();
  // Read after loading the thread, which marks it read.
  const unread = await getTeamUnreadCount(viewer);

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-0 md:px-5 pt-2 pb-9 md:py-9">
      <TeamChatHeader subtitle={`Your messages with ${thread.other.name}`} />
      <div className="px-2">
        <InboxTabs active="team" unreadTeam={unread} />
      </div>
      <TeamThread thread={thread} />
    </div>
  );
}
