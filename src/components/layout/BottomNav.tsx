"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Bird, XCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

export const BottomNav = ({ role = 'OWNER', permissions }: { role?: string, permissions?: any }) => {
  const pathname = usePathname();

  // Mobile navigation items
  const allNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Flocks', icon: Bird, href: '/dashboard/flocks', roles: ['OWNER', 'MANAGER'] },
    { name: 'Mortality', icon: XCircle, href: '/dashboard/mortality', roles: ['OWNER', 'MANAGER', 'WORKER'] },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.roles.includes(role)) return true;
    if (role === 'WORKER' && permissions) {
      if (item.name === 'Flocks' && permissions.canViewBatches) return true;
    }
    return false;
  });

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe"
    >
      <div className="glass-pill mx-4 mb-4 mt-2 px-2 py-2 rounded-3xl flex items-center justify-around border border-white/10 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300",
                isActive 
                  ? "text-emerald-400" 
                  : "text-white/50 hover:text-white/80"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavBubble"
                  className="absolute inset-0 bg-emerald-500/20 rounded-2xl border border-emerald-500/20 shadow-[inset_0_0_12px_rgba(16,185,129,0.1)]"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <item.icon className={cn("w-6 h-6 z-10", isActive && "drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]")} />
              <span className="text-[10px] font-bold mt-1 z-10">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Profile / Logout Button mapping */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 text-white/50 hover:text-white/80"
        >
          <User className="w-6 h-6 z-10" />
          <span className="text-[10px] font-bold mt-1 z-10">Profile</span>
        </button>
      </div>
    </motion.div>
  );
};
