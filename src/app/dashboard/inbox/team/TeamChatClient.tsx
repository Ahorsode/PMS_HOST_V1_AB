'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, SendHorizontal } from 'lucide-react';
import { TEAM_MESSAGE_MAX_LENGTH } from '@/lib/team-messages/shared';
import type { TeamMessageFormState } from '@/lib/actions/team-message-actions';
import { cn } from '@/lib/utils';

type SendAction = (prev: TeamMessageFormState, formData: FormData) => Promise<TeamMessageFormState>;

const INITIAL: TeamMessageFormState = { ok: false, error: null, sentAt: null };

/** Message box. Enter adds a new line; Ctrl/Cmd+Enter or the button sends. */
export function TeamMessageComposer({
  action,
  memberUserId,
  placeholder,
  submitLabel = 'Send',
  successNote,
}: {
  action: SendAction;
  memberUserId?: string;
  placeholder: string;
  submitLabel?: string;
  successNote?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (!state.sentAt) return;
    formRef.current?.reset();
    setLength(0);
  }, [state.sentAt]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      {memberUserId ? <input type="hidden" name="memberUserId" value={memberUserId} /> : null}
      <div className="flex items-end gap-2 rounded-xl border border-fg/[0.14] bg-page p-1.5 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <label className="sr-only" htmlFor={`team-message-${memberUserId ?? 'all'}`}>Message</label>
        <textarea
          id={`team-message-${memberUserId ?? 'all'}`}
          name="body"
          rows={2}
          required
          maxLength={TEAM_MESSAGE_MAX_LENGTH}
          placeholder={placeholder}
          disabled={pending}
          onChange={(event) => setLength(event.target.value.length)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="min-h-11 flex-1 resize-y bg-transparent px-2.5 py-2 text-base leading-6 text-fg placeholder:text-fg-3 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || length === 0}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-40"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
      <div className="flex justify-between gap-3 px-1 text-[13px] leading-5">
        <p role="status" className={cn(state.error ? 'font-medium text-neg' : 'text-fg-3')}>
          {state.error ?? (state.ok && successNote ? successNote : 'Ctrl + Enter to send')}
        </p>
        {length > TEAM_MESSAGE_MAX_LENGTH * 0.8 ? (
          <span className="tabular-nums text-fg-3">
            {length}/{TEAM_MESSAGE_MAX_LENGTH}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/** Refreshes the server-rendered chat every few seconds while the tab is visible. */
export function TeamChatAutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, seconds]);
  return null;
}

/** Keeps the newest message in view when the chat opens and when new ones arrive. */
export function ScrollToLatest({ count, children, className }: { count: number; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
