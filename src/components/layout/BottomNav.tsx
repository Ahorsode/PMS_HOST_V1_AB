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
  getActiveNavCategoryId,
  getVisibleNavCategories,
  isNavItemActive,
} from '@/lib/app-navigation';
import { useNavGroupMenu } from './useNavGroupMenu';

export const BottomNav = ({ role, permissions }: { role?: string; permissions?: any }) => {
  const pathname = usePathname();
  const roleLabel = formatRoleLabel(role);
  const { openId, toggle, close, containerRef, registerTrigger } = useNavGroupMenu<HTMLDivElement>();

  const categories = useMemo(() => getVisibleNavCategories(role, permissions), [role, permissions]);
  const allItems = useMemo(() => categories.flatMap((category) => category.items), [categories]);
  const activeId = getActiveNavCategoryId(pathname, categories);
  const openCategory = categories.find((category) => category.id === openId);

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
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              className="absolute inset-0 bg-black/70"
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
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex max-h-[min(75dvh,640px)] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-emerald-900/50 bg-[#07140f] shadow-[0_-24px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center justify-between px-4 pb-3 pt-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400/80">Farm menu</p>
                <h2 className="text-lg font-bold text-white">{openCategory.name}</h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2">
                {openCategory.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href, allItems);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors',
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

              {openCategory.id === 'account' && (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-white/45">
                    Signed in as {roleLabel}
                  </p>
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-950/80 bg-[#06110d]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${Math.max(categories.length, 1)}, minmax(0, 1fr))` }}
        >
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
                  'flex flex-col items-center justify-center gap-1 px-1',
                  highlighted ? 'text-emerald-300' : 'text-white/55',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                    highlighted && 'bg-emerald-400/15',
                  )}
                >
                  <category.icon className="h-[22px] w-[22px]" strokeWidth={highlighted ? 2.4 : 2} />
                </span>
                <span className="text-[10px] font-semibold leading-none">{category.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
