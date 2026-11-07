"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { useTheme } from './theme';
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
  const { theme, toggle: toggleTheme } = useTheme();

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
          'flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
          open
            ? 'border-fg/[0.12] bg-raised-2 text-fg'
            : 'border-fg/[0.08] bg-raised text-fg-2',
        )}
      >
        <User className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-profile-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-xl border border-fg/[0.08] bg-card shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          >
            <div className="border-b border-fg/[0.08] px-4 py-3">
              <p className="text-sm font-medium text-fg">My account</p>
              <p className="text-xs text-fg-3">{roleLabel}</p>
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
                        'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150',
                        active ? 'bg-raised text-fg' : 'text-fg-2 hover:bg-fg/[0.04] hover:text-fg',
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-fg-3')} strokeWidth={1.5} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-fg/[0.08] p-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg-2 transition-colors duration-150 hover:bg-fg/[0.04] hover:text-fg"
              >
                {theme === 'light' ? <Moon className="h-4 w-4 shrink-0" strokeWidth={1.5} /> : <Sun className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg-2 transition-colors duration-150 hover:bg-fg/[0.04] hover:text-neg"
              >
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
