"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ProfileMenu } from './ProfileMenu';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';
import { PageTransition } from './PageTransition';

function getMobileIndeptTitle(pathname: string): string {
  if (pathname.includes('/analytics')) return 'Analytics';
  const segments = pathname.split('/').filter(Boolean);
  if (segments[1] === 'flocks') return 'Batch details';
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

  // Detail and analytics pages hide the main navigation and show a back bar instead.
  // /dashboard/flocks -> [dashboard, flocks]; /dashboard/flocks/[id] -> [dashboard, flocks, id]
  const segments = pathname.split('/').filter(Boolean);
  const isIndeptPage =
    pathname.includes('/analytics') ||
    (segments.length > 2 && (segments[1] === 'flocks' || segments[1] === 'sales' || segments[1] === 'feed'));

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#141415] selection:bg-[#34d399]/25">
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
          <header className="sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#0f0f10] px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#ededed]">{farmName || 'Farm'}</p>
              <p className="text-xs text-[#85858b]">Operations</p>
            </div>
            <ProfileMenu role={role} permissions={permissions} />
          </header>
        )}
        <div
          className={cn(
            'custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto px-3 pt-3 md:px-8 md:pt-6',
            isIndeptPage ? 'pb-6 md:pb-12' : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12'
          )}
        >
          {isIndeptPage ? (
            <header className="sticky top-0 z-30 -mx-3 mb-3 flex items-center gap-2 border-b border-white/[0.08] bg-[#0f0f10] px-3 py-2 md:hidden">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#a1a1a6] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#ededed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <span className="truncate text-sm font-medium text-[#ededed]">{getMobileIndeptTitle(pathname)}</span>
            </header>
          ) : null}
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
};
