"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, User } from 'lucide-react';
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

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60';
const railItem = cn(
  'flex w-16 flex-col items-center gap-1.5 rounded-lg py-2 transition-colors duration-150',
  focus
);
const railLabel = 'text-[11px] font-medium leading-none';

export const Sidebar = ({ role, permissions }: { role?: string, permissions?: any }) => {
  const pathname = usePathname();
  const roleLabel = formatRoleLabel(role);
  const profileActive = pathname === '/dashboard/profile';
  const { openId, toggle, containerRef, registerTrigger } = useNavGroupMenu<HTMLElement>();

  const categories = useMemo(() => getVisibleNavCategories(role, permissions), [role, permissions]);
  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);
  const activeId = getActiveNavCategoryId(pathname, categories);
  const showDashboard = canShowDashboardNavItem(role, permissions);
  const dashboardActive = pathname === DASHBOARD_NAV_ITEM.href;

  return (
    <aside
      ref={containerRef}
      className="fixed inset-y-0 left-0 z-50 hidden w-[88px] md:block"
    >
      <div className="relative flex h-full flex-col items-center border-r border-white/[0.08] bg-[#0f0f10] pb-4 pt-5">
        {/* Logo doubles as the home link */}
        <Link
          href="/dashboard"
          aria-label="Dashboard home"
          className={cn('mb-6 shrink-0 rounded-lg', focus)}
        >
          <img src="/logo.png" alt="Poultry Ledger logo" className="h-10 w-10 rounded-lg object-cover" />
        </Link>

        {/* Dashboard is a direct link; each group icon opens a flyout with that group's pages */}
        <nav aria-label="Main" className="flex flex-col items-center gap-1">
          {/* Dashboard stays set apart from the groups: a flat emerald tile above a divider */}
          {showDashboard && (
            <>
              <Link
                href={DASHBOARD_NAV_ITEM.href}
                title={DASHBOARD_NAV_ITEM.name}
                aria-current={dashboardActive ? 'page' : undefined}
                className={cn(
                  railItem,
                  'bg-[#34d399] text-[#062016] hover:bg-[#4ade9f]',
                  dashboardActive && 'ring-1 ring-[#34d399]/60 ring-offset-2 ring-offset-[#0f0f10]'
                )}
              >
                <DASHBOARD_NAV_ITEM.icon className="h-5 w-5" strokeWidth={1.75} />
                <span className={railLabel}>{DASHBOARD_NAV_ITEM.name}</span>
              </Link>
              <div aria-hidden="true" className="my-3 h-px w-10 bg-white/[0.08]" />
            </>
          )}

          {categories.map((category) => {
            const isOpen = openId === category.id;
            const isActive = activeId === category.id;
            const panelId = `nav-flyout-${category.id}`;

            return (
              <div key={category.id}>
                <button
                  ref={registerTrigger(category.id)}
                  type="button"
                  onClick={() => toggle(category.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  title={category.name}
                  className={cn(
                    railItem,
                    isActive || isOpen
                      ? 'bg-[#232325] text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'text-[#a1a1a6] hover:bg-white/[0.04] hover:text-[#ededed]'
                  )}
                >
                  <category.icon
                    className={cn('h-5 w-5', isActive ? 'text-[#34d399]' : undefined)}
                    strokeWidth={1.5}
                  />
                  <span className={railLabel}>{category.name}</span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="group"
                      aria-label={`${category.name} pages`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-y-0 left-full flex w-64 flex-col border-r border-white/[0.08] bg-[#0f0f10] pb-3 pt-6 shadow-[8px_0_24px_rgba(0,0,0,0.35)]"
                    >
                      <p className="mb-2 px-5 text-xs text-[#85858b]">{category.name}</p>
                      <ul className="custom-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3">
                        {category.items.map((item) => {
                          const itemActive = isNavItemActive(pathname, item.href, allItems);
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={itemActive ? 'page' : undefined}
                                className={cn(
                                  'flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150',
                                  focus,
                                  itemActive
                                    ? 'bg-[#232325] font-medium text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                    : 'text-[#a1a1a6] hover:bg-white/[0.04] hover:text-[#ededed]'
                                )}
                              >
                                <item.icon
                                  className={cn('h-4 w-4 shrink-0', itemActive ? 'text-[#34d399]' : 'text-[#85858b]')}
                                  strokeWidth={1.5}
                                />
                                <span className="truncate">{item.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      {category.id === 'governance' && (
                        <div className="mt-3 space-y-1 border-t border-white/[0.08] px-3 pt-3">
                          <p className="px-3 pb-1 text-xs text-[#85858b]">Signed in as {roleLabel}</p>
                          <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className={cn(
                              'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#a1a1a6] transition-colors duration-150 hover:bg-white/[0.04] hover:text-[#f2777b]',
                              focus
                            )}
                          >
                            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                            Sign out
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Footer actions: always on the rail, below the groups */}
        <div className="mt-auto flex w-16 flex-col items-center gap-1 border-t border-white/[0.08] pt-3">
          <Link
            href="/dashboard/profile"
            title={`My profile (${roleLabel})`}
            aria-current={profileActive ? 'page' : undefined}
            className={cn(
              railItem,
              profileActive
                ? 'bg-[#232325] text-[#ededed]'
                : 'text-[#a1a1a6] hover:bg-white/[0.04] hover:text-[#ededed]'
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-[#232325]">
              <User className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className={railLabel}>Profile</span>
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            className={cn(railItem, 'text-[#85858b] hover:bg-white/[0.04] hover:text-[#f2777b]')}
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            <span className={railLabel}>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
