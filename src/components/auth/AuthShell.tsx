import React from 'react';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Shown under the card: a "Have an account? Log in" line, legal links. */
  footer?: React.ReactNode;
  /** Wider card for forms with more than a few fields (onboarding). */
  wide?: boolean;
  children: React.ReactNode;
}

/**
 * The frame for every page a farmer sees before the dashboard: sign in, sign
 * up, password, onboarding. Logo, a short title and the form in one card on
 * the plain app background.
 */
export function AuthShell({ title, subtitle, footer, wide = false, children }: AuthShellProps) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-page px-4 py-10">
      <div className={cn('w-full', wide ? 'max-w-lg' : 'max-w-md')}>
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo.png" alt="Poultry Ledger" className="h-14 w-14 rounded-xl object-cover" />
          <h1 className="mt-4 text-2xl font-semibold leading-tight text-fg">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-sm text-[15px] leading-6 text-fg-2">{subtitle}</p> : null}
        </div>
        <div className="rounded-2xl border border-fg/[0.08] bg-card p-5 sm:p-7">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-fg-2">{footer}</div> : null}
      </div>
    </main>
  );
}

/** A thin "or" line between the main form and the Google button. */
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-fg/[0.08]" />
      <span className="text-[13px] text-fg-3">{label}</span>
      <span className="h-px flex-1 bg-fg/[0.08]" />
    </div>
  );
}
