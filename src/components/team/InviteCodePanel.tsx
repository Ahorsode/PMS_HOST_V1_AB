'use client';

import React, { useState } from 'react';
import { Check, Copy, KeyRound, MessageCircle, X } from 'lucide-react';
import { INVITE_CODE_TTL_HOURS } from '@/lib/invite-code-constants';

export type IssuedInviteCode = { code: string; recipient: string };

/**
 * Shows a freshly issued one-time login code to the owner or manager. The
 * code is never stored in plain text, so this is the only time it is visible.
 */
export function InviteCodePanel({ issued, onDismiss }: { issued: IssuedInviteCode; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const shareText =
    `You've been added to our farm on Poultry Ledger. Sign in at ${typeof window !== 'undefined' ? window.location.origin : ''}/login ` +
    `with ${issued.recipient} and this one-time code: ${issued.code}. It expires in ${INVITE_CODE_TTL_HOURS} hours and you'll choose your own password after signing in.`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div role="status" className="relative rounded-xl border border-accent/30 bg-accent/10 p-5">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide invite code"
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-fg-2 transition-colors hover:bg-fg/10 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <X className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-fg-3" />
        <div className="min-w-0 flex-1 space-y-3 pr-8">
          <p className="text-sm font-medium text-fg">
            One-time login code for <span className="break-all text-fg">{issued.recipient}</span>
          </p>
          <p className="select-all font-mono text-3xl font-medium text-fg">{issued.code}</p>
          <p className="text-[13px] leading-5 text-fg-2">
            Share it with them yourself. It works once, expires in {INVITE_CODE_TTL_HOURS} hours, and they will
            choose their own password after signing in. You won't be able to see this code again.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {copied ? <Check className="h-4 w-4" strokeWidth={2} /> : <Copy className="h-4 w-4" strokeWidth={1.75} />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-fg/[0.14] px-4 text-sm font-medium text-fg transition-colors hover:bg-fg/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              Share on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
