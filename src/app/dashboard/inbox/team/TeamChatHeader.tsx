import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function TeamChatHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex items-center gap-4 px-2 max-md:gap-3 max-md:px-0 max-md:font-ql-sans">
      <Link href="/dashboard/inbox" aria-label="Back to inbox" className="p-3 bg-fg/5 hover:bg-fg/10 rounded-full transition-colors border border-fg/10 shrink-0 max-md:flex max-md:h-11 max-md:w-11 max-md:items-center max-md:justify-center max-md:border-ql-line max-md:bg-transparent max-md:p-0">
        <ArrowLeft className="w-6 h-6 text-fg-3 max-md:h-5 max-md:w-5 max-md:text-ql-text" />
      </Link>
      <div>
        <h1 className="text-3xl font-semibold leading-tight text-fg max-md:font-ql-display max-md:text-[24px] max-md:text-ql-text">Team chat</h1>
        <p className="text-fg/70 font-medium text-xs md:text-sm mt-2 max-md:mt-0 max-md:text-[13px] max-md:font-normal max-md:text-ql-muted">{subtitle}</p>
      </div>
    </div>
  );
}
