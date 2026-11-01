import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Full-page notice for staff who cannot use the farm right now. */
export function AccessBlocked({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/20 backdrop-blur-xl text-white p-7">
      <div className="glass-morphism p-11 rounded-lg text-center max-w-md">
        <div className="w-20 h-20 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
          <Lock className="w-9 h-9 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3 uppercase tracking-widest text-amber-300">{title}</h2>
        <p className="opacity-75 leading-relaxed font-medium mb-6">{message}</p>
        <Link href="/login" className="text-emerald-400 font-bold uppercase tracking-widest text-xs hover:underline">
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
