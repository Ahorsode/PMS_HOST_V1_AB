import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Info, MessageSquare, TriangleAlert } from 'lucide-react';
import { getAuthContext } from '@/lib/auth-utils';
import { getDashboardMessages } from '@/lib/settings/farm-messages';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TONES = {
  info: { icon: Info, className: 'border-white/[0.08] bg-white/[0.04] text-emerald-50' },
  warning: { icon: TriangleAlert, className: 'border-amber-400/35 bg-white/[0.04] text-amber-50' },
  success: { icon: CheckCircle2, className: 'border-white/[0.08] bg-white/[0.04] text-emerald-50' },
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** Every in-app message the Poultry Ledger team has sent to this farm that is still showing. */
export default async function MessagesPage() {
  const { activeFarmId, isFarmOwner } = await getAuthContext();
  const messages = activeFarmId ? await getDashboardMessages(activeFarmId, isFarmOwner, new Date(), 50) : [];

  return (
    <div className="max-w-3xl mx-auto space-y-7 px-0 md:px-5 pt-2 pb-9 md:py-9">
      <div className="flex items-center gap-4 px-2">
        <Link href="/dashboard" aria-label="Back to dashboard" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 shrink-0">
          <ArrowLeft className="w-6 h-6 text-[#85858b]" />
        </Link>
        <div>
          <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Messages</h1>
          <p className="text-white/70 font-medium text-xs md:text-sm mt-2">From the Poultry Ledger team</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-6 py-12 text-center">
          <MessageSquare className="h-10 w-10 text-white/30" />
          <p className="font-medium text-white">No messages</p>
          <p className="text-sm text-white/60">Messages sent to your farm will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => {
            const tone = TONES[message.tone];
            const Icon = tone.icon;
            return (
              <li key={message.id} className={cn('flex items-start gap-3 rounded-lg border px-4 py-4', tone.className)}>
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-medium">{message.title}</p>
                    <time dateTime={message.createdAt.toISOString()} className="text-xs text-white/50">
                      {formatDate(message.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 opacity-90">{message.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
