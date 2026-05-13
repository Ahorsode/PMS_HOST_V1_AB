'use client'

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Skull, Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { LivestockForm } from '../flocks/FlockForm';
import { getLivestockUnit, formatLivestockType } from '@/lib/utils/growth-utils';

interface QuickMortalityLoggerProps {
  activeBatches: any[];
}

export function QuickMortalityLogger({ activeBatches }: QuickMortalityLoggerProps) {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Skull className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-normal italic">Quick Mortality Logging</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {activeBatches.map((batch) => (
          <Card key={batch.id} className="group hover:border-red-500 transition-all border-dashed bg-red-50/10">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest leading-none mb-1">Active Unit</p>
                  <h4 className="font-bold text-gray-900">{batch.batchName || `UNT-${batch.id.toString().padStart(3, '0')}`}</h4>
                </div>
                <button 
                  onClick={() => setSelectedBatch(batch)}
                  className="p-2 bg-red-600 text-white rounded-md shadow-lg shadow-red-200 hover:scale-110 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-xs text-gray-500 font-medium">{formatLivestockType(batch.type)}</p>
                <p className="text-sm font-bold text-gray-900">
                  {batch.currentCount.toLocaleString()} 
                  <span className="text-xs text-gray-400 font-normal ml-1 lowercase">
                    {getLivestockUnit(batch.type)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {activeBatches.length === 0 && (
          <div className="col-span-full py-7 text-center bg-gray-50 rounded-md border-2 border-dashed border-gray-100 italic text-gray-400 text-sm">
            No active units to log mortality for.
          </div>
        )}
      </div>

      <Dialog 
        isOpen={!!selectedBatch} 
        onOpenChange={(open) => !open && setSelectedBatch(null)} 
        title={`Log Mortality: ${selectedBatch?.batchName || `UNT-${selectedBatch?.id.toString().padStart(3, '0')}`}`}
      >
        {selectedBatch && (
          <div className="p-2">
             <LivestockForm 
               batch={selectedBatch} 
               houses={[]} // Not needed for mortality mode in LivestockForm
               mode="mortality" 
               onClose={() => setSelectedBatch(null)} 
             />
          </div>
        )}
      </Dialog>
    </div>
  );
}
