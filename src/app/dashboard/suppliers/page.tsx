import React from 'react';
import { getSupplierStats } from '@/lib/actions/supplier-actions';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { getFarmCurrency } from '@/lib/farm-currency';
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
  const currency = await getFarmCurrency(activeFarmId);

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
          <Link href="/dashboard" className="p-3 bg-fg/5 hover:bg-fg/10 rounded-full transition-colors border border-fg/10 shrink-0">
            <ArrowLeft className="w-6 h-6 text-fg-3" />
          </Link>
          <div>
            <h1 className="text-3xl font-medium leading-tight text-fg">Suppliers</h1>
            <p className="mt-2 text-sm text-fg-2">Who you buy feed, stock and services from, and what you owe them</p>
          </div>
        </div>
        <SupplierActionsHeader canEdit={canEdit} />
      </div>

      {/* CRM Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="bg-fg/10 border-fg/10">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-fg/[0.04] border border-fg/[0.08]">
                     <Truck className="w-4 h-4 md:w-6 md:h-6 text-fg-3" />
                   </div>
                   <div>
                     <p className="text-2xl md:text-3xl font-medium text-fg">{supplierStats.length}</p>
                     <p className="text-xs md:text-sm font-medium text-fg mt-1">Total vendors</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-fg/10 border-fg/10">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-fg/[0.06] border border-fg/[0.08]">
                     <Star className="w-4 h-4 md:w-6 md:h-6 text-fg-2" />
                   </div>
                   <div>
                     <p className="text-2xl md:text-3xl font-medium text-fg">{vipVendors}</p>
                     <p className="text-xs md:text-sm font-medium text-fg-2 mt-1">Key suppliers</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-fg/10 border-fg/10">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-fg/[0.06] border border-fg/[0.08]">
                     <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-fg-2" />
                   </div>
                   <div>
                     <p className="text-2xl md:text-3xl font-medium text-fg">{formatCurrency(totalValue, currency)}</p>
                     <p className="text-xs md:text-sm font-medium text-fg-2 mt-1">Total purchased</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="bg-fg/[0.04] border-fg/[0.08]">
             <CardContent className="pt-3 md:pt-8">
                <div className="flex items-center gap-2 md:gap-4">
                   <div className="p-2 md:p-3 rounded-md bg-fg/[0.04] border border-fg/[0.08]">
                     <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-neg" />
                   </div>
                   <div>
                     <p className="text-2xl md:text-3xl font-medium text-neg">{formatCurrency(totalOwed, currency)}</p>
                     <p className="text-xs md:text-sm font-medium text-neg mt-1">Total outstanding</p>
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
