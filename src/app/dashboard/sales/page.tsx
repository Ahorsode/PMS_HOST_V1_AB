import React from 'react';
import { getAllOrders } from '@/lib/actions/order-actions';
import { getAllCustomers } from '@/lib/actions/customer-actions';
import { getAllInventory, getSellableEggInventory, getActiveBatchEggStock, getEggFifoAvailabilityMap } from '@/lib/actions/inventory-actions';
import { getAllBatches } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { Banknote, ShoppingCart, Users, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import { SalesRowActions, SalesActionsHeader } from './SalesActions';
import { checkWorkerPermissions } from '@/lib/actions/staff-actions';
import { WorkerStamp } from '@/components/ui/WorkerStamp';
import Link from 'next/link';
import { getAuthContext } from '@/lib/auth-utils';
import { getFarmSettings, getSalesSettings } from '@/lib/actions/preference-actions';

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  inventoryId?: string | null;
  livestockId?: string | null;
}

interface Order {
  id: string;
  customerId?: string | null;
  invoiceNumber?: number | null;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount: any;
  discountAmount: any;
  status: string;
  orderDate?: string | Date;
  paidAt?: string | Date | null;
  customer: {
    name: string;
    phone: string | null;
    balanceOwed?: number;
  } | null;
  items: OrderItem[];
  user?: {
    firstname: string | null;
    surname: string | null;
    role: string;
  } | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toIsoString(value: string | Date | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeOrder(order: Order) {
  return {
    ...order,
    subtotalAmount: toNumber(order.subtotalAmount || order.totalAmount),
    taxAmount: toNumber(order.taxAmount),
    totalAmount: toNumber(order.totalAmount),
    discountAmount: toNumber(order.discountAmount),
    orderDate: toIsoString(order.orderDate),
    paidAt: toIsoString(order.paidAt),
    customer: order.customer ? {
      name: order.customer.name,
      phone: order.customer.phone,
      balanceOwed: toNumber(order.customer.balanceOwed),
    } : null,
    items: order.items.map((item: OrderItem) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      totalPrice: toNumber(item.totalPrice),
      inventoryId: item.inventoryId ?? null,
      livestockId: item.livestockId ?? null,
    })),
  };
}

function orderTypeLabels(order: { items: Array<{ inventoryId?: string | null; livestockId?: string | null }> }) {
  const hasEggs = order.items.some((item) => !!item.inventoryId);
  const hasBirds = order.items.some((item) => !!item.livestockId);
  const labels: string[] = [];
  if (hasEggs) labels.push('Eggs');
  if (hasBirds) labels.push('Birds');
  if (labels.length === 0) labels.push('Custom');
  return labels;
}

type SalesOrder = ReturnType<typeof normalizeOrder>;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ sellBatchId?: string; quick?: string }> }) {
  const hasAccess = await checkWorkerPermissions('sales', 'view');
  const canEdit = await checkWorkerPermissions('sales', 'edit');
  const { role } = await getAuthContext();
  const canOverridePrice = role === 'OWNER' || role === 'MANAGER';
  const canCreateSale = canEdit;
  const canRecordPayment = role === 'OWNER' || role === 'ACCOUNTANT' || role === 'FINANCE_OFFICER' || role === 'CASHIER';

  if (!hasAccess) {
    redirect('/dashboard/unauthorized');
  }

  const resolvedParams = await searchParams;
  const sellBatchId = resolvedParams.sellBatchId;
  const openSellOnLoad = resolvedParams.quick === 'sell';

  const [ordersRaw, customersRaw, inventoryRaw, eggInventoryRaw, eggBatchStockRaw, fifoEggAvailabilityRaw, livestockRaw, farmSettings, salesSettings] = await Promise.all([
    getAllOrders(),
    getAllCustomers(),
    getAllInventory(),
    getSellableEggInventory(),
    getActiveBatchEggStock(),
    getEggFifoAvailabilityMap(),
    getAllBatches(),
    getFarmSettings(),
    getSalesSettings(),
  ]);
  const eggsPerCrate = farmSettings?.eggsPerCrate ?? 30;
  const allowBatchOverride = salesSettings?.allowBatchOverride ?? false;
  const allowWorkerDiscounts = salesSettings?.allowWorkerDiscounts ?? true;
  const defaultDiscountType = salesSettings?.defaultDiscountType === 'flat' || salesSettings?.defaultDiscountType === 'percent'
    ? salesSettings.defaultDiscountType
    : 'item';

  const orders: SalesOrder[] = (ordersRaw as unknown as Order[]).map(normalizeOrder);
  const customers = (customersRaw as unknown as Customer[]).map((customer: Customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
  }));
  const inventory = (inventoryRaw as any[]).map((item: any) => ({
    id: item.id,
    itemName: item.itemName,
    stockLevel: toNumber(item.stockLevel),
    unit: item.unit,
    category: item.category,
    costPerUnit: item.costPerUnit == null ? null : toNumber(item.costPerUnit),
    sellingPrice: item.sellingPrice == null ? null : toNumber(item.sellingPrice),
    eggCategory: item.eggCategory ? {
      id: item.eggCategory.id,
      name: item.eggCategory.name,
      sellingPrice: toNumber(item.eggCategory.sellingPrice),
      unitSize: toNumber(item.eggCategory.unitSize),
    } : null,
  }));
  const eggInventory = (eggInventoryRaw as any[]).map((item: any) => ({
    id: item.id,
    itemName: item.itemName,
    stockLevel: toNumber(item.stockLevel),
    unit: item.unit,
    category: item.category,
    costPerUnit: item.costPerUnit == null ? null : toNumber(item.costPerUnit),
    sellingPrice: item.sellingPrice == null ? null : toNumber(item.sellingPrice),
    eggCategory: item.eggCategory ? {
      id: item.eggCategory.id,
      name: item.eggCategory.name,
      sellingPrice: toNumber(item.eggCategory.sellingPrice),
      unitSize: toNumber(item.eggCategory.unitSize),
    } : null,
  }));
  const eggBatchStock = (eggBatchStockRaw?.batches ?? []).map((batch: any) => ({
    batchId: batch.batchId,
    batchName: batch.batchName,
    eggsRemaining: toNumber(batch.eggsRemaining),
  }));
  const livestock = (livestockRaw as any[]).map((batch: any) => ({
    id: batch.id,
    batchName: batch.batchName,
    currentCount: toNumber(batch.currentCount),
    initialCount: toNumber(batch.initialCount),
    initialCostActual: batch.initialCostActual == null ? null : toNumber(batch.initialCostActual),
    initial_actual_cost: batch.initial_actual_cost == null ? null : toNumber(batch.initial_actual_cost),
    status: batch.status,
    type: batch.type,
  }));

  const totalRevenue = orders.reduce((sum: number, order) => sum + Number(order.subtotalAmount || order.totalAmount), 0);
  const netRevenue = orders.reduce((sum: number, order) => sum + Number(order.totalAmount), 0);
  const pendingOrders = orders.filter((order) => order.status === 'PENDING').length;

  const orderDates = orders
    .map((order) => new Date(order.orderDate as string).getTime())
    .filter(Boolean);

  const daySpan = orderDates.length > 1
    ? Math.max(
        1,
        Math.ceil((Math.max(...orderDates) - Math.min(...orderDates)) / (1000 * 60 * 60 * 24))
      )
    : 30;

  const avgDailyRevenue = totalRevenue / daySpan;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthRevenue = orders
    .filter((order) => new Date(order.orderDate as string) >= thisMonthStart)
    .reduce((sum: number, order) => sum + Number(order.totalAmount), 0);

  const lastMonthRevenue = orders
    .filter((order) => {
      const date = new Date(order.orderDate as string);
      return date >= lastMonthStart && date < thisMonthStart;
    })
    .reduce((sum: number, order) => sum + Number(order.totalAmount), 0);

  const monthOverMonthChange = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : null;

  const customerRevenue = orders.reduce((acc: Record<string, number>, order) => {
    if (!order.customerId) return acc;

    acc[order.customerId] = (acc[order.customerId] ?? 0) + Number(order.totalAmount);
    return acc;
  }, {} as Record<string, number>);

  const topCustomers = [...customers]
    .filter((customer: Customer) => customerRevenue[customer.id])
    .sort((a: Customer, b: Customer) => (customerRevenue[b.id] ?? 0) - (customerRevenue[a.id] ?? 0))
    .slice(0, 5);

  const stats = [
    { name: 'Total Revenue', value: formatCurrency(totalRevenue), icon: Banknote, color: 'text-fg', bg: 'bg-fg/[0.04]' },
    { name: 'Net Revenue', value: formatCurrency(netRevenue), icon: TrendingUp, color: 'text-fg-2', bg: 'bg-fg/[0.06]' },
    { name: 'Active Orders', value: orders.length, icon: ShoppingCart, color: 'text-fg-2', bg: 'bg-fg/[0.06]' },
    { name: 'Pending', value: pendingOrders, icon: Clock, color: 'text-fg', bg: 'bg-fg/[0.04]' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-7 px-0 md:px-6 pt-2 pb-5 md:py-10 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-medium leading-tight text-fg">Sales</h1>
          <p className="mt-2 text-sm text-fg-2">Orders, payments and what customers still owe</p>
        </div>
        <SalesActionsHeader 
          customers={customers} 
          inventory={inventory}
          eggInventory={eggInventory}
          eggBatchStock={eggBatchStock}
          fifoEggAvailability={fifoEggAvailabilityRaw}
          livestock={livestock}
          eggsPerCrate={eggsPerCrate}
          initialLivestockId={sellBatchId}
          initialOpen={openSellOnLoad || !!sellBatchId}
          canEdit={canCreateSale}
          canOverridePrice={canOverridePrice}
          allowBatchOverride={allowBatchOverride}
          allowWorkerDiscounts={allowWorkerDiscounts}
          defaultDiscountType={defaultDiscountType}
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className={`${stat.bg} border-fg/5 `}>
            <CardContent className="pt-3 md:pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-xs font-medium text-fg/70 mb-1 break-words">{stat.name}</p>
                  <p className="text-sm sm:text-lg md:text-2xl font-medium text-fg tracking-tight break-words">{stat.value}</p>
                </div>
                <div className={`shrink-0 p-2 md:p-3 rounded-md ${stat.bg} border border-fg/10`}>
                  <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Orders Table */}
        <div className="lg:col-span-2 bg-fg/10 rounded-[1.5rem] md:rounded-[2.5rem] border border-fg/10 overflow-hidden">
          <div className="p-3 md:p-8 border-b border-fg/5 flex justify-between items-center">
             <h3 className="text-lg md:text-xl font-medium text-fg tracking-normal flex items-center gap-2">
               <Clock className="w-5 h-5 text-fg-3" /> Recent orders
             </h3>
             <span className="text-xs font-medium bg-fg/[0.04] text-fg px-2 py-1 rounded-full border border-fg/[0.08]">
               {orders.length} TOTAL
             </span>
          </div>
          
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-fg/10">
                  <th className="px-7 py-4 text-xs font-medium text-fg/70">Order</th>
                  <th className="px-7 py-4 text-xs font-medium text-fg/70">Type</th>
                  <th className="px-7 py-4 text-xs font-medium text-fg/70">Customer</th>
                  <th className="px-7 py-4 text-xs font-medium text-fg/70">Amount</th>
                  <th className="px-7 py-4 text-xs font-medium text-fg/70">Status</th>
                  <th className="px-7 py-4 text-right text-xs font-medium text-fg/70">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fg/5">
                {orders.map((order: SalesOrder, index: number) => (
                  <tr key={order.id} className="hover:bg-fg/5 transition-colors group">
                    <td className="px-7 py-5">
                      <span className="text-fg font-medium text-sm tracking-normal tabular-nums">Order {index + 1}</span>
                    </td>
                    <td className="px-7 py-5">
                      <div className="flex flex-wrap gap-1">
                        {orderTypeLabels(order).map((label) => (
                          <span
                            key={label}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              label === 'Eggs'
                                ? 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                                : label === 'Birds'
                                  ? 'bg-fg/[0.06] text-fg-2 border-fg/[0.08]'
                                  : 'bg-fg/10 text-fg/60 border-fg/10'
                            }`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-7 py-5">
                      <div className="flex flex-col">
                        <span className="text-fg/90 font-medium text-xs">{order.customer?.name || 'Walk-in Customer'}</span>
                        <span className="text-xs text-fg/70 font-medium mt-0.5">{order.customer?.phone || 'No Phone'}</span>
                      </div>
                    </td>
                    <td className="px-7 py-5">
                      <span className="text-fg font-medium text-sm">{formatCurrency(Number(order.totalAmount))}</span>
                    </td>
                    <td className="px-7 py-5">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        order.status === 'COMPLETED' || order.status === 'PAID'
                          ? 'bg-fg/[0.04] text-emerald-400 border-fg/[0.08]'
                          : order.status === 'PENDING'
                            ? 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                            : 'bg-fg/[0.04] text-neg border-fg/[0.08]'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-7 py-5 text-right flex items-center justify-end gap-2">
                       <WorkerStamp user={order.user} />
                       <SalesRowActions order={order} canEdit={canEdit} canRecordPayment={canRecordPayment} eggsPerCrate={eggsPerCrate} />
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-fg/70 font-medium tracking-normal">
                      No sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden p-3 space-y-3">
            {orders.map((order: SalesOrder, index: number) => (
              <div key={order.id} className="bg-fg/[0.04] rounded-md p-3 border border-fg/5 flex flex-col space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-fg font-medium text-sm tracking-normal tabular-nums">Order {index + 1}</span>
                   <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        order.status === 'COMPLETED' || order.status === 'PAID'
                          ? 'bg-fg/[0.04] text-emerald-400 border-fg/[0.08]'
                          : order.status === 'PENDING'
                            ? 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                            : 'bg-fg/[0.04] text-neg border-fg/[0.08]'
                      }`}>
                     {order.status}
                   </span>
                 </div>
                 <div className="flex flex-wrap gap-1">
                   {orderTypeLabels(order).map((label) => (
                     <span
                       key={label}
                       className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                         label === 'Eggs'
                           ? 'bg-fg/[0.04] text-yolk border-fg/[0.08]'
                           : label === 'Birds'
                             ? 'bg-fg/[0.06] text-fg-2 border-fg/[0.08]'
                             : 'bg-fg/10 text-fg/60 border-fg/10'
                       }`}
                     >
                       {label}
                     </span>
                   ))}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-fg/90 font-medium text-xs">{order.customer?.name || 'Walk-in Customer'}</span>
                    <span className="text-xs text-fg/70 font-medium mt-0.5">{order.customer?.phone || 'No Phone'}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t border-fg/5">
                    <span className="text-fg font-medium text-sm">{formatCurrency(Number(order.totalAmount))}</span>
                    <div className="flex items-center justify-end gap-2"><WorkerStamp user={order.user} /><SalesRowActions order={order} canEdit={canEdit} canRecordPayment={canRecordPayment} eggsPerCrate={eggsPerCrate} /></div>
                 </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="py-9 text-center text-fg/70 font-medium tracking-normal">
                No sales records found.
              </div>
            )}
          </div>
        </div>

        {/* Top Customers Widget */}
        <div className="space-y-5">
           <Card className="bg-tile border-fg/[0.08]">
              <CardHeader>
                <CardTitle className="text-fg">Sales velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                   <div className="h-12 w-12 rounded-md bg-fg/[0.04] flex items-center justify-center border border-fg/[0.08]">
                     <TrendingUp className="w-6 h-6 text-fg-3" />
                   </div>
                   <div>
                     <p className="text-2xl font-medium text-fg">{formatCurrency(avgDailyRevenue)}</p>
                     <p className="text-xs font-medium text-fg/70">Avg daily revenue</p>
                   </div>
                </div>
                <div className="h-2 w-full bg-fg/10 rounded-full overflow-hidden border border-fg/5">
                   <div className="h-full bg-emerald-500 w-[65%]" />
                </div>
                {monthOverMonthChange !== null ? (
                  <p className={`text-xs font-medium mt-2 flex items-center gap-2 ${
                    monthOverMonthChange >= 0 ? 'text-accent' : 'text-neg'
                  }`}>
                    {monthOverMonthChange >= 0 ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {monthOverMonthChange >= 0 ? '+' : ''}{monthOverMonthChange.toFixed(1)}% vs last month
                  </p>
                ) : (
                  <p className="text-xs font-medium text-fg/60 mt-2">
                    No prior month data
                  </p>
                )}
              </CardContent>
           </Card>

           <Card className="bg-fg/10 border-fg/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-fg/80">Top customers</CardTitle>
                <Users className="w-5 h-5 text-fg/20" />
              </CardHeader>
              <CardContent className="space-y-3">
                 {topCustomers.length === 0 ? (
                   <p className="text-xs text-fg/40 text-center py-4">No customer sales yet.</p>
                 ) : topCustomers.map((cust: Customer, idx: number) => (
                   <div key={cust.id} className="flex justify-between items-center gap-3 bg-fg/[0.04] p-2 rounded-md border border-fg/5">
                      <div className="flex items-center gap-2 min-w-0">
                         <div className="w-8 h-8 rounded-md bg-fg/10 flex items-center justify-center text-xs font-medium text-fg/70 border border-fg/10">
                           {idx + 1}
                         </div>
                         <span className="text-xs font-medium text-fg/90 truncate">{cust.name}</span>
                      </div>
                      <span className="text-xs font-medium text-fg tracking-normal shrink-0">{formatCurrency(customerRevenue[cust.id] ?? 0)}</span>
                   </div>
                 ))}
                 <Link href="/dashboard/sales/customers" className="block text-center w-full py-2 rounded-md bg-fg/10 border border-fg/10 text-xs font-medium text-fg/70 hover:bg-fg/20 hover:text-fg transition-colors mt-2">
                   View all CRM profiles
                 </Link>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
