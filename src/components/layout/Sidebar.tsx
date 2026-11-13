"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Moon, Sun, User } from 'lucide-react';
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
import { useTheme } from './theme';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';
const railItem = cn(
  'flex w-[72px] flex-col items-center gap-1.5 rounded-lg py-2.5 transition-colors duration-150',
  focus
);
const railLabel = 'text-xs font-medium leading-none';

export const Sidebar = ({ role, permissions }: { role?: string, permissions?: any }) => {
  const pathname = usePathname();
  const roleLabel = formatRoleLabel(role);
  const profileActive = pathname === '/dashboard/profile';
  const { openId, toggle, containerRef, registerTrigger } = useNavGroupMenu<HTMLElement>();
  const { theme, toggle: toggleTheme } = useTheme();

  const categories = useMemo(() => getVisibleNavCategories(role, permissions), [role, permissions]);
  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);
  const activeId = getActiveNavCategoryId(pathname, categories);
  const showDashboard = canShowDashboardNavItem(role, permissions);
  const dashboardActive = pathname === DASHBOARD_NAV_ITEM.href;

  return (
    <aside
      ref={containerRef}
      className="fixed bottom-4 left-4 top-4 z-50 hidden w-[84px] md:block"
    >
      <div className="relative flex h-full flex-col items-center rounded-2xl border border-fg/[0.08] bg-deep pb-4 pt-5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
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
                  'bg-accent text-accent-fg hover:bg-accent',
                  dashboardActive && 'ring-1 ring-accent/60 ring-offset-2 ring-offset-deep'
                )}
              >
                <DASHBOARD_NAV_ITEM.icon className="h-6 w-6" strokeWidth={1.75} />
                <span className={railLabel}>{DASHBOARD_NAV_ITEM.name}</span>
              </Link>
              <div aria-hidden="true" className="my-3 h-px w-10 bg-fg/[0.08]" />
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
                      ? 'bg-raised text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'text-fg-2 hover:bg-fg/[0.04] hover:text-fg'
                  )}
                >
                  <category.icon
                    className={cn('h-6 w-6 transition-opacity duration-150', isActive || isOpen ? 'opacity-100' : 'opacity-70')}
                    style={{ color: groupHue[category.id] }}
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
                      className="absolute inset-y-0 left-full ml-3 flex w-72 flex-col rounded-2xl border border-fg/[0.08] bg-deep pb-3 pt-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                    >
                      <p className="mb-2 flex items-center gap-2 px-5 text-xs text-fg-3">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: groupHue[category.id] }} />
                        {category.name}
                      </p>
                      <ul className="custom-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3">
                        {category.items.map((item) => {
                          const itemActive = isNavItemActive(pathname, item.href, allItems);
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={itemActive ? 'page' : undefined}
                                className={cn(
                                  'relative flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors duration-150',
                                  focus,
                                  itemActive
                                    ? 'bg-raised font-medium text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                    : 'text-fg-2 hover:bg-fg/[0.04] hover:text-fg'
                                )}
                              >
                                {itemActive && (
                                  <span
                                    aria-hidden="true"
                                    className="absolute inset-y-2 left-0 w-0.5 rounded-full"
                                    style={{ backgroundColor: groupHue[category.id] }}
                                  />
                                )}
                                <item.icon
                                  className="h-5 w-5 shrink-0"
                                  style={{ color: itemActive ? groupHue[category.id] : 'var(--fg-3)' }}
                                  strokeWidth={1.5}
                                />
                                <span className="truncate">{item.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      {category.id === 'governance' && (
                        <div className="mt-3 space-y-1 border-t border-fg/[0.08] px-3 pt-3">
                          <p className="px-3 pb-1 text-xs text-fg-3">Signed in as {roleLabel}</p>
                          <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className={cn(
                              'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-fg-2 transition-colors duration-150 hover:bg-fg/[0.04] hover:text-neg',
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
        <div className="mt-auto flex w-[72px] flex-col items-center gap-1 border-t border-fg/[0.08] pt-3">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className={cn(railItem, 'text-fg-2 hover:bg-fg/[0.04] hover:text-fg')}
          >
            {theme === 'light' ? <Moon className="h-6 w-6" strokeWidth={1.5} /> : <Sun className="h-6 w-6" strokeWidth={1.5} />}
            <span className={railLabel}>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
          <Link
            href="/dashboard/profile"
            title={`My profile (${roleLabel})`}
            aria-current={profileActive ? 'page' : undefined}
            className={cn(
              railItem,
              profileActive
                ? 'bg-raised text-fg'
                : 'text-fg-2 hover:bg-fg/[0.04] hover:text-fg'
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-fg/[0.08] bg-raised">
              <User className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className={railLabel}>Profile</span>
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            className={cn(railItem, 'text-fg-3 hover:bg-fg/[0.04] hover:text-neg')}
          >
            <LogOut className="h-6 w-6" strokeWidth={1.5} />
            <span className={railLabel}>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
