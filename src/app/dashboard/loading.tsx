import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

export default function DashboardLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-4 md:px-8 py-6 md:py-10 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4">
          <div className="h-10 w-64 bg-white/10 rounded-2xl" />
          <div className="h-3 w-40 bg-white/5 rounded-full" />
        </div>
        <div className="h-12 w-48 bg-emerald-500/10 rounded-2xl border border-white/5" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white/5 border-white/10 h-32 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="h-3 w-24 bg-white/10 rounded-full" />
                  <div className="h-8 w-32 bg-white/20 rounded-xl" />
                </div>
                <div className="h-12 w-12 bg-white/5 rounded-2xl border border-white/10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Skeleton */}
        <div className="lg:col-span-2 bg-white/5 rounded-[2.5rem] border border-white/10 h-[500px] backdrop-blur-md overflow-hidden p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 w-48 bg-white/10 rounded-lg" />
            <div className="h-10 w-32 bg-white/5 rounded-xl" />
          </div>
          <div className="w-full h-full bg-white/[0.02] rounded-3xl" />
        </div>

        {/* Sidebar Widgets Skeleton */}
        <div className="space-y-8">
          <div className="bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10 h-[240px] p-8 space-y-6">
            <div className="h-5 w-32 bg-emerald-500/10 rounded-lg" />
            <div className="space-y-4">
              <div className="h-10 w-48 bg-emerald-500/20 rounded-xl" />
              <div className="h-2 w-full bg-white/5 rounded-full" />
              <div className="h-3 w-24 bg-emerald-500/10 rounded-full" />
            </div>
          </div>
          <div className="bg-white/5 rounded-[2rem] border border-white/10 h-[240px] p-8 space-y-6">
            <div className="h-5 w-32 bg-white/10 rounded-lg" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-10 bg-white/5 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-full bg-white/10 rounded-full" />
                    <div className="h-2 w-2/3 bg-white/5 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
