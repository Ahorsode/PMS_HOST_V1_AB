import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Full-page notice for staff who cannot use the farm right now. */
export function AccessBlocked({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/20 text-white p-7">
      <div className="glass-morphism p-11 rounded-lg text-center max-w-md">
        <div className="w-20 h-20 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.08]">
          <Lock className="w-9 h-9 text-[#ededed]" />
        </div>
        <h2 className="text-2xl font-medium mb-3 text-[#ededed]">{title}</h2>
        <p className="opacity-75 leading-relaxed font-medium mb-6">{message}</p>
        <Link href="/login" className="text-[#ededed] font-medium text-xs hover:underline">
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
