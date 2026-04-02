"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, PawPrint, XCircle, User, Egg, ThermometerSun, Banknote, Wheat, Wallet, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

export const BottomNav = ({ role = 'OWNER', permissions }: { role?: string, permissions?: any }) => {
  const pathname = usePathname();

  // Mobile navigation items
  const allNavItems: { name: string; icon: React.ElementType; href: string; roles: string[] }[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER', 'CASHIER'] },
    { name: 'Livestock', icon: PawPrint, href: '/dashboard/livestock', roles: ['OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
    { name: 'Houses', icon: ThermometerSun, href: '/dashboard/houses', roles: ['OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT'] },
    { name: 'Eggs', icon: Egg, href: '/dashboard/eggs', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Sales', icon: Banknote, href: '/dashboard/sales', roles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'FINANCE_OFFICER', 'CASHIER'] },
    { name: 'Mortality', icon: XCircle, href: '/dashboard/mortality', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Feeding', icon: Wheat, href: '/dashboard/feed', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Finance', icon: Wallet, href: '/dashboard/finance', roles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
    { name: 'Team', icon: Users, href: '/dashboard/team', roles: ['OWNER', 'MANAGER'] },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['OWNER', 'MANAGER'] },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.roles.includes(role)) return true;
    if (role === 'WORKER' && permissions) {
      if ((item.name === 'Finance' || item.name === 'Sales') && permissions.canViewFinance) return true;
      if (item.name === 'Livestock' && permissions.canViewBatches) return true;
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
      <div className="bg-[#0a1510]/85 backdrop-blur-2xl mx-4 mb-4 mt-2 px-2 py-2 rounded-3xl flex items-center gap-1 overflow-x-auto custom-scrollbar border border-emerald-900/40 shadow-[0_-4px_30px_rgba(0,0,0,0.6),0_8px_32px_rgba(0,0,0,0.5)] snap-x">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-[4.5rem] shrink-0 snap-center h-14 rounded-2xl transition-all duration-300",
                isActive 
                  ? "text-emerald-400" 
                  : "text-white/60 hover:text-white"
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
          className="relative flex flex-col items-center justify-center min-w-[4.5rem] shrink-0 snap-center h-14 rounded-2xl transition-all duration-300 text-white/60 hover:text-white"
        >
          <User className="w-6 h-6 z-10" />
          <span className="text-[10px] font-bold mt-1 z-10">Profile</span>
        </button>
      </div>
    </motion.div>
  );
};
