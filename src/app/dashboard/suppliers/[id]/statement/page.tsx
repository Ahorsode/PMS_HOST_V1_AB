import React from 'react';
import { getSupplierStatement } from '@/lib/actions/statement-actions';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Truck, Calendar, ShoppingBag, Receipt, MapPin, Phone, Mail, Download } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SupplierStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplierId = id;
  
  if (!supplierId) {
    redirect('/dashboard/suppliers');
  }

  const statement = await getSupplierStatement(supplierId);

  if (!statement) {
    redirect('/dashboard/suppliers');
  }

  const transactions = [
    ...statement.inventory.map((item: any) => ({
      id: `inv-${item.id}`,
      type: 'Inventory',
      name: item.itemName,
      date: item.createdAt,
      amount: Number(item.stockLevel) * Number(item.costPerUnit || 0),
      details: `${item.stockLevel} ${item.unit} @ ${formatCurrency(item.costPerUnit)}/unit`
    })),
    ...statement.expenses.map((e: any) => ({
      id: `exp-${e.id}`,
      type: 'Expense',
      name: e.description,
      date: e.expenseDate,
      amount: e.amount,
      details: e.category
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-[1200px] mx-auto space-y-7 px-0 md:px-5 pt-2 pb-9 md:py-9 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/suppliers" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 shrink-0">
            <ArrowLeft className="w-6 h-6 text-[#85858b]" />
          </Link>
          <div>
            <h1 className="text-3xl font-medium leading-tight text-[#ededed]">Statement</h1>
            <p className="mt-2 text-sm text-[#a1a1a6]">{statement.name}</p>
          </div>
        </div>
        <button className="border border-white/[0.08] bg-[#232325] text-[#85858b] px-4 h-10 rounded-lg text-sm transition-colors flex items-center gap-2 cursor-not-allowed opacity-50">
           <Download className="w-4 h-4" />
           PDF download coming soon
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Sidebar Stats */}
         <div className="space-y-6">
            <Card className="bg-white/10 border-white/10 h-fit">
               <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                     <div className="w-14 h-14 rounded-lg bg-white/[0.04] flex items-center justify-center text-xl font-medium text-[#ededed]">
                        {statement.name.charAt(0)}
                     </div>
                     <div className="overflow-hidden">
                        <h3 className="text-lg font-medium text-white truncate">{statement.name}</h3>
                        <p className="text-[#ededed] text-xs font-medium">Supply partner</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center gap-3 text-white/70">
                        <Phone className="w-4 h-4 text-[#85858b]" />
                        <span className="text-sm font-medium">{statement.phone || 'N/A'}</span>
                     </div>
                     <div className="flex items-center gap-3 text-white/70">
                        <Mail className="w-4 h-4 text-[#85858b]" />
                        <span className="text-sm font-medium truncate">{statement.email || 'N/A'}</span>
                     </div>
                     <div className="flex items-center gap-3 text-white/70">
                        <MapPin className="w-4 h-4 text-[#85858b]" />
                        <span className="text-sm font-medium line-clamp-2">{statement.address || 'N/A'}</span>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                     <div className="p-4 rounded-md bg-white/[0.04] border border-white/[0.08]">
                        <p className="text-xs font-medium text-[#f2777b] mb-1">Balance owed (to vendor)</p>
                        <p className="text-2xl font-medium text-[#f2777b]">{formatCurrency(statement.balanceOwed)}</p>
                     </div>
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Transaction Timeline */}
         <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-medium text-white px-2 mb-4">Transaction history</h2>
            {transactions.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-dashed border-white/10 rounded-lg text-white/60">
                  No transactions recorded yet.
               </div>
            ) : (
               transactions.map((tx) => (
                  <div key={tx.id} className="group relative bg-white/5 border border-white/10 p-5 rounded-lg hover:bg-white/[0.08] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-md ${tx.type === 'Inventory' ? 'bg-white/[0.04]' : 'bg-white/[0.06]'} transition-transform shrink-0`}>
                           {tx.type === 'Inventory' ? <ShoppingBag className="w-5 h-5 text-[#85858b]" /> : <Receipt className="w-5 h-5 text-[#a1a1a6]" />}
                        </div>
                        <div>
                           <p className="text-white font-medium text-lg leading-tight">{tx.name}</p>
                           <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${tx.type === 'Inventory' ? 'bg-white/[0.04] text-emerald-400' : 'bg-white/[0.06] text-[#a1a1a6]'}`}>
                                 {tx.type}
                              </span>
                              <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
                                 <Calendar className="w-3 h-3" />
                                 {new Date(tx.date).toLocaleDateString()}
                              </div>
                           </div>
                           <p className="text-white/40 text-xs font-medium mt-2">{tx.details}</p>
                        </div>
                     </div>
                     <div className="sm:text-right border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                        <p className="text-xl font-medium text-white">{formatCurrency(tx.amount)}</p>
                        <p className="text-xs font-medium text-white/60">Amount paid/cost</p>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}
