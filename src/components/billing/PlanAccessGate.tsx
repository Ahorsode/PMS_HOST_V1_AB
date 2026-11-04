"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Lock } from 'lucide-react';

/** Pages a locked farm's owner can still open so they can pay or switch plan type. */
const OPEN_WHEN_LOCKED = ['/dashboard/license-upgrade', '/dashboard/settings', '/dashboard/profile'];

export type PlanStatus = {
  state: 'TRIAL' | 'PAID' | 'GRACE' | 'LOCKED';
  isTrial: boolean;
  endsAt: string | null;
  graceEndsAt: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(value: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS));
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function StatusBanner({ status }: { status: PlanStatus }) {
  const what = status.isTrial ? 'free trial' : 'plan';
  let message: string | null = null;

  if (status.state === 'GRACE') {
    message = `Your ${what} has ended. You have until ${formatDate(status.graceEndsAt)} to choose a plan before your farm is locked.`;
  } else if (status.state !== 'LOCKED' && status.endsAt && daysUntil(status.endsAt) <= 7) {
    const days = daysUntil(status.endsAt);
    message = `Your ${what} ends ${days <= 1 ? 'in 1 day' : `in ${days} days`} (${formatDate(status.endsAt)}).`;
  }

  if (!message) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2 font-semibold">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {message}
      </span>
      <Link
        href="/dashboard/license-upgrade"
        className="shrink-0 rounded-md bg-amber-400 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-[#451a03] hover:bg-amber-300"
      >
        Choose a plan
      </Link>
    </div>
  );
}

/**
 * Wraps the owner's dashboard: shows a reminder near the end of the trial or
 * plan and during the grace period, and once the farm is locked only lets
 * the owner reach the pages needed to pay.
 */
export function PlanAccessGate({ status, children }: { status: PlanStatus; children: React.ReactNode }) {
  const pathname = usePathname();
  const isOpenPage = OPEN_WHEN_LOCKED.some((path) => pathname.startsWith(path));

  if (status.state === 'LOCKED' && !isOpenPage) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-9 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
          <Lock className="h-9 w-9 text-rose-400" />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-white">
          {status.isTrial ? 'Your free trial has ended' : 'Your plan has ended'}
        </h1>
        <p className="mb-7 leading-relaxed text-white/75">
          Your records are safe. Choose a plan to unlock your farm and keep working.
        </p>
        <Link
          href="/dashboard/license-upgrade"
          className="rounded-md bg-white px-9 py-4 text-[11px] font-bold uppercase tracking-widest text-black transition-all hover:scale-105"
        >
          Choose a plan
        </Link>
      </div>
    );
  }

  return (
    <>
      <StatusBanner status={status} />
      {children}
    </>
  );
}
