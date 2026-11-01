import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Shown in place of a page whose feature is not on the farm's current plan. */
export function PlanFeatureLocked({
  title,
  accent,
  description,
}: {
  title: string;
  accent: string;
  description: React.ReactNode;
}) {
  return (
    <div className="max-w-[1600px] mx-auto min-h-[60vh] flex flex-col items-center justify-center px-5 py-9 relative">
      <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-center mb-5">
        <Lock className="w-10 h-10 text-rose-500" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-normal text-center">
        {title} <span className="text-rose-400 italic">{accent}</span>
      </h1>
      <p className="text-white/80 mb-7 max-w-lg text-center leading-relaxed">
        {description} It is included in the <span className="text-white font-bold">Solo Plus</span> and{' '}
        <span className="text-white font-bold">Business Plus</span> plans.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <Link href="/dashboard" className="bg-white/5 border border-white/10 text-white/80 px-9 py-4 rounded-md font-bold uppercase tracking-widest text-[11px] hover:scale-105 hover:bg-white/10 hover:text-white transition-all text-center">
          Go Back
        </Link>
        <Link href="/dashboard/license-upgrade" className="bg-white text-black px-9 py-4 rounded-md font-bold uppercase tracking-widest text-[11px] hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] text-center">
          Upgrade Plan
        </Link>
      </div>
    </div>
  );
}
