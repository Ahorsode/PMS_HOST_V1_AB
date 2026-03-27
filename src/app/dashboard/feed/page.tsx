import React from 'react';
import { getAllBatches, getAllInventory, getAllFeedingLogs } from '@/lib/actions/dashboard-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Wheat, History, Inbox, Scale } from 'lucide-react';
import { FeedActionsHeader, FeedLogActions, InventoryActions } from './FeedActions';
import { formatDate } from '@/lib/utils';

export default async function FeedPage() {
  const [batches, inventory, feedingLogs] = await Promise.all([
    getAllBatches(),
    getAllInventory(),
    getAllFeedingLogs()
  ]);

  const activeBatches = batches.filter((b: any) => b.status === 'active');

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Feed & Nutrition</h2>
          <p className="text-gray-500 mt-1">Manage Feed stocks and daily nutrition logs.</p>
        </div>
        <FeedActionsHeader batches={activeBatches} inventory={inventory} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-none shadow-xl shadow-gray-200/50">
            <CardHeader className="bg-gray-50/50 rounded-t-2xl border-b border-gray-100">
              <CardTitle className="flex items-center text-gray-800">
                <Wheat className="w-5 h-5 mr-3 text-amber-600" />
                Current Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inventory.map((item: any) => (
                  <div key={item.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-amber-100 hover:shadow-lg transition-all relative group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-900 text-lg">{item.itemName}</span>
                      {Number(item.stockLevel) <= (item.reorderLevel ?? 500) && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-red-200 animate-pulse shadow-sm shadow-red-100">Low Stock</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">{Number(item.stockLevel).toLocaleString()}</span>
                      <span className="text-sm text-gray-400 font-medium uppercase tracking-tight">{item.unit}</span>
                    </div>
                    <div className="mt-3 flex justify-between items-end">
                      <div className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded inline-block">
                        {item.category?.toUpperCase()}
                      </div>
                      <div className="opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                        <InventoryActions item={item} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {inventory.length === 0 && (
                <div className="py-12 text-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                  <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No inventory items found.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-bold text-gray-800 italic">Recent Feeding Logs</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Batch</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Feed Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feedingLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {formatDate(log.logDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      FLK-{log.batchId?.toString().padStart(3, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.inventory?.itemName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-700 font-bold text-lg italic">
                      {Number(log.amountConsumed).toLocaleString()} <span className="text-xs font-normal text-gray-400 ml-1">kg</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <FeedLogActions log={log} batches={activeBatches} inventory={inventory} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {feedingLogs.length === 0 && (
              <div className="py-20 text-center">
                <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium italic">No feeding logs recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-none shadow-xl shadow-gray-200/50 bg-green-950 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Scale className="w-32 h-32" />
            </div>
            <CardContent className="pt-8 pb-8 px-6 relative z-10">
              <h3 className="text-2xl font-black mb-2 tracking-tight">Nutrition Guide</h3>
              <p className="text-green-300 text-sm mb-8 leading-relaxed">
                Proper nutrition is key to flock health. Ensure you're following the recommended feed schedules for your breeds.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                  <span className="text-xs font-bold text-green-200">Layers</span>
                  <span className="text-xs font-medium">110g / bird / day</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                  <span className="text-xs font-bold text-green-200">Broilers</span>
                  <span className="text-xs font-medium">AD LIBITUM</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
