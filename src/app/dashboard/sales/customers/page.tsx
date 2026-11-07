import React from 'react';
import { getCustomerStats } from '@/lib/actions/customer-actions';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Users, UserPlus, Phone, TrendingUp, Star, AlertCircle, ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { CustomerActionsHeader, AddPartnerBox } from './CustomerActions';
import { checkFeature } from '@/lib/subscription-utils';
import Link from 'next/link';
import { PlanFeatureLocked } from '@/components/billing/PlanFeatureLocked';
import { PartnerCard } from '@/components/partners/PartnerCard';

interface CustomerStat {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: Date | string;
  balanceOwed: number;
  orderCount: number;
  totalSpent: number;
}

export default async function CustomersPage() {
  const hasAccess = await checkWorkerPermissions('customers', 'view');
  const canEdit = await checkWorkerPermissions('customers', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const { activeFarmId } = await (async () => {
    const { getAuthContext } = await import('@/lib/auth-utils');
    return await getAuthContext();
  })();

  const hasCRM = await checkFeature(activeFarmId ?? '', 'CRM');

  if (!hasCRM) {
    return (
      <PlanFeatureLocked
        feature="CRM"
        title="CRM"
        accent="Network"
        description="Customer management tracks debtor balances, purchasing trends and your buyer network."
      />
    );
  }

  const rawStats = await getCustomerStats();
  const customerStats = (rawStats || []) as CustomerStat[];
  
  const totalValue = customerStats.reduce((sum: number, c: CustomerStat) => sum + c.totalSpent, 0);
  const totalOwed = customerStats.reduce((sum: number, c: CustomerStat) => sum + c.balanceOwed, 0);
  const vipClients = customerStats.filter((c: CustomerStat) => c.totalSpent > 1000).length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-7 px-0 md:px-5 pt-2 pb-9 md:py-9 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 shrink-0">
            <ArrowLeft className="w-6 h-6 text-[#85858b]" />
          </Link>
          <div>
            <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Customers</h1>
            <p className="mt-2 text-sm text-[#a1a1a6]">The people and businesses who buy from you, and what they owe</p>
          </div>
        </div>
        <CustomerActionsHeader canEdit={canEdit} />
      </div>

      {/* CRM Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="bg-white/10 border-white/10">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-white/[0.04] border border-white/[0.08]">
                     <Users className="w-4 h-4 md:w-6 md:h-6 text-[#85858b]" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-medium text-white">{customerStats.length}</p>
                     <p className="text-xs md:text-xs font-medium text-white/70">Total profiles</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-white/[0.06] border border-white/[0.08]">
                     <Star className="w-4 h-4 md:w-6 md:h-6 text-[#a1a1a6]" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-medium text-white">{vipClients}</p>
                     <p className="text-xs md:text-xs font-medium text-white/70">VIP clients</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/10">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-white/[0.06] border border-white/[0.08]">
                     <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-[#a1a1a6]" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-medium text-white">{formatCurrency(totalValue)}</p>
                     <p className="text-xs md:text-xs font-medium text-white/70">Portfolio value</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-white/[0.04] border-white/[0.08]">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-white/[0.04] border border-white/[0.08]">
                     <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-[#f2777b]" />
                   </div>
                   <div>
                     <p className="text-xl md:text-2xl font-medium text-[#f2777b]">{formatCurrency(totalOwed)}</p>
                     <p className="text-xs md:text-xs font-medium text-[#f2777b]">Total outstanding</p>
                   </div>
                </div>
             </CardContent>
          </Card>
      </div>

      {/* Grid of Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {customerStats.map((customer: CustomerStat) => (
            <PartnerCard key={customer.id} partner={customer} type="customer" />
          ))}

          {canEdit && <AddPartnerBox />}
      </div>
    </div>
  );
}
