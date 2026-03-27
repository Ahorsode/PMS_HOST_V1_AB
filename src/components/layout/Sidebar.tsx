"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Bird, Egg, ThermometerSun, 
  Wheat, Settings, Users, XCircle, Banknote,
  ChevronRight, LogOut, Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = ({ role = 'OWNER' }: { role?: string }) => {
  const pathname = usePathname();

  const allNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['OWNER', 'MANAGER'] },
    { name: 'Flocks', icon: Bird, href: '/dashboard/flocks', roles: ['OWNER', 'MANAGER'] },
    { name: 'Houses', icon: ThermometerSun, href: '/dashboard/houses', roles: ['OWNER', 'MANAGER'] },
    { name: 'Eggs', icon: Egg, href: '/dashboard/eggs', roles: ['OWNER', 'MANAGER'] },
    { name: 'Sales', icon: Banknote, href: '/dashboard/sales', roles: ['OWNER', 'MANAGER'] },
    { name: 'Mortality', icon: XCircle, href: '/dashboard/mortality', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Feeding', icon: Wheat, href: '/dashboard/feed', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    { name: 'Finance', icon: Wallet, href: '/dashboard/finance', roles: ['OWNER', 'MANAGER'] },
    { name: 'Team', icon: Users, href: '/dashboard/team', roles: ['OWNER', 'MANAGER'] },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['OWNER', 'MANAGER'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  return (
    <aside className="fixed left-6 top-6 bottom-6 w-20 hover:w-64 group transition-all duration-500 ease-out z-50">
      <div className="h-full glass-pill rounded-[2.5rem] flex flex-col items-stretch pt-8 pb-4 overflow-hidden">
        
        {/* Logo Section */}
        <div className="px-6 mb-10 flex items-center flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 mx-auto group-hover:mx-0">
            <Bird className="text-white w-6 h-6" />
          </div>
          <span className="ml-4 font-black text-xl tracking-tighter text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            Agri<span className="text-emerald-400 text-shadow-glow">Tech</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-3 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative flex items-center h-12 rounded-2xl transition-all duration-300 group/item overflow-hidden",
                  isActive 
                    ? "bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] border border-emerald-500/20" 
                    : "text-white/60 hover:text-white hover:bg-white/15"
                )}
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <item.icon className={cn("w-6 h-6 transition-all duration-300 group-hover/item:scale-110", isActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "text-white/40 group-hover/item:text-white")} />
                </div>
                <span className={cn(
                  "ml-1 font-bold text-sm tracking-tight opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap",
                  isActive ? "text-emerald-400" : "text-white/60 group-hover:text-white"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile */}
        <div className="mt-auto px-4 w-full pb-2 flex-shrink-0">
           <div className="h-px bg-white/20 mb-6 group-hover:block hidden" />
            <div 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center group-hover:bg-red-500/10 rounded-2xl p-2 transition-all cursor-pointer group/logout"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-400 font-bold shrink-0 group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors">
                U
              </div>
              <div className="ml-3 overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-xs font-black text-white truncate">Profile</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{role}</p>
              </div>
              <LogOut className="ml-auto w-5 h-5 text-white/20 group-hover/logout:text-red-400 transition-colors opacity-0 group-hover:opacity-100 mr-2" />
            </div>
        </div>
      </div>
    </aside>
  );
};
