import React from 'react';
import { getSupplierStats } from '@/lib/actions/supplier-actions';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Users, UserPlus, Phone, TrendingUp, Star, AlertCircle, ArrowLeft, Truck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { SupplierActionsHeader, AddPartnerBox } from './SupplierActions';
import { checkFeature } from '@/lib/subscription-utils';
import Link from 'next/link';
import { PlanFeatureLocked } from '@/components/billing/PlanFeatureLocked';
import { PartnerCard } from '@/components/partners/PartnerCard';

interface SupplierStat {
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

export default async function SuppliersPage() {
  const hasAccess = await checkWorkerPermissions('customers', 'view'); // Using customers/CRM permission
  const canEdit = await checkWorkerPermissions('customers', 'edit');

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const { activeFarmId } = await (async () => {
    const { getAuthContext } = await import('@/lib/auth-utils');
    return await getAuthContext();
  })();

  const hasSuppliers = await checkFeature(activeFarmId ?? '', 'SUPPLIERS');

  if (!hasSuppliers) {
    return (
      <PlanFeatureLocked
        feature="SUPPLIERS"
        title="Supply"
        accent="Network"
        description="Supplier management tracks vendor balances, supply trends and your vendor network."
      />
    );
  }

  const rawStats = await getSupplierStats();
  const supplierStats = (rawStats || []) as SupplierStat[];
  
  const totalValue = supplierStats.reduce((sum: number, c: SupplierStat) => sum + c.totalSpent, 0);
  const totalOwed = supplierStats.reduce((sum: number, c: SupplierStat) => sum + c.balanceOwed, 0);
  const vipVendors = supplierStats.filter((c: SupplierStat) => c.totalSpent > 1000).length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-7 px-0 md:px-5 pt-2 pb-9 md:py-9 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 shrink-0 hover:scale-105">
            <ArrowLeft className="w-6 h-6 text-emerald-400" />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-white tracking-normal">Supply <span className="text-emerald-400 italic">Network</span></h1>
            <p className="text-white/80 font-black uppercase tracking-[0.2em] text-sm mt-2">Manage Vendors & Supply Chain</p>
          </div>
        </div>
        <SupplierActionsHeader canEdit={canEdit} />
      </div>

      {/* CRM Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="bg-white/10 border-white/10 backdrop-blur-xl">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-emerald-500/10 border border-emerald-500/10">
                     <Truck className="w-4 h-4 md:w-6 md:h-6 text-emerald-400" />
                   </div>
                   <div>
                     <p className="text-2xl md:text-3xl font-black text-white">{supplierStats.length}</p>
                     <p className="text-xs md:text-sm font-black uppercase text-emerald-400 tracking-widest mt-1">Total Vendors</p>
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
                     <p className="text-2xl md:text-3xl font-black text-white">{vipVendors}</p>
                     <p className="text-xs md:text-sm font-black uppercase text-purple-400 tracking-widest mt-1">Key Suppliers</p>
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
                     <p className="text-2xl md:text-3xl font-black text-white">{formatCurrency(totalValue)}</p>
                     <p className="text-xs md:text-sm font-black uppercase text-blue-400 tracking-widest mt-1">Total Purchased</p>
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
                     <p className="text-2xl md:text-3xl font-black text-red-400">{formatCurrency(totalOwed)}</p>
                     <p className="text-xs md:text-sm font-black uppercase text-red-500/60 tracking-widest mt-1">Total Outstanding</p>
                   </div>
                </div>
             </CardContent>
          </Card>
      </div>

      {/* Grid of Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {supplierStats.map((supplier: SupplierStat) => (
            <PartnerCard key={supplier.id} partner={supplier} type="supplier" />
          ))}

          {canEdit && <AddPartnerBox />}
      </div>
    </div>
  );
}
