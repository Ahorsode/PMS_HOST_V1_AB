"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canShowNavigationItem, formatRoleLabel } from '@/lib/navigation-permissions';
import { PROFILE_MENU_ITEMS } from '@/lib/app-navigation';

/**
 * Profile icon for the mobile header. Opens a dropdown with My Profile,
 * Messages, Notifications and Sign out; closes on Escape, outside taps and
 * navigation.
 */
export const ProfileMenu = ({ role, permissions }: { role?: string; permissions?: any }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const roleLabel = formatRoleLabel(role);

  const items = useMemo(
    () =>
      PROFILE_MENU_ITEMS.filter((item) =>
        canShowNavigationItem({ name: item.name, role, roles: item.roles, permissions }),
      ),
    [role, permissions],
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="mobile-profile-menu"
        aria-label="Open profile menu"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
          open
            ? 'border-emerald-400/50 bg-emerald-400/25 text-emerald-200'
            : 'border-emerald-400/20 bg-emerald-400/15 text-emerald-300',
        )}
      >
        <User className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-profile-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-emerald-900/60 bg-[#07140f] shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-bold text-white">My account</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">{roleLabel}</p>
            </div>
            <ul className="p-2">
              {items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                        active ? 'bg-emerald-500/15 text-emerald-300' : 'text-white/85 hover:bg-white/10',
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-white/10 p-2">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
