import React from 'react';
import { getAllOrders } from '@/lib/actions/order-actions';
import { getAllCustomers } from '@/lib/actions/customer-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Banknote, ShoppingCart, Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getAuthContext, hasPermission } from '@/lib/auth-utils';
import { SalesRowActions, SalesActionsHeader } from './SalesActions';

interface OrderItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: number;
  totalAmount: any;
  discountAmount: any;
  status: string;
  customer: {
    name: string;
    phone: string | null;
  };
  items: OrderItem[];
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
}

export default async function SalesPage() {
  const { activeFarmId, role, permissions } = await getAuthContext();
  
  if (!activeFarmId) {
    redirect('/dashboard');
  }

  // RBAC Check
  if (!hasPermission(role, permissions, 'VIEW_SALES')) {
    redirect('/dashboard/unauthorized');
  }

  const [ordersRaw, customersRaw, inventory, livestock] = await Promise.all([
    getAllOrders(),
    getAllCustomers(),
    prisma.inventory.findMany({ where: { farmId: activeFarmId } }),
    prisma.livestock.findMany({ where: { farmId: activeFarmId } })
  ]);

  const orders = ordersRaw as unknown as Order[];
  const customers = customersRaw as unknown as Customer[];

  const totalRevenue = orders.reduce((sum: number, order: Order) => sum + Number(order.totalAmount), 0);
  const pendingOrders = orders.filter((o: Order) => o.status === 'PENDING').length;

  const stats = [
    { name: 'Total Revenue', value: formatCurrency(totalRevenue), icon: Banknote, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Active Orders', value: orders.length, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { name: 'Customers', value: customers.length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { name: 'Pending', value: pendingOrders, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-6 py-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Commercial <span className="text-emerald-400 italic">Hub</span></h1>
          <p className="text-white/50 font-bold uppercase tracking-widest text-[10px] mt-2">Sales & Order Management</p>
        </div>
        <SalesActionsHeader 
          customers={customers} 
          inventory={inventory}
          livestock={livestock}
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className={`${stat.bg} border-white/5 backdrop-blur-xl`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{stat.name}</p>
                  <p className="text-3xl font-black text-white tracking-tight">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.bg} border border-white/10`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders Table */}
        <div className="lg:col-span-2 bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
             <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
               <Clock className="w-5 h-5 text-emerald-400" /> Recent Orders
             </h3>
             <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 tracking-widest">
               {orders.length} TOTAL
             </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Order ID</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Customer</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-white/40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order: Order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-white font-black text-sm tracking-tighter uppercase tabular-nums">ORD-{order.id.toString().padStart(4, '0')}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-white/90 font-bold text-xs">{order.customer.name}</span>
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">{order.customer.phone || 'No Phone'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-emerald-400 font-black text-sm">{formatCurrency(Number(order.totalAmount))}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        order.status === 'COMPLETED' || order.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : order.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <SalesRowActions order={order} />
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-white/40 font-bold italic tracking-tight">
                      No sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers Widget */}
        <div className="space-y-6">
           <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <CardHeader>
                <CardTitle className="text-emerald-400">Sales Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                   <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                     <TrendingUp className="w-6 h-6 text-emerald-400" />
                   </div>
                   <div>
                     <p className="text-2xl font-black text-white">{formatCurrency(totalRevenue / 30)}</p>
                     <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Avg Daily Revenue</p>
                   </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                   <div className="h-full bg-emerald-500 w-[65%]" />
                </div>
                <p className="text-[9px] font-bold text-emerald-400/70 mt-2 uppercase tracking-widest flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3" /> 18% Increase from last month
                </p>
              </CardContent>
           </Card>

           <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white/60">Top Customers</CardTitle>
                <Users className="w-5 h-5 text-white/20" />
              </CardHeader>
              <CardContent className="space-y-4">
                 {customers.slice(0, 5).map((cust: Customer, idx: number) => (
                   <div key={cust.id} className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40 border border-white/10">
                           {idx + 1}
                         </div>
                         <span className="text-xs font-bold text-white/90 truncate">{cust.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-400 tracking-tighter shrink-0">VIP Client</span>
                   </div>
                 ))}
                 <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors mt-2">
                   View All CRM Profiles
                 </button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
