"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { formatRoleLabel } from '@/lib/navigation-permissions';
import {
  DASHBOARD_NAV_ITEM,
  canShowDashboardNavItem,
  getActiveNavCategoryId,
  getVisibleNavCategories,
  isNavItemActive,
} from '@/lib/app-navigation';
import { useNavGroupMenu } from './useNavGroupMenu';
import { groupHue } from '@/components/ui/graphite';

const ease = [0.22, 1, 0.36, 1] as const;

export const BottomNav = ({ role, permissions }: { role?: string; permissions?: any }) => {
  const pathname = usePathname();
  const roleLabel = formatRoleLabel(role);
  const { openId, toggle, close, containerRef, registerTrigger } = useNavGroupMenu<HTMLDivElement>();

  const categories = useMemo(() => getVisibleNavCategories(role, permissions), [role, permissions]);
  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);
  const activeId = getActiveNavCategoryId(pathname, categories);
  const openCategory = categories.find((category) => category.id === openId);
  const showDashboard = canShowDashboardNavItem(role, permissions);
  const dashboardActive = pathname === DASHBOARD_NAV_ITEM.href;
  const dashboardHighlighted = !openId && dashboardActive;

  return (
    <div ref={containerRef} className="md:hidden">
      <AnimatePresence>
        {openCategory && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease }}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              className="absolute inset-0 bg-black/60"
              onClick={close}
            />
          </motion.div>
        )}
        {openCategory && (
          <motion.div
            key={openCategory.id}
            id={`mobile-nav-sheet-${openCategory.id}`}
            role="group"
            aria-label={`${openCategory.name} pages`}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.24, ease }}
            className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex max-h-[min(75dvh,640px)] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-white/[0.08] bg-[#141415] shadow-[0_-16px_48px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between px-4 pb-3 pt-4">
              <div>
                <p className="flex items-center gap-2 text-xs text-[#85858b]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: groupHue[openCategory.id] }} />
                  Farm menu
                </p>
                <h2 className="text-lg font-medium text-[#ededed]">{openCategory.name}</h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-[#232325] text-[#a1a1a6]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {openCategory.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href, allItems);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-14 min-w-0 items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-150',
                        active
                          ? 'border-white/[0.1] bg-[#232325] text-[#ededed]'
                          : 'border-white/[0.06] bg-[#19191b] text-[#ededed]'
                      )}
                    >
                      <item.icon
                        className="h-5 w-5 shrink-0"
                        style={{ color: active ? groupHue[openCategory.id] : '#85858b' }}
                        strokeWidth={1.5}
                      />
                      <span className="min-w-0 text-sm leading-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {openCategory.id === 'governance' && (
                <div className="mt-4 border-t border-white/[0.08] pt-3">
                  <p className="mb-2 px-1 text-xs text-[#85858b]">Signed in as {roleLabel}</p>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[#f2777b]"
                  >
                    <LogOut className="h-5 w-5" strokeWidth={1.5} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-[#0f0f10] pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${Math.max(categories.length + (showDashboard ? 1 : 0), 1)}, minmax(0, 1fr))` }}
        >
          {showDashboard && (
            <Link
              href={DASHBOARD_NAV_ITEM.href}
              onClick={close}
              aria-current={dashboardActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-1 border-r border-white/[0.06] px-1 text-[#ededed]"
            >
              {/* Raised flat emerald button so Dashboard stays apart from the group tabs */}
              <span
                className={cn(
                  '-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#34d399] text-[#062016] ring-4 ring-[#0f0f10]',
                  dashboardHighlighted && 'outline outline-1 outline-offset-4 outline-[#34d399]/60'
                )}
              >
                <DASHBOARD_NAV_ITEM.icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <span className="text-[11px] font-medium leading-none">{DASHBOARD_NAV_ITEM.name}</span>
            </Link>
          )}
          {categories.map((category) => {
            const isOpen = openId === category.id;
            const highlighted = isOpen || (!openId && activeId === category.id);
            return (
              <button
                key={category.id}
                ref={registerTrigger(category.id)}
                type="button"
                onClick={() => toggle(category.id)}
                aria-expanded={isOpen}
                aria-controls={`mobile-nav-sheet-${category.id}`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-1 transition-colors duration-150',
                  highlighted ? 'text-[#ededed]' : 'text-[#85858b]'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-150',
                    highlighted && 'bg-[#232325]'
                  )}
                >
                  <category.icon
                    className={cn('h-5 w-5', highlighted ? 'opacity-100' : 'opacity-70')}
                    style={{ color: groupHue[category.id] }}
                    strokeWidth={1.5}
                  />
                </span>
                <span className="text-[11px] font-medium leading-none">{category.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
