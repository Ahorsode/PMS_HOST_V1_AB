"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { Banknote, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Activity, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FinancialOverview } from '@/components/dashboard/FinancialOverview';

interface AccountantDashboardProps {
  summary: any;
  stats: any;
}

export function AccountantDashboard({ summary, stats }: AccountantDashboardProps) {
  // Mocking some financial-specific metrics for the "Terminal" feel
  const revenueVelocity = "+14.2%";
  const burnRate = formatCurrency(4250);
  const totalDebt = formatCurrency(1200);

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tighter">Financial <span className="text-emerald-400 italic">Terminal</span></h1>
        <p className="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
           <Landmark className="w-3 h-3" /> Real-time Fiscal Monitoring
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cash Flow Main Card */}
        <Card className="md:col-span-2 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              Cash Flow Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Net Position</p>
                <h2 className="text-6xl font-black text-white tracking-tighter">
                  {formatCurrency((summary?.revenue || 0) - (summary?.expenses || 0))}
                </h2>
                <div className="flex items-center gap-2 mt-4 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">{revenueVelocity} vs last month</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Revenue Velocity</span>
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-white tracking-tight">{formatCurrency(summary?.revenue || 0)}</span>
                    <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[75%]" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Expense Burn</span>
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-white tracking-tight">{formatCurrency(summary?.expenses || 0)}</span>
                    <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-red-500 w-[45%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Stats */}
        <div className="space-y-6">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
               <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
                 <CreditCard className="w-4 h-4" /> Account Receivables
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-3xl font-black text-white tracking-tighter">{totalDebt}</div>
               <p className="text-[9px] text-white/40 uppercase font-black mt-1">Pending from 3 active distributors</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardHeader className="pb-2">
               <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                 <Activity className="w-4 h-4" /> Operations Burn
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-3xl font-black text-white tracking-tighter">{burnRate}</div>
               <p className="text-[9px] text-white/40 uppercase font-black mt-1">Avg. operational cost / week</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <FinancialOverview data={summary} />
        
        {/* Recent Financial Events */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Audit Trail - Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {(() => {
               const combined = [
                 ...(stats.recentOrders || []).map((o: any) => ({ ...o, type: 'ORDER', date: new Date(o.orderDate) })),
                 ...(stats.recentSales || []).map((s: any) => ({ ...s, type: 'SALE', date: new Date(s.saleDate) }))
               ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

               if (combined.length === 0) {
                 return <div className="text-center py-8 text-white/40 italic font-bold">No recent financial events.</div>;
               }

               return combined.map((item: any, i: number) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                         <Banknote className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm tracking-tight">
                          {item.type === 'ORDER' ? `Order #${item.id}` : `Sale #${item.id}`} - {item.customerName || 'Walk-in'}
                        </p>
                        <p className="text-[9px] text-white/40 uppercase font-black">
                          {item.date.toLocaleDateString()} • {item.status || 'Verified'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-black text-lg">+ {formatCurrency(item.totalAmount)}</p>
                    </div>
                 </div>
               ));
             })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
