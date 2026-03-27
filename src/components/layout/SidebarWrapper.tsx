"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { PageTransition } from './PageTransition';

export const SidebarWrapper = ({ 
  children, 
  role 
}: { 
  children: React.ReactNode;
  role: string | undefined;
}) => {
  const pathname = usePathname();
  
  // Logic to determine if we are on an "in-depth" or analytics page
  const segments = pathname.split('/').filter(Boolean);
  
  // In-depth pages usually have more than 3 segments OR contain 'analytics'
  // /dashboard/flocks/[id] -> segments: [dashboard, flocks, [id]] length 3
  // Wait, segments.length > 2 is more accurate for detail pages
  // /dashboard/flocks -> 2 segments [dashboard, flocks]
  // /dashboard/flocks/[id] -> 3 segments
  // /dashboard/flocks/analytics -> 3 segments
  
  const isIndeptPage = 
    pathname.includes('/analytics') || 
    (segments.length > 2 && (segments[1] === 'flocks' || segments[1] === 'sales' || segments[1] === 'feed'));

  return (
    <div className="relative flex min-h-screen overflow-hidden selection:bg-emerald-500/30">
      {/* Decorative Floating Mesh Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s] pointer-events-none" />

      {/* Conditionally render Sidebar */}
      {!isIndeptPage && <Sidebar role={role} />}
      
      {/* Main content with conditional padding */}
      <main className={cn(
        "flex-1 flex flex-col relative z-20 h-screen overflow-hidden transition-all duration-700 ease-in-out",
        isIndeptPage ? "pl-0" : "pl-32"
      )}>
        <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar pt-6 pb-12 px-2 md:px-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
};
