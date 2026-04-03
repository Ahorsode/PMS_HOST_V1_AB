'use client';

import React, { useState } from 'react';
import { Bird, Activity, Info } from 'lucide-react';
import { FlockRowActions } from './FlockActions';
import { formatLivestockType } from '@/lib/utils/growth-utils';

interface LivestockTableProps {
  initialBatches: any[];
  houses: any[];
}

export function LivestockTable({ initialBatches, houses }: LivestockTableProps) {
  const [filter, setFilter] = useState<'ALL' | 'POULTRY' | 'CATTLE'>('ALL');

  const filteredBatches = initialBatches.filter((batch: any) => {
    if (filter === 'ALL') return true;
    if (!batch.type) return false;
    if (filter === 'POULTRY') return batch.type.startsWith('POULTRY');
    return batch.type === 'CATTLE';
  });

  const TabButton = ({ value, label, icon: Icon }: { value: any, label: string, icon: any }) => (
    <button
      onClick={() => setFilter(value)}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
        filter === value 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Species Filter Tabs */}
      <div className="flex gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <TabButton value="ALL" label="All Species" icon={Info} />
        <TabButton value="POULTRY" label="Poultry" icon={Bird} />
        <TabButton value="CATTLE" label="Cattle" icon={Activity} />
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Unit Name / Identity</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Type & Species</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Growth Benchmark</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Quantity</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Arrival Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {filteredBatches.map((batch: any) => (
              <tr key={batch.id} className="hover:bg-gray-50/80 transition-all group">
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm font-black text-emerald-700 uppercase tracking-tight">{batch.batchName || `Unit #${batch.id}`}</div>
                   <div className="text-[10px] text-gray-400 font-bold">ID: {batch.numericId || batch.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{formatLivestockType(batch.type)}</div>
                  <div className="text-xs text-gray-500 font-medium">{batch.breedType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-100 italic">
                    {batch.growthTargetOverride || batch.breedType || 'Standard'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                  {batch.currentCount?.toLocaleString() || '0'}
                  <span className="text-gray-400 font-normal text-xs ml-1">
                    {batch.type?.startsWith('POULTRY') ? 'birds' : 'head'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(batch.arrivalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm ${
                    batch.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-100' 
                      : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {batch.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <FlockRowActions batch={batch} houses={houses} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBatches.length === 0 && (
          <div className="py-24 text-center">
            <Bird className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold text-lg">No {filter !== 'ALL' ? filter.toLowerCase() : 'livestock'} units found.</p>
            <p className="text-gray-400 text-sm">Register a new livestock unit to start tracking performance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
