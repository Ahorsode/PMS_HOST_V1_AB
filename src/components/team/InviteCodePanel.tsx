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
    <div role="status" className="relative rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-5 backdrop-blur-md">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hide invite code"
        className="absolute right-3 top-3 rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-semibold text-white">
            One-time login code for <span className="break-all text-emerald-200">{issued.recipient}</span>
          </p>
          <p className="select-all font-mono text-3xl font-black tracking-[0.2em] text-white">{issued.code}</p>
          <p className="text-xs text-white/70">
            Share it with them yourself. It works once, expires in {INVITE_CODE_TTL_HOURS} hours, and they will
            choose their own password after signing in. You won't be able to see this code again.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white/15"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-bold uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-500/25"
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
