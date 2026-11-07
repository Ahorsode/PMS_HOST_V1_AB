import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function UnauthorizedPage() {
  return (
    <div className="flex h-full min-h-[80vh] w-full items-center justify-center p-5 animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-[#1a1a1a]/80 border-white/10 overflow-hidden group">
        <CardContent className="p-7 flex flex-col items-center text-center space-y-5">
          <div className="w-24 h-24 rounded-full bg-white/[0.04] flex items-center justify-center border border-white/[0.08] transition-transform duration-200">
            <ShieldAlert className="w-12 h-12 text-[#f2777b]" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-medium text-white tracking-normal">Access denied</h1>
            <p className="text-white/80 text-sm font-medium w-full max-w-[280px] mx-auto">
              You do not have the required permissions to view this module. Please contact your Farm Owner or Manager.
            </p>
          </div>

          <Link href="/dashboard" className="glass-pill px-7 py-2 rounded-md flex items-center gap-2 group/btn hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-300">
            <ArrowLeft className="w-4 h-4 text-[#85858b] group-hover/btn:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium text-white">Back to dashboard</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
