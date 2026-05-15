import React from 'react';
import { getCustomerStats } from '@/lib/actions/customer-actions';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Users, UserPlus, Phone, TrendingUp, Star, AlertCircle, Lock, ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getAuthContext, hasPermission } from '@/lib/auth-utils';
import { CustomerActionsHeader, AddPartnerBox } from './CustomerActions';
import { checkFeature } from '@/lib/subscription-utils';
import Link from 'next/link';

interface CustomerStat {
  id: number;
  name: string;
  balanceOwed: number;
  orderCount: number;
  totalSpent: number;
}

export default async function CustomersPage() {
  const { activeFarmId, role, permissions } = await getAuthContext();
  
  if (!activeFarmId) {
    redirect('/dashboard');
  }

  // RBAC Check
  if (!hasPermission(role, permissions, 'VIEW_CUSTOMERS')) {
    redirect('/dashboard/unauthorized');
  }

  const hasCRM = await checkFeature(activeFarmId, 'CRM');

  if (!hasCRM) {
    return (
      <div className="max-w-[1600px] mx-auto min-h-[60vh] flex flex-col items-center justify-center px-5 py-9 relative">
        <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-center mb-5">
          <Lock className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-3 tracking-normal">CRM <span className="text-rose-400 italic">Network</span></h1>
        <p className="text-white/80 mb-7 max-w-lg text-center leading-relaxed">
          The Customer Relationship Management module is a <span className="text-white font-bold">Standard</span> tier feature. Upgrade to track debtor balances, monitor VIP purchasing trends, and manage your network.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link href="/dashboard" className="bg-white/5 border border-white/10 text-white/80 px-9 py-4 rounded-md font-bold uppercase tracking-widest text-[11px] hover:scale-105 hover:bg-white/10 hover:text-white transition-all text-center">
            Go Back
          </Link>
          <Link href="/dashboard/license-upgrade" className="bg-white text-black px-9 py-4 rounded-md font-bold uppercase tracking-widest text-[11px] hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] text-center">
            Upgrade Subscription
          </Link>
        </div>
      </div>
    );
  }

  const rawStats = await getCustomerStats();
  const customerStats = (rawStats || []) as CustomerStat[];
  
  const totalValue = customerStats.reduce((sum: number, c: CustomerStat) => sum + c.totalSpent, 0);
  const totalOwed = customerStats.reduce((sum: number, c: CustomerStat) => sum + c.balanceOwed, 0);
  const vipClients = customerStats.filter((c: CustomerStat) => c.totalSpent > 1000).length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-7 px-5 py-9 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 shrink-0 hover:scale-105">
            <ArrowLeft className="w-6 h-6 text-emerald-400" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-normal">CRM <span className="text-emerald-400 italic">Network</span></h1>
            <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-2">Manage Customer Lifecycle & Relationships</p>
          </div>
        </div>
        <CustomerActionsHeader />
      </div>

      {/* CRM Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="bg-white/10 border-white/10 backdrop-blur-xl">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-emerald-500/10 border border-emerald-500/10">
                     <Users className="w-4 h-4 md:w-6 md:h-6 text-emerald-400" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-bold text-white">{customerStats.length}</p>
                     <p className="text-[9px] md:text-[10px] font-bold uppercase text-white/70 tracking-widest">Total Profiles</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 backdrop-blur-xl">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-purple-500/10 border border-purple-500/10">
                     <Star className="w-4 h-4 md:w-6 md:h-6 text-purple-400" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-bold text-white">{vipClients}</p>
                     <p className="text-[9px] md:text-[10px] font-bold uppercase text-white/70 tracking-widest">VIP Clients</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10 backdrop-blur-xl">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-blue-500/10 border border-blue-500/10">
                     <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-blue-400" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
                     <p className="text-[9px] md:text-[10px] font-bold uppercase text-white/70 tracking-widest">Portfolio Value</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-xl">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-red-500/10 border border-red-500/10">
                     <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-red-400" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-bold text-red-400">{formatCurrency(totalOwed)}</p>
                     <p className="text-[9px] md:text-[10px] font-bold uppercase text-red-500/40 tracking-widest">Total Outstanding</p>
                   </div>
                </div>
             </CardContent>
          </Card>
      </div>

      {/* Grid of Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
         {customerStats.map((customer: CustomerStat) => (
           <Card key={customer.id} className="bg-white/10 border-white/10 backdrop-blur-lg hover:bg-white/[0.08] transition-all cursor-pointer group relative overflow-hidden">
              {customer.balanceOwed > 0 && (
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
              )}
              <CardContent className="pt-7">
                 <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-3xl font-bold text-emerald-400 mb-3 group-hover:scale-110 transition-all duration-500">
                       {customer.name.charAt(0)}
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-normal mb-1 line-clamp-1">{customer.name}</h3>
                    <div className="flex items-center gap-2 mb-5">
                       <span className="text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-widest">
                         {customer.orderCount} Orders
                       </span>
                       {customer.balanceOwed > 0 && (
                         <span className="text-[9px] font-bold uppercase bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20 tracking-widest">
                           DEBTOR
                         </span>
                       )}
                    </div>

                    <div className="w-full grid grid-cols-2 gap-2 mb-5">
                       <div className="p-2 rounded-md bg-black/20 border border-white/5">
                          <p className="text-[8px] font-bold uppercase text-white/70 mb-1 tracking-widest">Spent</p>
                          <p className="text-xs font-bold text-white">{formatCurrency(customer.totalSpent)}</p>
                       </div>
                       <div className="p-2 rounded-md bg-black/20 border border-white/5 text-left">
                          <p className="text-[8px] font-bold uppercase text-white/70 mb-1 tracking-widest">Owed</p>
                          <p className={`text-xs font-bold ${customer.balanceOwed > 0 ? 'text-red-400' : 'text-white/20'}`}>
                            {formatCurrency(customer.balanceOwed)}
                          </p>
                       </div>
                    </div>

                    <div className="flex gap-2 w-full">
                       <button className="flex-1 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10">
                          <Phone className="w-4 h-4 text-emerald-400 mx-auto" />
                       </button>
                       <button className="flex-2 w-full py-2 rounded-md bg-emerald-500 text-[#064e3b] font-bold text-xs uppercase tracking-widest">
                          Profile
                       </button>
                    </div>
                 </div>
              </CardContent>
           </Card>
          ))}

          <AddPartnerBox />
      </div>
    </div>
  );
}
