"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ProfileMenu } from './ProfileMenu';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';
import { PageTransition } from './PageTransition';
import { enterDashboardTheme } from './theme';
import { qlFontVariables } from '@/components/ui/ql/fonts';

function getMobileIndeptTitle(pathname: string): string {
  if (pathname.includes('/analytics')) return 'Analytics';
  const segments = pathname.split('/').filter(Boolean);
  if (segments[1] === 'flocks') return 'Batch details';
  if (segments[1] === 'sales' && segments[2] === 'customers') return segments.length > 3 ? 'Customer account' : 'Customers';
  if (segments[1] === 'sales') return 'Sale details';
  if (segments[1] === 'feed') return 'Feed details';
  return 'Details';
}

export const SidebarWrapper = ({
  children,
  role,
  permissions,
  farmName,
}: {
  children: React.ReactNode;
  role: string | undefined;
  permissions?: any;
  farmName?: string;
}) => {
  const pathname = usePathname();
  const router = useRouter();

  // Light or dark applies only while the dashboard is mounted.
  useEffect(() => enterDashboardTheme(), []);

  // Detail and analytics pages hide the main navigation and show a back bar instead.
  // /dashboard/flocks -> [dashboard, flocks]; /dashboard/flocks/[id] -> [dashboard, flocks, id]
  const segments = pathname.split('/').filter(Boolean);
  const isIndeptPage =
    pathname.includes('/analytics') ||
    (segments.length > 2 && (segments[1] === 'flocks' || segments[1] === 'sales' || segments[1] === 'feed'));

  return (
    <div className={cn('relative flex min-h-screen overflow-hidden bg-ql-ground selection:bg-accent/25 md:bg-page', qlFontVariables)}>
      {!isIndeptPage && (
        <>
          <Sidebar role={role} permissions={permissions} />
          <BottomNav role={role} permissions={permissions} />
        </>
      )}

      <main
        className={cn(
          'relative z-20 flex h-[100dvh] flex-1 flex-col overflow-hidden',
          isIndeptPage ? 'pl-0' : 'md:pl-[104px]'
        )}
      >
        {!isIndeptPage && (
          <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 bg-ql-ground px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] font-ql-sans md:hidden">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-[10px] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-ql-display text-[15px] font-semibold leading-tight text-ql-text">{farmName || 'Farm'}</p>
              <p className="text-xs leading-tight text-ql-muted">Operations</p>
            </div>
            <ProfileMenu role={role} permissions={permissions} />
          </header>
        )}
        <div
          className={cn(
            'custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto px-4 pt-3 md:px-8 md:pt-6',
            isIndeptPage ? 'pb-6 md:pb-12' : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12'
          )}
        >
          {isIndeptPage ? (
            <header className="sticky top-0 z-30 -mx-4 mb-3 flex items-center gap-3 border-b border-ql-line bg-ql-ground px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] font-ql-sans md:hidden">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ql-line text-ql-text transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <span className="min-w-0">
                <span className="block truncate font-ql-display text-[15px] font-semibold leading-tight text-ql-text">{getMobileIndeptTitle(pathname)}</span>
                <span className="block text-xs leading-tight text-ql-muted">{farmName || 'Farm'}</span>
              </span>
            </header>
          ) : null}
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
};
