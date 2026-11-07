import React from 'react';
import { MessagesSquare } from 'lucide-react';
import { sendTeamMessage } from '@/lib/actions/team-message-actions';
import type { TeamChatThread } from '@/lib/team-messages/team-chat';
import { cn } from '@/lib/utils';
import { ScrollToLatest, TeamChatAutoRefresh, TeamMessageComposer } from './TeamChatClient';

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** A chat between the owner and one team member: messages, then the message box. */
export function TeamThread({ thread }: { thread: TeamChatThread }) {
  let lastDay = '';

  return (
    <section aria-label={`Chat with ${thread.other.name}`} className="flex flex-col overflow-hidden rounded-lg border border-fg/10 bg-fg/[0.03]">
      <TeamChatAutoRefresh />
      <header className="flex items-center gap-3 border-b border-fg/10 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pos/15 text-sm font-semibold text-pos">
          {thread.other.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{thread.other.name}</p>
          <p className="text-xs text-fg/60">{thread.other.roleLabel}</p>
        </div>
      </header>

      <ScrollToLatest count={thread.messages.length} className="max-h-[60vh] min-h-[240px] space-y-2 overflow-y-auto px-3 py-4 sm:px-4">
        {thread.messages.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <MessagesSquare className="h-8 w-8 text-fg/30" />
            <p className="text-sm text-fg/60">
              {thread.viewerIsOwner ? `No messages with ${thread.other.name} yet.` : 'No messages with the farm owner yet.'}
            </p>
          </div>
        ) : (
          thread.messages.map((message) => {
            const day = dayFormat.format(message.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <React.Fragment key={message.id}>
                {showDay ? <p className="py-2 text-center text-xs text-fg/45">{day}</p> : null}
                <div className={cn('flex', message.fromMe ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-6 sm:max-w-[75%]',
                      message.fromMe ? 'rounded-br-sm bg-pos/15 text-fg' : 'rounded-bl-sm border border-fg/10 bg-fg/[0.06] text-fg',
                    )}
                  >
                    <p className="whitespace-pre-line break-words">{message.body}</p>
                    <time dateTime={message.createdAt.toISOString()} className="mt-0.5 block text-right text-[11px] text-fg/50">
                      {timeFormat.format(message.createdAt)}
                    </time>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </ScrollToLatest>

      <div className="border-t border-fg/10 px-3 py-3 sm:px-4">
        {thread.canSend ? (
          <TeamMessageComposer
            action={sendTeamMessage}
            memberUserId={thread.viewerIsOwner ? thread.memberUserId : undefined}
            placeholder={`Message ${thread.other.name}`}
          />
        ) : (
          <p className="px-1 py-2 text-sm text-fg/60">{thread.cantSendReason}</p>
        )}
      </div>
    </section>
  );
}
