"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, LogOut, User, X } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { canShowNavigationItem, formatRoleLabel } from '@/lib/navigation-permissions';
import {
  APP_NAV_CATEGORIES,
  PRIMARY_NAV_HREFS,
  isNavItemActive,
  type AppNavItem,
} from '@/lib/app-navigation';

export const BottomNav = ({ role, permissions }: { role?: string; permissions?: any }) => {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const roleInitial = role?.charAt(0) ?? '?';
  const roleLabel = formatRoleLabel(role);

  const visibleCategories = useMemo(
    () =>
      APP_NAV_CATEGORIES.map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          canShowNavigationItem({
            name: item.name,
            role,
            roles: item.roles,
            permissions,
          }),
        ),
      })).filter((category) => category.items.length > 0),
    [role, permissions],
  );

  const visibleItems = useMemo(
    () => visibleCategories.flatMap((category) => category.items),
    [visibleCategories],
  );

  const primaryItems = useMemo(() => {
    const picked: AppNavItem[] = [];
    for (const href of PRIMARY_NAV_HREFS) {
      const match = visibleItems.find((item) => item.href === href);
      if (match) picked.push(match);
      if (picked.length === 4) break;
    }
    if (picked.length < 4) {
      for (const item of visibleItems) {
        if (picked.some((pickedItem) => pickedItem.href === item.href)) continue;
        picked.push(item);
        if (picked.length === 4) break;
      }
    }
    return picked;
  }, [visibleItems]);

  const primaryHrefs = useMemo(
    () => new Set(primaryItems.map((item) => item.href)),
    [primaryItems],
  );

  const moreCategories = useMemo(
    () =>
      visibleCategories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => !primaryHrefs.has(item.href)),
        }))
        .filter((category) => category.items.length > 0),
    [visibleCategories, primaryHrefs],
  );

  const moreItems = useMemo(
    () => moreCategories.flatMap((category) => category.items),
    [moreCategories],
  );

  const moreActive = moreItems.some((item) => isNavItemActive(pathname, item.href, visibleItems));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/70"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More destinations"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[min(86dvh,760px)] flex-col overflow-hidden rounded-t-3xl border border-emerald-900/50 bg-[#07140f] shadow-[0_-24px_80px_rgba(0,0,0,0.55)]"
            >
              <div className="px-5 pb-3 pt-3">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400/80">Farm menu</p>
                    <h2 className="text-lg font-bold text-white">All sections</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 custom-scrollbar">
                {moreCategories.map((category) => (
                  <section key={category.name}>
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                      {category.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {category.items.map((item) => {
                        const active = isNavItemActive(pathname, item.href, visibleItems);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors',
                                active
                                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                                : 'border-white/10 bg-white/[0.04] text-white/85',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                active ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/70',
                              )}
                            >
                              <item.icon className="h-[18px] w-[18px]" />
                            </span>
                            <span className="min-w-0 text-sm font-semibold leading-tight">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="space-y-2 border-t border-white/10 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-sm font-bold uppercase text-emerald-300">
                    {roleInitial}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">My Profile</span>
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-white/45">{roleLabel}</span>
                  </span>
                  <User className="ml-auto h-4 w-4 text-white/40" />
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-red-300"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">Sign out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-950/80 bg-[#06110d]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${Math.max(primaryItems.length + 1, 1)}, minmax(0, 1fr))` }}
        >
          {primaryItems.map((item) => {
            const active = !moreOpen && isNavItemActive(pathname, item.href, visibleItems);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-1',
                  active ? 'text-emerald-300' : 'text-white/55',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-emerald-400/15',
                  )}
                >
                  <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate text-[10px] font-semibold leading-none">{item.shortLabel}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-1',
              moreOpen || moreActive ? 'text-emerald-300' : 'text-white/55',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                (moreOpen || moreActive) && 'bg-emerald-400/15',
              )}
            >
              <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={moreOpen || moreActive ? 2.4 : 2} />
            </span>
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
