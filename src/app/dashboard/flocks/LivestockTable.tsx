'use client';

import React, { useState } from 'react';
import { Bird, Activity, Info, Zap, Waves, LayoutGrid } from 'lucide-react';
import { FlockRowActions } from './FlockActions';
import { formatLivestockType, getLivestockUnit } from '@/lib/utils/growth-utils';

interface LivestockTableProps {
  initialBatches: any[];
  houses: any[];
}

export function LivestockTable({ initialBatches, houses }: LivestockTableProps) {
  const [filter, setFilter] = useState<'ALL' | 'POULTRY' | 'CATTLE' | 'PIG' | 'SHEEP' | 'OTHER'>('ALL');

  const filteredBatches = initialBatches.filter((batch: any) => {
    if (filter === 'ALL') return true;
    if (!batch.type) return false;
    if (filter === 'POULTRY') return batch.type.startsWith('POULTRY');
    if (filter === 'CATTLE') return batch.type === 'CATTLE';
    if (filter === 'PIG') return batch.type === 'PIG';
    if (filter === 'SHEEP') return batch.type === 'SHEEP_GOAT';
    return batch.type === 'OTHER';
  });

  const TabButton = ({ value, label, icon: Icon }: { value: any, label: string, icon: any }) => (
    <button
      onClick={() => setFilter(value)}
      className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold transition-all ${
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
    <div className="space-y-5">
      {/* Species Filter Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-md border border-gray-100 shadow-sm w-fit">
        <TabButton value="ALL" label="All Species" icon={Info} />
        <TabButton value="POULTRY" label="Poultry" icon={Bird} />
        <TabButton value="CATTLE" label="Cattle" icon={Activity} />
        <TabButton value="PIG" label="Pigs" icon={Zap} />
        <TabButton value="SHEEP" label="Sheep" icon={Waves} />
        <TabButton value="OTHER" label="Others" icon={LayoutGrid} />
      </div>

      <div className="bg-white rounded-md shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-widest">Unit Name / Identity</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-widest">Type & Species</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-widest">Growth Benchmark</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-widest">Quantity</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-widest">Arrival Date</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-white/70 uppercase tracking-widest">Status</th>
              <th className="px-5 py-3 text-right text-xs font-bold text-white/70 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {filteredBatches.map((batch: any) => (
              <tr key={batch.id} className="hover:bg-gray-50/80 transition-all group">
                <td className="px-5 py-3 whitespace-nowrap">
                   <div className="text-sm font-bold text-emerald-400 uppercase tracking-normal">{batch.batchName || `Unit #${batch.id}`}</div>
                   <div className="text-xs text-gray-400 font-bold">ID: {batch.numericId || batch.id}</div>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{formatLivestockType(batch.type)}</div>
                  <div className="text-xs text-gray-500 font-medium">{batch.breedType}</div>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                  <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-widest border border-purple-100 italic">
                    {batch.growthTargetOverride || batch.breedType || 'Standard'}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-900 font-bold">
                  {batch.currentCount?.toLocaleString() || '0'}
                  <span className="text-gray-400 font-normal text-xs ml-1 lowercase">
                    {getLivestockUnit(batch.type)}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-500">
                  {new Date(batch.arrivalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm ${
                    batch.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-100' 
                      : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {batch.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-right">
                  <FlockRowActions batch={batch} houses={houses} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBatches.length === 0 && (
          <div className="py-20 text-center">
            <Bird className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-bold text-lg">No {filter !== 'ALL' ? filter.toLowerCase() : 'livestock'} units found.</p>
            <p className="text-gray-400 text-sm">Register a new livestock unit to start tracking performance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
