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
      className="hidden md:block fixed left-6 top-6 bottom-6 w-20 z-50"
    >
      <div className="relative h-full glass-pill rounded-lg flex flex-col items-center pt-7 pb-4">

        {/* Logo doubles as the home link */}
        <Link
          href="/dashboard"
          aria-label="Dashboard home"
          className="mb-9 shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          <img
            src="/logo.png"
            alt="Poultry Ledger logo"
            className="w-12 h-12 rounded-md object-cover shadow-lg shadow-emerald-500/20"
          />
        </Link>

        {/* Dashboard is a direct link; each group icon opens a flyout with that group's pages */}
        <nav aria-label="Main" className="flex flex-col items-center gap-4">
          {/* Dashboard stands out from the groups: solid emerald tile, set apart by a divider */}
          {showDashboard && (
            <>
              <Link
                href={DASHBOARD_NAV_ITEM.href}
                title={DASHBOARD_NAV_ITEM.name}
                aria-current={dashboardActive ? 'page' : undefined}
                className={cn(
                  "flex w-16 flex-col items-center gap-1 rounded-lg py-2.5 border border-emerald-300/60 bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#04120c] shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all duration-300 group/item hover:from-emerald-300 hover:to-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                  dashboardActive && "ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-[#0a140f]"
                )}
              >
                <DASHBOARD_NAV_ITEM.icon className="w-6 h-6 transition-transform duration-300 group-hover/item:scale-110" strokeWidth={2.4} />
                <span className="text-[10px] font-bold leading-none">{DASHBOARD_NAV_ITEM.name}</span>
              </Link>
              <div aria-hidden="true" className="h-px w-10 bg-white/15" />
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
                    "flex w-16 flex-col items-center gap-1 rounded-md py-2 transition-all duration-300 group/item focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] border border-emerald-500/20"
                      : isOpen
                        ? "bg-white/15 text-white border border-white/10"
                        : "text-white/80 hover:text-white hover:bg-white/15 border border-transparent"
                  )}
                >
                  <category.icon
                    className={cn(
                      "w-6 h-6 transition-all duration-300 group-hover/item:scale-110",
                      isActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "text-white/70 group-hover/item:text-white"
                    )}
                  />
                  <span className="text-[10px] font-semibold leading-none">{category.name}</span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="group"
                      aria-label={`${category.name} pages`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute left-full top-0 bottom-0 ml-3 w-64 glass-pill rounded-lg flex flex-col pt-7 pb-3"
                    >
                      <p className="px-5 mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                        {category.name}
                      </p>
                      <ul className="flex-1 min-h-0 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                        {category.items.map((item) => {
                          const itemActive = isNavItemActive(pathname, item.href, allItems);
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={itemActive ? 'page' : undefined}
                                className={cn(
                                  "flex items-center gap-3 h-11 px-3 rounded-md text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                                  itemActive
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                                    : "text-white/80 hover:text-white hover:bg-white/15 border border-transparent"
                                )}
                              >
                                <item.icon className={cn("w-5 h-5 shrink-0", itemActive ? "text-emerald-400" : "text-white/60")} />
                                <span className="truncate">{item.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      {category.id === 'governance' && (
                        <div className="mt-3 px-3 pt-3 border-t border-white/10 space-y-2">
                          <p className="px-3 text-xs text-white/50 font-bold uppercase tracking-wider">
                            Signed in as {roleLabel}
                          </p>
                          <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="flex w-full items-center gap-3 h-11 px-3 rounded-md text-sm font-bold text-white/80 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                          >
                            <LogOut className="w-5 h-5 shrink-0" />
                            Sign Out
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

        {/* Footer Actions: always on the rail, below the three groups */}
        <div className="mt-auto flex flex-col items-center gap-2 pt-4 border-t border-white/10 w-14">
          <Link
            href="/dashboard/profile"
            title={`My Profile (${roleLabel})`}
            aria-current={profileActive ? 'page' : undefined}
            className={cn(
              "flex w-16 flex-col items-center gap-1 rounded-md py-2 transition-colors group/profile focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
              profileActive ? "bg-emerald-500/20 text-emerald-400" : "text-white/80 hover:bg-white/15 hover:text-white"
            )}
          >
            <span className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400 group-hover/profile:bg-emerald-400/20 transition-colors">
              <User className="w-[18px] h-[18px]" />
            </span>
            <span className="text-[10px] font-semibold leading-none">Profile</span>
          </Link>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign Out"
            className="flex w-16 flex-col items-center gap-1 rounded-md py-2 text-white/70 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-semibold leading-none">Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
