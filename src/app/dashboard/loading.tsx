import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

export default function DashboardLoading() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-7 px-3 md:px-8 py-5 md:py-10 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-fg/10 rounded-md" />
          <div className="h-3 w-40 bg-fg/10 rounded-full" />
        </div>
        <div className="h-12 w-48 bg-fg/[0.04] rounded-md border border-fg/5" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-fg/10 border-fg/10 h-32">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-fg/10 rounded-full" />
                  <div className="h-8 w-32 bg-fg/20 rounded-md" />
                </div>
                <div className="h-12 w-12 bg-fg/10 rounded-md border border-fg/10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Main Chart Skeleton */}
        <div className="lg:col-span-2 bg-fg/10 rounded-lg border border-fg/10 h-[500px] overflow-hidden p-7 space-y-5">
          <div className="flex justify-between items-center">
            <div className="h-6 w-48 bg-fg/10 rounded-lg" />
            <div className="h-10 w-32 bg-fg/10 rounded-md" />
          </div>
          <div className="w-full h-full bg-fg/[0.02] rounded-lg" />
        </div>

        {/* Sidebar Widgets Skeleton */}
        <div className="space-y-7">
          <div className="bg-fg/[0.04] rounded-lg border border-fg/[0.08] h-[240px] p-7 space-y-5">
            <div className="h-5 w-32 bg-fg/[0.04] rounded-lg" />
            <div className="space-y-3">
              <div className="h-10 w-48 bg-fg/[0.04] rounded-md" />
              <div className="h-2 w-full bg-fg/10 rounded-full" />
              <div className="h-3 w-24 bg-fg/[0.04] rounded-full" />
            </div>
          </div>
          <div className="bg-fg/10 rounded-lg border border-fg/10 h-[240px] p-7 space-y-5">
            <div className="h-5 w-32 bg-fg/10 rounded-lg" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-10 w-10 bg-fg/10 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-full bg-fg/10 rounded-full" />
                    <div className="h-2 w-2/3 bg-fg/10 rounded-full" />
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
