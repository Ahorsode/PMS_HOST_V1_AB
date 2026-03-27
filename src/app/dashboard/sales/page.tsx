import React from 'react';
import { getAllSales } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Banknote, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { SaleActionsHeader, SaleRowActions } from './SaleActions';
import { formatDate, formatCurrency } from '@/lib/utils';

export default async function SalesPage() {
  const sales = await getAllSales();

  const totalRevenue = sales.reduce((acc: number, sale: any) => acc + Number(sale.totalAmount), 0);
  const totalOrders = sales.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight text-emerald-600">Sales Management</h2>
          <p className="text-gray-500 mt-1">Detailed transaction history, order tracking, and customer management.</p>
        </div>
        <SaleActionsHeader />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-none shadow-xl shadow-gray-200/50 bg-green-900 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Banknote className="w-24 h-24" />
          </div>
          <p className="text-green-300 text-sm font-bold uppercase tracking-widest mb-1">Total Revenue</p>
          <h3 className="text-4xl font-black">{formatCurrency(totalRevenue)}</h3>
          <p className="text-green-400 text-xs mt-4 flex items-center font-bold">
            <TrendingUp className="w-3 h-3 mr-1" /> +12% from last month
          </p>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl shadow-gray-200/50 bg-white p-6">
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">Total Orders</p>
          <h3 className="text-4xl font-black text-gray-900">{totalOrders}</h3>
          <p className="text-gray-500 text-xs mt-4 font-medium italic">Recent transactions shown below</p>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl shadow-gray-200/50 bg-amber-500 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShoppingBag className="w-24 h-24" />
          </div>
          <p className="text-amber-100 text-sm font-bold uppercase tracking-widest mb-1">Active Sales</p>
          <h3 className="text-4xl font-black">--</h3>
          <p className="text-amber-100 text-xs mt-4 font-medium italic">Awaiting fulfillment</p>
        </Card>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Recent Transactions</h3>
          <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-500 font-medium">Last 50 Records</span>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Items</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sales.map((sale: any) => (
              <tr key={sale.id} className="transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(sale.saleDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  ORD-{sale.id.toString().padStart(4, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                  {sale.customerName || <span className="text-gray-300 italic">Walk-in Customer</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex flex-wrap gap-1">
                    {sale.items?.slice(0, 2).map((item: any, i: number) => (
                      <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold">
                        {item.quantity}x {item.description}
                      </span>
                    ))}
                    {sale.items?.length > 2 && (
                      <span className="text-[10px] text-gray-400 font-bold">+{sale.items.length - 2} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-black italic text-lg">
                  {formatCurrency(sale.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <SaleRowActions sale={sale} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="py-32 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium italic">No sales records found. Start selling to see your revenue grow!</p>
          </div>
        )}
      </div>
    </div>
  );
}
