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
    <div role="status" className="relative rounded-lg border border-fg/[0.08] bg-fg/[0.04] p-5">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide invite code"
        className="absolute right-3 top-3 rounded-md p-1 text-fg/60 transition hover:bg-fg/10 hover:text-fg"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-fg-3" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium text-fg">
            One-time login code for <span className="break-all text-fg">{issued.recipient}</span>
          </p>
          <p className="select-all font-mono text-3xl font-medium text-fg">{issued.code}</p>
          <p className="text-xs text-fg/70">
            Share it with them yourself. It works once, expires in {INVITE_CODE_TTL_HOURS} hours, and they will
            choose their own password after signing in. You won't be able to see this code again.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-md border border-fg/15 bg-fg/10 px-3 py-2 text-xs font-medium text-fg transition hover:bg-fg/15"
            >
              {copied ? <Check className="h-4 w-4 text-fg-3" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-xs font-medium text-fg transition hover:bg-fg/[0.04]"
            >
              <MessageCircle className="h-4 w-4" />
              Share on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
