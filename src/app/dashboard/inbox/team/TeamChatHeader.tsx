import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function TeamChatHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex items-center gap-4 px-2">
      <Link href="/dashboard/inbox" aria-label="Back to inbox" className="p-3 bg-fg/5 hover:bg-fg/10 rounded-full transition-colors border border-fg/10 shrink-0">
        <ArrowLeft className="w-6 h-6 text-fg-3" />
      </Link>
      <div>
        <h1 className="text-3xl font-medium leading-tight text-fg">Team chat</h1>
        <p className="text-fg/70 font-medium text-xs md:text-sm mt-2">{subtitle}</p>
      </div>
    </div>
  );
}
