'use client'

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Skull, Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FlockForm } from '../flocks/FlockForm';

interface QuickMortalityLoggerProps {
  activeBatches: any[];
}

export function QuickMortalityLogger({ activeBatches }: QuickMortalityLoggerProps) {
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Skull className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight italic">Quick Mortality Logging</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeBatches.map((batch) => (
          <Card key={batch.id} className="group hover:border-red-500 transition-all border-dashed bg-red-50/10">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Active Batch</p>
                  <h4 className="font-bold text-gray-900">FLK-{batch.id.toString().padStart(3, '0')}</h4>
                </div>
                <button 
                  onClick={() => setSelectedBatch(batch)}
                  className="p-2 bg-red-600 text-white rounded-xl shadow-lg shadow-red-200 hover:scale-110 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-xs text-gray-500 font-medium">{batch.breedType}</p>
                <p className="text-sm font-black text-gray-900">{batch.currentCount.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">birds</span></p>
              </div>
            </CardContent>
          </Card>
        ))}
        {activeBatches.length === 0 && (
          <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 italic text-gray-400 text-sm">
            No active batches to log mortality for.
          </div>
        )}
      </div>

      <Dialog 
        isOpen={!!selectedBatch} 
        onOpenChange={(open) => !open && setSelectedBatch(null)} 
        title={`Log Mortality: FLK-${selectedBatch?.id.toString().padStart(3, '0')}`}
      >
        {selectedBatch && (
          <div className="p-2">
             <FlockForm 
               batch={selectedBatch} 
               houses={[]} // Not needed for mortality mode in FlockForm
               mode="mortality" 
               onClose={() => setSelectedBatch(null)} 
             />
          </div>
        )}
      </Dialog>
    </div>
  );
}
