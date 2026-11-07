'use client';

import React from 'react';

interface WorkerStampProps {
  user?: {
    firstname: string | null;
    surname: string | null;
    role: string;
  } | null;
}

export function WorkerStamp({ user }: WorkerStampProps) {
  if (!user) return null;
  
  const initials = `${user.firstname?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase() || '?';
  const fullName = `${user.firstname || ''} ${user.surname || ''}`.trim() || 'System';

  return (
    <div className="relative group/worker inline-block ml-2 align-middle">
      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-600 cursor-help shadow-sm hover:bg-emerald-100 transition-colors">
        {initials}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 hidden group-hover/worker:block z-50 animate-in fade-in zoom-in duration-150">
        <div className="bg-[#19191b] text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap border border-white/[0.08]">
          <p className="font-medium">{fullName}</p>
          <p className="text-[#85858b] text-xs">{user.role}</p>
        </div>
        <div className="w-1.5 h-1.5 bg-[#19191b] rotate-45 absolute -bottom-0.5 right-2.5 border-r border-b border-white/[0.08]"></div>
      </div>
    </div>
  );
}
