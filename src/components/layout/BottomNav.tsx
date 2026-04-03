"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, PawPrint, XCircle, User, Egg, ThermometerSun, Banknote, Wheat, Wallet, Users, Settings, Crown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

export const BottomNav = ({ role = 'OWNER', permissions }: { role?: string, permissions?: any }) => {
  const pathname = usePathname();

  // Mobile navigation items
  const allNavItems: { name: string; icon: React.ElementType; href: string; roles: string[] }[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
    { name: 'Livestock', icon: PawPrint, href: '/dashboard/flocks', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Houses', icon: ThermometerSun, href: '/dashboard/houses', roles: ['OWNER', 'MANAGER'] },
    { name: 'Eggs', icon: Egg, href: '/dashboard/eggs', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Feeding', icon: Wheat, href: '/dashboard/feed', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Mortality', icon: XCircle, href: '/dashboard/mortality', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Sales', icon: Banknote, href: '/dashboard/sales', roles: ['OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
    { name: 'Customers', icon: Users, href: '/dashboard/sales/customers', roles: ['OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT'] },
    { name: 'Finance Hub', icon: Wallet, href: '/dashboard/finance', roles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
    { name: 'My Profile', icon: User, href: '/dashboard/profile', roles: ['OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
    { name: 'License Upgrade', icon: Crown, href: '/dashboard/license-upgrade', roles: ['OWNER', 'MANAGER'] },
    { name: 'Team', icon: Users, href: '/dashboard/team', roles: ['OWNER', 'MANAGER'] },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['OWNER', 'MANAGER'] },
  ];

  const navItems = allNavItems.filter(item => {
    // Basic role check
    if (!item.roles.includes(role)) return false;
    
    // Explicit Accountant Restrictions (matching Sidebar.tsx)
    if (role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER') {
        const allowedForAccountant = ['Dashboard', 'Sales', 'Customers', 'Finance Hub', 'My Profile'];
        return allowedForAccountant.includes(item.name);
    }
    
    // Permission overrides for workers
    if (permissions) {
      if ((item.name === 'Finance Hub' || item.name === 'Sales') && permissions.canViewFinance) return true;
      if (item.name === 'Livestock' && permissions.canViewBatches) return true;
      if (item.name === 'Inventory' && permissions.canViewInventory) return true;
    }
    return true;
  });

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe"
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
              <span className="text-[10px] font-bold mt-1 z-10 whitespace-nowrap">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Logout Button */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="relative flex flex-col items-center justify-center min-w-[4.5rem] shrink-0 snap-center h-14 rounded-2xl transition-all duration-300 text-red-400/60 hover:text-red-400"
        >
          <LogOut className="w-6 h-6 z-10" />
          <span className="text-[10px] font-bold mt-1 z-10">Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
};
