import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Full-page notice for staff who cannot use the farm right now. */
export function AccessBlocked({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-fg/[0.04] text-fg p-7">
      <div className="glass-morphism p-11 rounded-lg text-center max-w-md">
        <div className="w-20 h-20 bg-fg/[0.04] rounded-full flex items-center justify-center mx-auto mb-6 border border-fg/[0.08]">
          <Lock className="w-9 h-9 text-fg" />
        </div>
        <h2 className="text-2xl font-medium mb-3 text-fg">{title}</h2>
        <p className="opacity-75 leading-relaxed font-medium mb-6">{message}</p>
        <Link href="/login" className="text-fg font-medium text-xs hover:underline">
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
