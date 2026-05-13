import React from 'react';
import { getAllOrders } from '@/lib/actions/order-actions';
import { getAllCustomers } from '@/lib/actions/customer-actions';
import { getAllInventory } from '@/lib/actions/inventory-actions';
import { getAllBatches } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Banknote, ShoppingCart, Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { redirect } from 'next/navigation';
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
  } | null;
  items: OrderItem[];
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
}

export default async function SalesPage({ searchParams }: { searchParams: { sellBatchId?: string } }) {
  const { activeFarmId, role, permissions } = await getAuthContext();
  const sellBatchId = searchParams.sellBatchId ? Number(searchParams.sellBatchId) : undefined;
  
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
    getAllInventory(),
    getAllBatches()
  ]);

  const orders = ordersRaw as unknown as Order[];
  const customers = customersRaw as unknown as Customer[];

  const totalRevenue = orders.reduce((sum: number, order: Order) => sum + Number(order.totalAmount), 0);
  const netRevenue = orders.reduce((sum: number, order: Order) => sum + (Number(order.totalAmount) - Number(order.discountAmount || 0)), 0);
  const pendingOrders = orders.filter((o: Order) => o.status === 'PENDING').length;

  const stats = [
    { name: 'Total Revenue', value: formatCurrency(totalRevenue), icon: Banknote, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { name: 'Net Revenue', value: formatCurrency(netRevenue), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { name: 'Active Orders', value: orders.length, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { name: 'Pending', value: pendingOrders, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-7 px-3 md:px-6 py-5 md:py-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-normal">Commercial <span className="text-emerald-400 italic">Hub</span></h1>
          <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-2">Sales & Order Management</p>
        </div>
        <SalesActionsHeader 
          customers={customers} 
          inventory={inventory}
          livestock={livestock}
          initialLivestockId={sellBatchId}
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className={`${stat.bg} border-white/5 backdrop-blur-xl`}>
            <CardContent className="pt-3 md:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">{stat.name}</p>
                  <p className="text-xl md:text-3xl font-bold text-white tracking-normal">{stat.value}</p>
                </div>
                <div className={`p-2 md:p-3 rounded-md ${stat.bg} border border-white/10`}>
                  <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Orders Table */}
        <div className="lg:col-span-2 bg-white/10 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="p-3 md:p-8 border-b border-white/5 flex justify-between items-center">
             <h3 className="text-lg md:text-xl font-bold text-white tracking-normal flex items-center gap-2">
               <Clock className="w-5 h-5 text-emerald-400" /> Recent Orders
             </h3>
             <span className="text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 tracking-widest">
               {orders.length} TOTAL
             </span>
          </div>
          
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/10">
                  <th className="px-7 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Order ID</th>
                  <th className="px-7 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Customer</th>
                  <th className="px-7 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Amount</th>
                  <th className="px-7 py-4 text-xs font-bold uppercase tracking-widest text-white/70">Status</th>
                  <th className="px-7 py-4 text-right text-xs font-bold uppercase tracking-widest text-white/70">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order: Order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-7 py-5">
                      <span className="text-white font-bold text-sm tracking-normal uppercase tabular-nums">ORD-{order.id.toString().padStart(4, '0')}</span>
                    </td>
                    <td className="px-7 py-5">
                      <div className="flex flex-col">
                        <span className="text-white/90 font-bold text-xs">{order.customer?.name || 'Walk-in Customer'}</span>
                        <span className="text-xs text-white/70 font-bold uppercase tracking-widest mt-0.5">{order.customer?.phone || 'No Phone'}</span>
                      </div>
                    </td>
                    <td className="px-7 py-5">
                      <span className="text-emerald-400 font-bold text-sm">{formatCurrency(Number(order.totalAmount))}</span>
                    </td>
                    <td className="px-7 py-5">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                        order.status === 'COMPLETED' || order.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : order.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-7 py-5 text-right">
                       <SalesRowActions order={order} />
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-white/70 font-bold italic tracking-normal">
                      No sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden p-3 space-y-3">
            {orders.map((order: Order) => (
              <div key={order.id} className="bg-black/20 rounded-md p-3 border border-white/5 flex flex-col space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-white font-bold text-sm tracking-normal uppercase tabular-nums">ORD-{order.id.toString().padStart(4, '0')}</span>
                   <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                        order.status === 'COMPLETED' || order.status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : order.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                     {order.status}
                   </span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-white/90 font-bold text-xs">{order.customer?.name || 'Walk-in Customer'}</span>
                    <span className="text-xs text-white/70 font-bold uppercase tracking-widest mt-0.5">{order.customer?.phone || 'No Phone'}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-emerald-400 font-bold text-sm">{formatCurrency(Number(order.totalAmount))}</span>
                    <div className="flex justify-end"><SalesRowActions order={order} /></div>
                 </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="py-9 text-center text-white/70 font-bold italic tracking-normal">
                No sales records found.
              </div>
            )}
          </div>
        </div>

        {/* Top Customers Widget */}
        <div className="space-y-5">
           <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <CardHeader>
                <CardTitle className="text-emerald-400">Sales Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                   <div className="h-12 w-12 rounded-md bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                     <TrendingUp className="w-6 h-6 text-emerald-400" />
                   </div>
                   <div>
                     <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue / 30)}</p>
                     <p className="text-xs font-bold uppercase text-white/70 tracking-widest">Avg Daily Revenue</p>
                   </div>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                   <div className="h-full bg-emerald-500 w-[65%]" />
                </div>
                <p className="text-[9px] font-bold text-emerald-400/70 mt-2 uppercase tracking-widest flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3" /> 18% Increase from last month
                </p>
              </CardContent>
           </Card>

           <Card className="bg-white/10 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white/80">Top Customers</CardTitle>
                <Users className="w-5 h-5 text-white/20" />
              </CardHeader>
              <CardContent className="space-y-3">
                 {customers.slice(0, 5).map((cust: Customer, idx: number) => (
                   <div key={cust.id} className="flex justify-between items-center bg-black/20 p-2 rounded-md border border-white/5">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold text-white/70 border border-white/10">
                           {idx + 1}
                         </div>
                         <span className="text-xs font-bold text-white/90 truncate">{cust.name}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 tracking-normal shrink-0">VIP Client</span>
                   </div>
                 ))}
                 <button className="w-full py-2 rounded-md bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors mt-2">
                   View All CRM Profiles
                 </button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
